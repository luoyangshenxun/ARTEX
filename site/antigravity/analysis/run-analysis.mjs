import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const stages = ['scan-static.mjs', 'decode-descriptors.mjs', 'build-focused-evidence.mjs',
  'verify-offline-headers.mjs', 'verify-evidence.mjs'];
const ledger = [
  'Antigravity local static analysis verification',
  `Recorded at: ${new Date().toISOString()}`,
  `TARGET: ${path.resolve(dir, '..', 'installer', 'Antigravity-IDE-2.7.0-windows-x64.exe')}`,
  'Original installer and official client were not executed or modified.',
  'Offline dependency reproduction uses synthetic TOKEN and PROJECT and an intercepted fetch adapter.',
  'The Node version in offline output belongs to the analysis host, not official Electron.',
  'Extraction: innounp 2.71.3 -x -y -d<analysis/unpacked> <TARGET>; observed exit status 0.',
  'Installer file list and unpack.log are the literal PowerShell UTF-16 output from extraction.',
  'Public CLI manifest was downloaded as JSON only; its referenced binary was not downloaded.',
  '',
];
for (const stage of stages) {
  const full = path.join(dir, stage);
  const result = spawnSync(process.execPath, [full], {encoding: 'utf8', cwd: dir});
  fs.writeFileSync(path.join(dir, `${stage}.stdout.txt`), result.stdout ?? '');
  fs.writeFileSync(path.join(dir, `${stage}.stderr.txt`), result.stderr ?? '');
  ledger.push(`COMMAND: "${process.execPath}" "${full}"`, `CWD: ${dir}`,
    'STDOUT (literal):', result.stdout ?? '', 'STDERR (literal):', result.stderr ?? '',
    `EXIT STATUS: ${result.status}`, '');
  console.log(`${stage}: exit=${result.status}`);
  if (result.status !== 0) {
    fs.writeFileSync(path.join(dir, 'VERIFICATION.txt'), ledger.join('\n'));
    process.exit(result.status ?? 1);
  }
}
const artifacts = fs.readdirSync(dir, {withFileTypes: true})
  .filter(e => e.isFile() && !['integrity-manifest.json', 'VERIFICATION.txt'].includes(e.name))
  .map(e => {
    const full = path.join(dir, e.name), bytes = fs.readFileSync(full);
    return {path: full, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
  });
fs.writeFileSync(path.join(dir, 'integrity-manifest.json'), JSON.stringify(artifacts, null, 2) + '\n');
ledger.push(`RESULT: PASS; ${stages.length} stages; artifacts reopened and hashed: ${artifacts.length}.`,
  `INTEGRITY MANIFEST: ${path.join(dir, 'integrity-manifest.json')}`);
fs.writeFileSync(path.join(dir, 'VERIFICATION.txt'), ledger.join('\n') + '\n');
console.log(`VERIFICATION: ${path.join(dir, 'VERIFICATION.txt')}`);
