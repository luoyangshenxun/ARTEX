import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
export const sampleRoot = path.resolve(here, '../unpacked/macos-app-2.32.0-verified');
export const nativePath = path.join(sampleRoot, 'Antigravity.app/Contents/Resources/bin/language_server');
export const bytes = fs.readFileSync(nativePath);
const sha256 = b => createHash('sha256').update(b).digest('hex');
assert.equal(bytes.readUInt32LE(0), 0xfeedfacf);
export const sections = [];
for (let index = 0, offset = 32; index < bytes.readUInt32LE(16); index++) {
  const command = bytes.readUInt32LE(offset), length = bytes.readUInt32LE(offset + 4);
  if (command === 0x19) {
    for (let j = 0, s = offset + 72; j < bytes.readUInt32LE(offset + 64); j++, s += 80) {
      sections.push({
        name: bytes.subarray(s, s + 16).toString().split('\0')[0],
        address: Number(bytes.readBigUInt64LE(s + 32)),
        bytes: Number(bytes.readBigUInt64LE(s + 40)), offset: bytes.readUInt32LE(s + 48),
      });
    }
  }
  offset += length;
}
export function fileOffset(address) {
  const section = sections.find(s => s.offset && address >= s.address && address < s.address + s.bytes);
  return section ? section.offset + address - section.address : null;
}
export function goString(address) {
  const offset = fileOffset(address);
  if (offset === null) return {address: `0x${address.toString(16)}`, initializedInFile: false};
  const pointer = Number(bytes.readBigUInt64LE(offset));
  const length = Number(bytes.readBigUInt64LE(offset + 8));
  const dataOffset = fileOffset(pointer);
  assert.ok(dataOffset !== null && length >= 0 && length < 10000);
  return {address: `0x${address.toString(16)}`, offset, pointer: `0x${pointer.toString(16)}`,
    length, dataOffset, value: bytes.subarray(dataOffset, dataOffset + length).toString()};
}
const pcln = sections.find(s => s.name === '__lrodata_gopcln');
assert.ok(pcln);
const base = pcln.offset, u64 = n => Number(bytes.readBigUInt64LE(base + n));
assert.equal(bytes.readUInt32LE(base), 0xfffffff1);
const text = sections.find(s => s.name === '__text');
const textBase = u64(24) || text.address;
const nameTable = base + u64(32), functionTable = base + u64(64);
export const functions = [];
for (let index = 0; index < u64(8); index++) {
  const entry = functionTable + index * 8;
  const entryOffset = bytes.readUInt32LE(entry), functionOffset = functionTable + bytes.readUInt32LE(entry + 4);
  const nameOffset = nameTable + bytes.readUInt32LE(functionOffset + 4);
  functions.push({
    name: bytes.subarray(nameOffset, bytes.indexOf(0, nameOffset)).toString(),
    address: textBase + entryOffset,
    offset: fileOffset(textBase + entryOffset),
    size: bytes.readUInt32LE(entry + 8) - entryOffset,
  });
}
const selected = functions.filter(f => /code_assist_client\/codeassistclient\.|auth_client\/authclient\.|metadata_provider\.|stamp/.test(f.name));
const targets = new Map([
  [0x10c15e180, 'fallback_changelist_string'],
  [0x10c2b09b8, 'numeric_changelist_override'],
  [0x10c266c80, 'user_agent_name_override'],
  [0x10c266c90, 'subclient_type_override'],
  [0x10c266ca0, 'host_path_override'],
  [0x10c266cb0, 'proxy_client_override'],
]);
const references = [];
let functionIndex = 0;
for (let offset = text.offset; offset < text.offset + text.bytes; offset += 4) {
  const word = bytes.readUInt32LE(offset);
  if (((word & 0x9f000000) >>> 0) !== 0x90000000) continue;
  let immediate = ((word >>> 29) & 3) | (((word >>> 5) & 0x7ffff) << 2);
  if (immediate & (1 << 20)) immediate -= 1 << 21;
  const pc = text.address + offset - text.offset;
  const page = Math.floor(pc / 4096) * 4096 + immediate * 4096;
  const reg = word & 31;
  for (let next = offset + 4; next <= offset + 8; next += 4) {
    const instruction = bytes.readUInt32LE(next);
    if (((instruction >>> 5) & 31) !== reg) continue;
    let address;
    if (((instruction & 0x7f000000) >>> 0) === 0x11000000) {
      address = page + ((instruction >>> 10) & 4095) * ((instruction & (1 << 22)) ? 4096 : 1);
    } else if (((instruction & 0xffc00000) >>> 0) === 0xf9400000) {
      address = page + ((instruction >>> 10) & 4095) * 8;
    }
    if (targets.has(address)) {
      while (functionIndex + 1 < functions.length && functions[functionIndex + 1].address <= pc) functionIndex++;
      references.push({field: targets.get(address), target: `0x${address.toString(16)}`,
        instructionOffset: offset, instructionAddress: `0x${pc.toString(16)}`, function: functions[functionIndex].name});
    }
  }
}
const literals = [
  ['uaFormatHub', 54040262, 13], ['uaFormatNoSubclient', 53737898, 10],
  ['uaCommentSeparator', 53254340, 2], ['uaOSFormat', 53737878, 10],
  ['uaArchFormat', 53454829, 7], ['uaCLFormat', 53330154, 5],
  ['uaAuthMethodFormat', 54131665, 14], ['uaPurposeFormat', 53737888, 10],
  ['uaFirstComment', 53943759, 12], ['uaDataCollectionOptOut', 55008691, 27],
  ['uaHostPath', 53943771, 12], ['uaProxyClient', 54214578, 15],
].map(([id, offset, length]) => ({id, offset, length, value: bytes.subarray(offset, offset + length).toString()}));
const result = {nativePath, bytes: bytes.length, sha256: sha256(bytes), architecture: 'Mach-O ARM64',
  pclntabFunctions: functions.length, textBase: `0x${textBase.toString(16)}`,
  sections, fallbackChangelist: goString(0x10c15e180),
  globals: [...targets].map(([address, field]) => ({field, address: `0x${address.toString(16)}`,
    initializedInFile: fileOffset(address) !== null})), literals, references};
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(here, 'native-evidence.json'), JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(path.join(here, 'native-functions.json'), JSON.stringify(selected, null, 2) + '\n');
  console.log(`NATIVE_SHA256=${result.sha256}`);
  console.log(`PCLNTAB_FUNCTIONS=${functions.length}`);
  console.log(`FALLBACK_CL=${result.fallbackChangelist.value}`);
  console.log(JSON.stringify(literals));
  console.log(JSON.stringify(references.filter(r => !r.function.includes('userAgent'))));
}
