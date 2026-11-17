import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const samples = JSON.parse(fs.readFileSync(path.join(dir, 'sample-provenance.json')));
const terms = ['---- Bun! ----', '__BUN', '/$bunfs/root/', 'Bun v', 'x-stainless-helper-method',
  'X-Stainless-OS', 'x-stainless-os', 'getPlatformProperties', 'x-anthropic-billing-header',
  'cc_entrypoint', 'claude-cli/', '2.1.325', '0.128.0'];
const observations = [];
for (const sample of samples.filter(sample => sample.binary)) {
  const bytes = fs.readFileSync(path.join(dir, sample.binary));
  const hits = [];
  for (const term of terms) {
    let offset = 0, count = 0;
    while ((offset = bytes.indexOf(term, offset)) !== -1) {
      count++;
      if (count <= 8) hits.push({term, offset, excerpt: bytes.subarray(Math.max(0, offset - 100), offset + term.length + 220).toString('utf8')});
      offset += term.length;
    }
    hits.push({term, count});
  }
  observations.push({sample: sample.id, binary: sample.binary,
    bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), hits});
}
const output = path.join(dir, 'raw/native-inspection.json');
fs.writeFileSync(output, JSON.stringify(observations, null, 2) + '\n');
for (const result of observations) console.log(JSON.stringify({
  sample: result.sample, bytes: result.bytes,
  hits: result.hits.filter(hit => hit.count !== undefined),
}));
