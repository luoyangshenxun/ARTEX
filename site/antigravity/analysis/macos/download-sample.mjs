import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const url = 'https://storage.googleapis.com/antigravity-public/antigravity-hub/2.32.0-6141816156848128/darwin-arm/Antigravity.dmg';
const total = 241278833;
const chunkSize = 8 * 1024 * 1024;
const sample = path.join(root, 'installer/Antigravity-App-2.32.0-darwin-arm.parallel.dmg');
const parts = sample + '.parts';
fs.mkdirSync(parts, {recursive: true});
const chunks = Array.from({length: Math.ceil(total / chunkSize)}, (_, index) => ({
  index,
  start: index * chunkSize,
  end: Math.min(total - 1, (index + 1) * chunkSize - 1),
  file: path.join(parts, String(index).padStart(3, '0')),
}));
let next = 0;
async function worker() {
  for (;;) {
    const chunk = chunks[next++];
    if (!chunk) return;
    const length = chunk.end - chunk.start + 1;
    if (fs.existsSync(chunk.file) && fs.statSync(chunk.file).size === length) {
      console.log(`REUSE_PART=${chunk.index}`);
      continue;
    }
    await new Promise((resolve, reject) => {
      const child = spawn('curl.exe', [
        '--silent', '--show-error', '--location', '--fail', '--retry', '2',
        '--connect-timeout', '15', '--max-time', '180',
        '--range', `${chunk.start}-${chunk.end}`,
        '--dump-header', chunk.file + '.headers.txt', '--output', chunk.file, url,
      ], {windowsHide: true});
      let stderr = '';
      child.stderr.on('data', bytes => { stderr += bytes; });
      child.on('error', reject);
      child.on('exit', code => {
        fs.writeFileSync(chunk.file + '.stderr.txt', stderr);
        if (code !== 0) return reject(new Error(`part ${chunk.index} exit ${code}: ${stderr}`));
        if (fs.statSync(chunk.file).size !== length) return reject(new Error(`part ${chunk.index}: length mismatch`));
        const headers = fs.readFileSync(chunk.file + '.headers.txt', 'utf8');
        if (!headers.toLowerCase().includes(`content-range: bytes ${chunk.start}-${chunk.end}/${total}`)) {
          return reject(new Error(`part ${chunk.index}: Content-Range mismatch`));
        }
        console.log(`PART_COMPLETE=${chunk.index} BYTES=${length}`);
        resolve();
      });
    });
  }
}
await Promise.all(Array.from({length: 12}, worker));
const output = fs.openSync(sample, 'w');
const hash = createHash('sha256');
let crc = 0xffffffff;
for (const chunk of chunks) {
  const data = fs.readFileSync(chunk.file);
  fs.writeSync(output, data);
  hash.update(data);
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0x82f63b78 : 0);
  }
}
fs.closeSync(output);
const crcBytes = Buffer.alloc(4);
crcBytes.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
const crc32c = crcBytes.toString('base64');
if (crc32c !== '/QFW9w==') throw new Error(`GCS CRC32C mismatch: ${crc32c}`);
const provenance = {
  observedAt: new Date().toISOString(),
  product: 'Antigravity App', version: '2.32.0', platform: 'darwin-arm',
  releaseBuild: '6141816156848128',
  sourcePage: 'https://antigravity.google/download',
  url, sample, bytes: fs.statSync(sample).size, sha256: hash.digest('hex'),
  crc32c, expectedCrc32c: '/QFW9w==', verifiedGoogleStorageChecksum: true,
  officialClientExecuted: false,
};
fs.writeFileSync(path.join(here, 'download-provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify(provenance, null, 2));
