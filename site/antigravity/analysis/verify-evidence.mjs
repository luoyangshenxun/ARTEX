import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(dir, 'unpacked', '{code_GetDestDir}', 'resources', 'app');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const original = path.resolve(dir, '..', 'installer', 'Antigravity-IDE-2.7.0-windows-x64.exe');
const originalHash = sha(fs.readFileSync(original));
assert.equal(originalHash, '307c7a41b050ffe742fd4dd1045050df1464de219271f74b5f6c269e9e00c822');
console.log(`ORIGINAL_UNCHANGED SHA256=${originalHash}`);

const entries = JSON.parse(fs.readFileSync(path.join(dir, 'focused-evidence.json')));
for (const entry of entries) {
  const bytes = fs.readFileSync(path.join(dir, entry.file));
  assert.equal(sha(bytes), entry.sourceSha256, `${entry.id}: source hash`);
  assert.equal(bytes.length, entry.sourceBytes, `${entry.id}: source length`);
  let excerpt = bytes.subarray(entry.startByte, entry.endByteExclusive).toString('utf8');
  excerpt = excerpt.replace(/GOCSPX-[A-Za-z0-9_-]+/g, value => `<CLIENT_SECRET_SHA256:${sha(value)}>`);
  assert.equal(excerpt, entry.excerpt, `${entry.id}: exact excerpt`);
}
console.log(`FOCUSED_EXCERPTS_VERIFIED=${entries.length}`);

const require = createRequire(path.join(app, 'package.json'));
const {fromBinary} = require('@bufbuild/protobuf');
const {FileDescriptorProtoSchema} = require('@bufbuild/protobuf/wkt');
const descriptors = JSON.parse(fs.readFileSync(path.join(dir, 'protobuf-descriptors.json')));
function compare(manual, parsed) {
  assert.equal(manual.length, parsed.length);
  for (let i = 0; i < manual.length; i++) {
    assert.equal(manual[i].name, parsed[i].name);
    assert.deepEqual(manual[i].fields.map(f => [f.name, f.number, f.type]),
      parsed[i].field.map(f => [f.name, f.number, f.type]));
    compare(manual[i].nested, parsed[i].nestedType);
  }
}
let count = 0;
for (const source of ['out/main.js', 'extensions/agy/vscode/extension.js']) {
  const code = fs.readFileSync(path.join(app, source), 'utf8');
  for (const match of code.matchAll(/(?:Ra|Ss)\("([A-Za-z0-9+/=]{24,})"/g)) {
    const parsed = fromBinary(FileDescriptorProtoSchema, Buffer.from(match[1], 'base64'));
    if (!parsed.name.endsWith('.proto')) continue;
    const offset = Buffer.byteLength(code.slice(0, match.index));
    const manual = descriptors.find(d => d.source === source && d.byteOffset === offset);
    assert.ok(manual, `${source}@${offset}`);
    assert.equal(manual.name, parsed.name);
    assert.equal(manual.package, parsed.package);
    compare(manual.messages, parsed.messageType);
    count++;
  }
}
assert.equal(count, descriptors.length);
console.log(`DESCRIPTORS_CROSS_CHECKED_WITH_BUFLIB=${count}`);

const terms = ['antigravity/hub/', 'streamGenerateContent', 'You are Antigravity', 'TOS_VIOLATION'];
for (const source of ['out/main.js', 'extensions/agy/vscode/extension.js']) {
  const code = fs.readFileSync(path.join(app, source), 'utf8');
  for (const term of terms) console.log(`EXACT_LITERAL_COUNT ${source} ${JSON.stringify(term)}=${code.split(term).length - 1}`);
}
const reports = ['antigravity-real-fingerprint.md', 'version-changelist-rules.md',
  'subway-fingerprint-diff.md', 'version-sources.md'];
for (const report of reports) {
  const full = path.join(dir, report);
  const bytes = fs.readFileSync(full);
  new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  assert.ok(bytes.length > 1000);
  console.log(`REPORT_REOPENED ${full} bytes=${bytes.length} SHA256=${sha(bytes)}`);
}
const offline = JSON.parse(fs.readFileSync(path.join(dir, 'offline-header-verification.json')));
assert.equal(offline.exitStatus, 0);
assert.equal(offline.networkRequests, 0);
assert.equal(offline.officialClientExecuted, false);
console.log('EVIDENCE_VERIFICATION=PASS');
