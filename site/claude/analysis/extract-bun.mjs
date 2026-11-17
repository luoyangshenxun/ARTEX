import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const selected = new Set(process.argv.slice(2));
const samples = JSON.parse(fs.readFileSync(path.join(dir, 'sample-provenance.json')));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const trailer = Buffer.from('\n---- Bun! ----\n');
const outRoot = path.join(dir, 'unpacked/embedded');
const manifestFile = path.join(dir, 'raw/embedded-modules.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile)) : [];

function parse(bytes) {
  let position = bytes.length;
  while ((position = bytes.lastIndexOf(trailer, position - 1)) !== -1) {
    if (position < 32) continue;
    const offsetsAt = position - 32;
    const byteCount = Number(bytes.readBigUInt64LE(offsetsAt));
    const base = offsetsAt - byteCount;
    const modulesOffset = bytes.readUInt32LE(offsetsAt + 8);
    const modulesLength = bytes.readUInt32LE(offsetsAt + 12);
    const entrypoint = bytes.readUInt32LE(offsetsAt + 16);
    if (!Number.isSafeInteger(base) || base < 0 || modulesLength === 0
      || modulesOffset + modulesLength > byteCount) continue;
    for (const recordSize of [52, 36, 44]) {
      if (modulesLength % recordSize !== 0 || entrypoint >= modulesLength / recordSize) continue;
      const modules = [];
      let valid = true;
      for (let index = 0; index < modulesLength / recordSize; index++) {
        const record = base + modulesOffset + index * recordSize;
        const nameOffset = bytes.readUInt32LE(record);
        const nameLength = bytes.readUInt32LE(record + 4);
        const contentsOffset = bytes.readUInt32LE(record + 8);
        const contentsLength = bytes.readUInt32LE(record + 12);
        if (!nameLength || nameLength > 16384 || nameOffset + nameLength > byteCount
          || contentsOffset + contentsLength > byteCount) { valid = false; break; }
        const name = bytes.subarray(base + nameOffset, base + nameOffset + nameLength)
          .toString('utf8').replace(/\0$/, '');
        if (!/^[\x20-\x7e]+$/.test(name)) { valid = false; break; }
        const tagOffset = record + recordSize - 4;
        const encoding = bytes[tagOffset];
        const loader = bytes[tagOffset + 1];
        const moduleFormat = bytes[tagOffset + 2];
        if (encoding > 2) { valid = false; break; }
        modules.push({index, modulePath: name, recordOffset: record, nameOffset: base + nameOffset,
          contentsOffset: base + contentsOffset, contentsLength, encoding, loader, moduleFormat});
      }
      if (valid && modules.some(module => /bunfs|\.c?js$|\.mjs$/.test(module.modulePath)))
        return {base, byteCount, offsetsAt, trailerOffset: position, modulesOffset,
          modulesLength, recordSize, entrypoint, modules};
    }
  }
  throw new Error('No validated Bun module graph; use inspect-native.mjs byte-offset fallback.');
}

for (const sample of samples.filter(sample => sample.binary && (!selected.size || selected.has(sample.id)))) {
  const bytes = fs.readFileSync(path.join(dir, sample.binary));
  assert.equal(sha256(bytes), sample.binarySha256);
  const graph = parse(bytes);
  const out = path.join(outRoot, sample.id);
  fs.mkdirSync(out, {recursive: true});
  for (const module of graph.modules) {
    const contents = bytes.subarray(module.contentsOffset, module.contentsOffset + module.contentsLength);
    const output = path.join(out, `module-${module.index.toString().padStart(4, '0')}.source`);
    fs.writeFileSync(output, contents);
    module.extractedPath = path.relative(dir, output).replaceAll('\\', '/');
    module.sha256 = sha256(contents);
    module.textEncoding = module.encoding === 2 ? 'utf16le' : 'latin1';
  }
  const result = {sample: sample.id, version: sample.version, binary: sample.binary,
    binarySha256: sample.binarySha256, ...graph};
  const index = manifest.findIndex(item => item.sample === sample.id);
  if (index < 0) manifest.push(result); else manifest[index] = result;
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({sample: sample.id, base: graph.base, recordSize: graph.recordSize,
    modules: graph.modules.length, entrypoint: graph.entrypoint,
    main: graph.modules[graph.entrypoint].modulePath,
    sourceBytes: graph.modules[graph.entrypoint].contentsLength}));
}
