import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
const packages = args.length?args:['acorn@8.15.0','@oven/bun-windows-x64@1.4.4',
  '@oven/bun-windows-x64@1.4.3','@oven/bun-windows-x64@1.4.1'];
const root = path.join(dir, 'tools');
fs.mkdirSync(root, {recursive: true});
const records = [];
for (const spec of packages) {
  const at = spec.lastIndexOf('@');
  const name = spec.slice(0, at), version = spec.slice(at + 1);
  if (!name || !version) throw new Error('Use exact package@version');
  const response = await fetch(`https://registry.npmjs.org/${name}/${version}`);
  if (!response.ok) throw new Error(`${spec}: HTTP ${response.status}`);
  const meta = await response.json();
  const archiveResponse = await fetch(meta.dist.tarball);
  if (!archiveResponse.ok) throw new Error(`tarball: HTTP ${archiveResponse.status}`);
  const bytes = Buffer.from(await archiveResponse.arrayBuffer());
  const [algorithm, expected] = meta.dist.integrity.split('-');
  if (crypto.createHash(algorithm).update(bytes).digest('base64') !== expected)
    throw new Error('integrity mismatch');
  const destination = path.join(root, name.replaceAll('/', '_').replace('@', '') + '-' + version);
  fs.mkdirSync(destination, {recursive: true});
  const archive = path.join(destination, 'package.tgz');
  fs.writeFileSync(archive, bytes);
  const result = spawnSync('tar', ['-xf', archive, '-C', destination], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr);
  const record = {name, version, tarball: meta.dist.tarball, integrity: meta.dist.integrity,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    destination: path.relative(dir, destination).replaceAll('\\', '/')};
  records.push(record);
  console.log(JSON.stringify(record));
}
const output = path.join(dir, 'tool-provenance.json');
const previous = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output)) : [];
for (const record of records) {
  const index = previous.findIndex(item => item.name === record.name && item.version === record.version);
  if (index < 0) previous.push(record); else previous[index] = record;
}
fs.writeFileSync(output, JSON.stringify(previous, null, 2) + '\n');
