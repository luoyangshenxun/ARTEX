import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const requested = process.argv.slice(2);
const recorded=requested[0]==='--recorded'?
  JSON.parse(fs.readFileSync(path.join(dir,'sample-provenance.json')))
    .map(({id,platform,version})=>({id,platform,version})):null;
const specs = recorded??(requested.length ? requested.map(spec => {
  const [platform, version] = spec.split('@');
  return {id: `V${version}-${platform}`, platform, version};
}) : [
  {id: 'S1', platform: 'darwin-arm64', version: '2.1.325'},
  {id: 'S2', platform: 'win32-x64', version: '2.1.325'},
  {id: 'S3', platform: 'linux-arm64', version: '2.1.325'},
  {id: 'S4a', platform: 'darwin-arm64', version: '2.1.280'},
  {id: 'S4b', platform: 'darwin-arm64', version: '2.1.258'},
  {id: 'S5', platform: 'main', version: '2.1.325'},
  {id: 'S6', platform: 'darwin-arm64', version: '2.1.326'},
  {id: 'S7', platform: 'main', version: '2.1.326'},
]);
const archiveRoot = path.resolve(dir, '../installer');
const raw = path.join(dir, 'raw/registry');
const manifestPath = path.join(dir, 'sample-provenance.json');
fs.mkdirSync(archiveRoot, {recursive: true});
fs.mkdirSync(raw, {recursive: true});
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath)) : [];
const digest = (data, algorithm = 'sha256', encoding = 'hex') =>
  crypto.createHash(algorithm).update(data).digest(encoding);

async function fetchChecked(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(240000)});
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}

async function acquire(spec) {
  assert.match(spec.version, /^2\.1\.\d+$/);
  assert.match(spec.platform, /^(?:main|darwin-arm64|win32-x64|linux-arm64)$/);
  const packageName = `claude-code${spec.platform === 'main' ? '' : `-${spec.platform}`}`;
  const registryUrl = `https://registry.npmjs.org/@anthropic-ai/${packageName}/${spec.version}`;
  const metadataFile = path.join(raw, `${packageName}-${spec.version}.json`);
  let metadata;
  if (fs.existsSync(metadataFile)) metadata = JSON.parse(fs.readFileSync(metadataFile));
  else {
    const response = await fetchChecked(registryUrl);
    const text = await response.text();
    fs.writeFileSync(metadataFile, text);
    metadata = JSON.parse(text);
  }
  assert.equal(metadata.version, spec.version);
  const archive = path.join(archiveRoot, `${packageName}-${spec.version}.tgz`);
  if (!fs.existsSync(archive)) {
    const response = await fetchChecked(metadata.dist.tarball);
    const partial = `${archive}.partial`;
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial));
    fs.renameSync(partial, archive);
  }
  const archiveBytes = fs.readFileSync(archive);
  const [algorithm, expected] = metadata.dist.integrity.split('-');
  assert.equal(digest(archiveBytes, algorithm, 'base64'), expected, `${spec.id}: npm integrity`);
  const root = path.join(dir, 'unpacked/npm', `${packageName}-${spec.version}`);
  fs.mkdirSync(root, {recursive: true});
  const list = spawnSync('tar', ['-tf', archive], {encoding: 'utf8', windowsHide: true});
  assert.equal(list.status, 0, list.stderr);
  const entries = list.stdout.trim().split(/\r?\n/);
  assert.ok(entries.every(entry => entry.startsWith('package/') && !entry.split('/').includes('..')));
  if (!fs.existsSync(path.join(root, 'package/package.json'))) {
    const unpack = spawnSync('tar', ['-xf', archive, '-C', root], {encoding: 'utf8', windowsHide: true});
    assert.equal(unpack.status, 0, unpack.stderr);
  }
  const binary = spec.platform === 'main' ? null
    : path.join(root, 'package', spec.platform.startsWith('win32') ? 'claude.exe' : 'claude');
  const binaryBytes = binary ? fs.readFileSync(binary) : null;
  const record = {
    ...spec, package: `@anthropic-ai/${packageName}`, registryUrl,
    recordedAt: new Date().toISOString(), tarball: metadata.dist.tarball,
    integrity: metadata.dist.integrity, integrityVerified: true,
    archive: path.relative(dir, archive).replaceAll('\\', '/'),
    archiveBytes: archiveBytes.length, archiveSha256: digest(archiveBytes),
    packageRoot: path.relative(dir, path.join(root, 'package')).replaceAll('\\', '/'),
    binary: binary ? path.relative(dir, binary).replaceAll('\\', '/') : null,
    binaryBytes: binaryBytes?.length ?? null,
    binarySha256: binaryBytes ? digest(binaryBytes) : null,
    entries, officialBinaryExecuted: false, lifecycleScriptsExecuted: false,
  };
  const existing = manifest.findIndex(item => item.package === record.package && item.version === record.version);
  if (existing === -1) manifest.push(record);
  else record.id = manifest[existing].id, manifest[existing] = record;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({id: record.id, package: record.package, version: record.version,
    archiveBytes: record.archiveBytes, binaryBytes: record.binaryBytes, integrity: 'PASS'}));
}

const queue = specs.slice();
const outcomes = await Promise.allSettled(Array.from({length: 2}, async () => {
  while (queue.length) await acquire(queue.shift());
}));
for (const outcome of outcomes) if (outcome.status === 'rejected') {
  console.error(outcome.reason.stack);
  process.exitCode = 1;
}
