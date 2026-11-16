import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(dir, 'unpacked', '{code_GetDestDir}', 'resources', 'app');
const sources = ['out/main.js', 'extensions/agy/vscode/extension.js'];
function decode(bytes) {
  const fields = [];
  let pos = 0;
  function varint() {
    let n = 0n, shift = 0n;
    do {
      if (pos >= bytes.length || shift > 70n) throw Error('Invalid protobuf varint');
      const byte = bytes[pos++];
      n |= BigInt(byte & 127) << shift;
      if (byte < 128) return Number(n);
      shift += 7n;
    } while (true);
  }
  while (pos < bytes.length) {
    const tag = varint(), number = Math.floor(tag / 8), wire = tag & 7;
    let value;
    if (wire === 0) value = varint();
    else if (wire === 2) {
      const length = varint();
      value = bytes.subarray(pos, pos + length);
      pos += length;
    } else if (wire === 1 || wire === 5) {
      const length = wire === 1 ? 8 : 4;
      value = bytes.subarray(pos, pos + length);
      pos += length;
    } else throw Error(`Unsupported protobuf wire type ${wire}`);
    if (pos > bytes.length || number === 0) throw Error('Invalid protobuf field');
    fields.push({number, value});
  }
  return fields;
}
const all = (fields, number) => fields.filter(f => f.number === number).map(f => f.value);
const one = (fields, number) => all(fields, number)[0];
const text = (fields, number) => one(fields, number)?.toString('utf8');
function enumeration(bytes) {
  const f = decode(bytes);
  return {name: text(f, 1), values: all(f, 2).map(b => {
    const v = decode(b);
    return {name: text(v, 1), number: one(v, 2)};
  })};
}
function message(bytes) {
  const f = decode(bytes);
  return {
    name: text(f, 1),
    fields: all(f, 2).map(b => {
      const v = decode(b);
      return {
        name: text(v, 1), number: one(v, 3), label: one(v, 4),
        type: one(v, 5), typeName: text(v, 6), defaultValue: text(v, 7),
        jsonName: text(v, 10), proto3Optional: one(v, 17),
      };
    }),
    nested: all(f, 3).map(message),
    enums: all(f, 4).map(enumeration),
  };
}
const descriptors = [];
for (const source of sources) {
  const code = fs.readFileSync(path.join(app, source), 'utf8');
  const pattern = /(?:Ra|Ss)\("([A-Za-z0-9+/=]{24,})"/g;
  for (const match of code.matchAll(pattern)) {
    try {
      const bytes = Buffer.from(match[1], 'base64'), f = decode(bytes);
      const name = text(f, 1);
      if (!name?.endsWith('.proto')) continue;
      descriptors.push({
        source, byteOffset: Buffer.byteLength(code.slice(0, match.index)),
        name, package: text(f, 2), syntax: text(f, 12),
        messages: all(f, 4).map(message), enums: all(f, 5).map(enumeration),
        services: all(f, 6).map(b => {
          const s = decode(b);
          return {name: text(s, 1), methods: all(s, 2).map(m => {
            const method = decode(m);
            return {name: text(method, 1), input: text(method, 2), output: text(method, 3),
              clientStreaming: one(method, 5), serverStreaming: one(method, 6)};
          })};
        }),
      });
    } catch (error) {
      console.error(`${source}@${match.index}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
fs.writeFileSync(path.join(dir, 'protobuf-descriptors.json'), JSON.stringify(descriptors, null, 2) + '\n');
console.log(`Decoded ${descriptors.length} descriptors.`);
for (const d of descriptors.filter(x => /onboarding|backend|language_server|gemini|chat|antigravity/.test(x.name))) {
  console.log(`${d.source}: ${d.name} (${d.messages.length} messages; ${d.services.length} services)`);
}
