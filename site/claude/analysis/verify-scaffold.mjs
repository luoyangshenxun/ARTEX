import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const required = [
  'analysis-manifest.json',
  'report_overview.md',
  'claude-real-fingerprint.md',
  'fingerprint-domain-rules.md',
  'beta-matrix.md',
  'billing-fields.md',
  'oauth-auth.md',
  'tls-features.md',
  'subway-diff.md',
  'scan-static.mjs',
];
const requiredMarkers = new Map([
  ['claude-real-fingerprint.md', ['来源（文件:函数）', '取值域', '证据级别']],
  ['fingerprint-domain-rules.md', ['来源（文件:函数）', '取值域', '证据级别']],
  ['beta-matrix.md', ['来源/定位', '证据级别']],
  ['billing-fields.md', ['来源（文件:函数）', '算法', '证据级别']],
  ['oauth-auth.md', ['来源（文件:函数）', '证据级别']],
  ['tls-features.md', ['来源（文件:函数）', '证据级别']],
  ['subway-diff.md', ['官方来源（文件:函数）', '证据级别']],
]);

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'analysis-manifest.json'), 'utf8'));
if (manifest.status !== 'scaffold') throw new Error('manifest status must remain scaffold');

for (const name of required) {
  const full = path.join(dir, name);
  if (!fs.existsSync(full)) throw new Error(`missing ${full}`);
  const bytes = fs.readFileSync(full);
  if (bytes.length === 0) throw new Error(`empty ${full}`);
  new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  console.log(`REOPENED ${full} bytes=${bytes.length} SHA256=${sha256(bytes)}`);
}

const tabularReports = [
  'claude-real-fingerprint.md',
  'fingerprint-domain-rules.md',
  'beta-matrix.md',
  'billing-fields.md',
  'oauth-auth.md',
  'tls-features.md',
  'subway-diff.md',
];
for (const name of tabularReports) {
  const text = fs.readFileSync(path.join(dir, name), 'utf8');
  for (const marker of requiredMarkers.get(name)) {
    if (!text.includes(marker)) throw new Error(`${name} missing marker ${marker}`);
  }
}

console.log(`SCAFFOLD_VERIFICATION=PASS files=${required.length}`);
