import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {bytes, nativePath, sampleRoot} from './inspect-native.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(sampleRoot, 'asar/package.json'));
const {fromBinary} = require('@bufbuild/protobuf');
const {FileDescriptorProtoSchema} = require('@bufbuild/protobuf/wkt');
function wireFields(buffer) {
  let offset = 0;
  const fields = [];
  function varint() {
    let value = 0n, shift = 0n, byte;
    do {
      assert.ok(offset < buffer.length && shift < 70n);
      byte = buffer[offset++];
      value |= BigInt(byte & 127) << shift;
      shift += 7n;
    } while (byte & 128);
    return Number(value);
  }
  while (offset < buffer.length) {
    const start = offset, key = varint(), number = Math.floor(key / 8), wire = key & 7;
    assert.ok(number > 0);
    let value, data;
    if (wire === 0) value = varint();
    else if (wire === 2) {
      const length = varint();
      assert.ok(length >= 0 && offset + length <= buffer.length);
      data = buffer.subarray(offset, offset + length); offset += length;
    } else if (wire === 1) offset += 8;
    else if (wire === 5) offset += 4;
    else throw new Error(`Unsupported wire ${wire}`);
    fields.push({number, wire, value, data, start, end: offset});
  }
  return fields;
}
function descriptorEnd(start) {
  let offset = start, first = true;
  const read = () => {
    let n = 0, shift = 0, c;
    do { c = bytes[offset++]; n += (c & 127) * 2 ** shift; shift += 7; assert.ok(shift < 56); } while (c & 128);
    return n;
  };
  while (offset < start + 1024 * 1024) {
    const at = offset, key = read(), number = Math.floor(key / 8), wire = key & 7;
    if ((!first && number === 1) || number < 1 || number > 15) return at;
    first = false;
    if (wire === 0) read();
    else if (wire === 2) { const length = read(); offset += length; }
    else return at;
  }
  throw new Error('Descriptor end not found');
}
function message(m) {
  return {
    name: m.name,
    fields: m.field.map(f => ({number: f.number, name: f.name, jsonName: f.jsonName,
      type: f.type, ...(f.typeName ? {typeName: f.typeName} : {}),
      label: f.label, ...(f.proto3Optional ? {proto3Optional: true} : {})})),
    enums: m.enumType.map(e => ({name: e.name, values: e.value.map(v => ({name: v.name, number: v.number}))})),
    nested: m.nestedType.map(message),
  };
}
const schemas = [];
const text = bytes.toString('latin1');
for (const match of text.matchAll(/google\/internal\/cloud\/code\/v1internal\/[a-z_]+\.proto/g)) {
  const start = match.index - 2;
  if (bytes[start] !== 10 || bytes[start + 1] !== match[0].length) continue;
  const end = descriptorEnd(start), raw = bytes.subarray(start, end);
  const top = wireFields(raw);
  let decoded;
  try {
    decoded = fromBinary(FileDescriptorProtoSchema, raw);
  } catch (error) {
    console.log(`REJECT_NON_DESCRIPTOR ${match[0]} offset=${start}: ${error.message}`);
    continue;
  }
  assert.equal(decoded.name, match[0]);
  const methods = [];
  for (const service of top.filter(f => f.number === 6)) {
    const svc = wireFields(service.data);
    for (const method of svc.filter(f => f.number === 2)) {
      const mf = wireFields(method.data), name = mf.find(f => f.number === 1).data.toString();
      const option = mf.find(f => f.number === 4);
      if (!option) continue;
      const rule = wireFields(option.data).find(f => f.number === 72295728);
      if (rule) {
        const http = wireFields(rule.data);
        methods.push({name, bindings: http.filter(f => [2,3,4,5,6,7,12].includes(f.number))
          .map(f => ({field: f.number, value: f.data.toString()}))});
      }
    }
  }
  schemas.push({file: decoded.name, package: decoded.package, nativePath, offset: start, bytes: raw.length,
    sha256: createHash('sha256').update(raw).digest('hex'), syntax: decoded.syntax,
    messages: decoded.messageType.map(message), methods});
}
assert.ok(schemas.some(s => s.file.endsWith('/onboarding.proto')));
assert.ok(schemas.some(s => s.file.endsWith('/prediction_service.proto')));
fs.writeFileSync(path.join(here, 'request-schemas.json'), JSON.stringify(schemas, null, 2) + '\n');
for (const s of schemas) {
  console.log(`DESCRIPTOR ${s.file} offset=${s.offset} bytes=${s.bytes}`);
  for (const m of s.messages.filter(m => /ClientMetadata|LoadCodeAssistRequest|OnboardUserRequest|GenerateContentRequest|FetchAvailableModelsRequest/.test(m.name))) {
    console.log(JSON.stringify(m));
  }
}
console.log(`NATIVE_DESCRIPTORS_DECODED_WITH_BUFLIB=${schemas.length}`);
