import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const analysisDir = path.dirname(fileURLToPath(import.meta.url));
const {values} = parseArgs({
  options: {
    'cli-root': {type: 'string'},
    'sdk-root': {type: 'string'},
    output: {type: 'string'},
  },
});
const defaultRoots = [
  ['claude-code', values['cli-root'] ?? process.env.CLAUDE_CODE_ROOT
    ?? path.join(analysisDir, 'unpacked', 'npm', 'claude-code')],
  ['sdk', values['sdk-root'] ?? process.env.ANTHROPIC_SDK_ROOT
    ?? path.join(analysisDir, 'unpacked', 'npm', 'sdk')],
];
const roots = defaultRoots.map(([label, defaultRoot]) => ({
  label,
  root: path.resolve(defaultRoot),
}));
const output = values.output ? path.resolve(values.output) : path.join(analysisDir, 'static-evidence.json');
const extensions = /\.(?:[cm]?js|json|ts|d\.ts|map|md|txt)$/i;
const terms = [
  'X-Stainless-',
  'X-Stainless-OS',
  'X-Stainless-Arch',
  'X-Stainless-Runtime',
  'X-Stainless-Runtime-Version',
  'X-Stainless-Package-Version',
  'anthropic-beta',
  'anthropic-version',
  'user-agent',
  'userAgent',
  'process.platform',
  'process.arch',
  'process.version',
  'authorization',
  'x-api-key',
  'metadata',
  'billing',
  'client_id',
  'clientId',
  'scope',
  'scopes',
  'code_challenge',
  'code_verifier',
  'oauth',
  'undici',
  'fetch',
  'system',
  'prompt',
];

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const files = [];
const missingRoots = [];

function walk(root, label) {
  if (!fs.existsSync(root)) {
    missingRoots.push({label, root});
    return;
  }
  for (const entry of fs.readdirSync(root, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!['.cache', '.git'].includes(entry.name)) walk(full, label);
    } else if (extensions.test(entry.name)) {
      files.push({full, label});
    }
  }
}

for (const item of roots) walk(item.root, item.label);

const evidence = [];
for (const {full, label} of files) {
  const bytes = fs.readFileSync(full);
  const text = bytes.toString('utf8');
  const hits = [];
  for (const term of terms) {
    let count = 0;
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      count++;
      if (count <= 25) {
        const before = text.slice(0, start);
        hits.push({
          term,
          matchedText: match[0],
          charOffset: start,
          byteOffset: Buffer.byteLength(before),
          line: before.split('\n').length,
          context: text.slice(Math.max(0, start - 280), start + term.length + 520),
        });
      }
    }
    if (count > 25) hits.push({term, totalMatches: count, sampled: 25});
  }
  if (hits.length) {
    evidence.push({
      package: label,
      file: path.relative(analysisDir, full).replaceAll('\\', '/'),
      bytes: bytes.length,
      sha256: sha256(bytes),
      hits,
    });
  }
}

const result = {
  status: missingRoots.length ? 'missing-inputs' : 'scanned',
  generatedAt: new Date().toISOString(),
  scope: roots,
  scannedFiles: files.length,
  missingRoots,
  terms,
  evidence,
};
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  status: result.status,
  output,
  scannedFiles: files.length,
  matchedFiles: evidence.length,
  missingRoots,
}));
if (missingRoots.length) process.exitCode = 2;
