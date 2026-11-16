import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const [input, output] = process.argv.slice(2);
assert.ok(input && output, 'Usage: node extract-asar.mjs INPUT.asar OUTPUT_DIRECTORY');
const source = path.resolve(input);
const destination = path.resolve(output);
assert.ok(!fs.existsSync(destination), 'Output directory must be new');
const fd = fs.openSync(source, 'r');
const prefix = Buffer.alloc(16);
fs.readSync(fd, prefix, 0, prefix.length, 0);
assert.equal(prefix.readUInt32LE(0), 4, 'ASAR size pickle');
const headerSize = prefix.readUInt32LE(4);
const jsonSize = prefix.readUInt32LE(12);
assert.ok(jsonSize > 0 && jsonSize <= headerSize && headerSize < 128 * 1024 * 1024);
const json = Buffer.alloc(jsonSize);
fs.readSync(fd, json, 0, jsonSize, 16);
const header = JSON.parse(json.toString('utf8'));
const dataStart = 8 + headerSize;
const sourceSize = fs.fstatSync(fd).size;
const entries = [];
fs.mkdirSync(destination, {recursive: true});
function walk(files, relative = '') {
  for (const [name, entry] of Object.entries(files)) {
    const file = path.join(relative, name);
    const target = path.resolve(destination, file);
    assert.ok(target.startsWith(destination + path.sep), `Unsafe archive path: ${file}`);
    if (entry.files) {
      fs.mkdirSync(target, {recursive: true});
      walk(entry.files, file);
    } else if (entry.link || entry.unpacked) {
      entries.push({file, skipped: entry.link ? 'symlink' : 'external unpacked', ...entry});
    } else {
      const offset = dataStart + Number(entry.offset);
      assert.ok(Number.isSafeInteger(entry.size) && entry.size >= 0);
      assert.ok(offset >= dataStart && offset + entry.size <= sourceSize);
      const bytes = Buffer.alloc(entry.size);
      assert.equal(fs.readSync(fd, bytes, 0, bytes.length, offset), bytes.length);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.writeFileSync(target, bytes, {flag: 'wx'});
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (entry.integrity?.algorithm === 'SHA256') {
        assert.equal(sha256, entry.integrity.hash, `ASAR integrity: ${file}`);
      }
      entries.push({file: file.replaceAll('\\', '/'), bytes: bytes.length, sha256});
    }
  }
}
walk(header.files);
fs.closeSync(fd);
fs.writeFileSync(destination + '.manifest.json', JSON.stringify({source, sourceSize, dataStart, entries}, null, 2) + '\n');
console.log(`ASAR_SOURCE=${source}`);
console.log(`ASAR_OUTPUT=${destination}`);
console.log(`ENTRIES=${entries.length} EXTRACTED=${entries.filter(e => !e.skipped).length}`);
console.log('ASAR_EMBEDDED_SHA256=VERIFIED_WHERE_PRESENT');
