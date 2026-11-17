import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(dir, '../../../..');
const raw = path.resolve(dir, '../raw');
const replay = path.join(raw, 'patch-replay');
const baseline = path.join(dir, 'BASELINE.md');
const modified = path.join(dir, 'MODIFIED_FILE.md');
const patch = path.join(dir, 'DIFF_FILE.patch');
const rollback = path.join(dir, 'ROLLBACK.sh');
const copy = path.join(dir, 'rollback-copy.md');
const check = path.join(dir, 'check-state.mjs');
const verification = path.join(dir, 'VERIFICATION.txt');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pristine = fs.readFileSync(baseline);
const changed = fs.readFileSync(modified);
const records = [];
const ledger = [
  'Claude workspace scaffold transaction verification',
  `Recorded at: ${new Date().toISOString()}`,
  `TARGET: ${modified}`,
  `BASELINE: ${baseline}`,
  'GOAL: status=pending -> status=scaffolded; bind the CLI and SDK analysis targets.',
  'Scope: four-role contract replay plus v2 static evidence verification; no official executable launched.',
  'V2 changed field: analysis_status=static-analysis-complete-with-runtime-boundaries',
  '',
];

function run(label, executable, args, cwd = repo) {
  const result = spawnSync(executable, args, {cwd, encoding: 'utf8', windowsHide: true});
  records.push({label, executable, args, cwd, ...result});
  ledger.push(
    `COMMAND ${label}: ${JSON.stringify([executable, ...args])}`,
    `CWD: ${cwd}`,
    'STDOUT BEGIN',
    result.stdout ?? '',
    'STDOUT END',
    'STDERR BEGIN',
    result.stderr ?? '',
    'STDERR END',
    `EXIT STATUS: ${result.status}`,
    `SIGNAL: ${result.signal ?? 'none'}`,
    `EXECUTION ERROR: ${result.error?.message ?? 'none'}`,
    '',
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${label}: exit status`);
  return result.stdout;
}

try {
  assert.equal(sha256(pristine), '65251ede085c6f2fc2497b86ff8759266e32d32097b0841de292cadcfb1e89b1');
  assert.match(changed.toString('utf8'), /^status: scaffolded$/m);
  assert.match(changed.toString('utf8'), /^analysis_basis: native-bun-embedded-sdk$/m);
  assert.match(changed.toString('utf8'), /^analysis_status: static-analysis-complete-with-runtime-boundaries$/m);
  fs.mkdirSync(replay, {recursive: true});
  const replayFile = path.join(replay, 'MODIFIED_FILE.md');
  fs.writeFileSync(replayFile, pristine);
  run('PATCH', 'git', [
    'apply', '--no-index',
    `--directory=${path.relative(repo, replay).replaceAll('\\', '/')}`,
    patch,
  ]);
  assert.deepEqual(fs.readFileSync(replayFile), changed, 'patch reconstructs modified bytes');

  run('ANALYSIS V2', process.execPath, [path.resolve(dir, '../verify-analysis.mjs')]);
  assert.equal(run('BASELINE', process.execPath, [check, baseline]), 'status=pending\n');
  assert.equal(run('MODIFIED', process.execPath, [check, modified]), 'status=scaffolded\n');
  fs.writeFileSync(copy, changed);
  const bash = process.platform === 'win32'
    ? path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')
    : 'sh';
  run('ROLLBACK', bash, ['./ROLLBACK.sh', './rollback-copy.md'], dir);
  assert.equal(run('ROLLBACK CHECK', process.execPath, [check, copy]), 'status=pending\n');
  assert.deepEqual(fs.readFileSync(copy), pristine, 'rollback hash matches original');
  assert.deepEqual(fs.readFileSync(baseline), pristine, 'baseline unchanged');

  fs.writeFileSync(modified, changed);
  assert.deepEqual(fs.readFileSync(modified), changed, 'goal reapplied');
  ledger.push(
    `BASELINE SHA-256: ${sha256(pristine)}`,
    `MODIFIED SHA-256: ${sha256(fs.readFileSync(modified))}`,
    `PATCH REPLAY SHA-256: ${sha256(fs.readFileSync(replayFile))}`,
    `ROLLBACK SHA-256: ${sha256(fs.readFileSync(copy))}`,
    'ROLLBACK HASH MATCHES BASELINE: true',
    'OBSERVED BASELINE: status=pending; exit=0',
    'OBSERVED MODIFIED: status=scaffolded; exit=0',
    'OBSERVED ROLLBACK: status=pending; exit=0',
    'REAPPLY: status=scaffolded',
    'TRANSACTION_VERIFICATION=PASS',
  );
} catch (error) {
  ledger.push(`TRANSACTION_VERIFICATION=FAIL: ${error.stack ?? error}`);
  process.exitCode = 1;
} finally {
  fs.mkdirSync(raw, {recursive: true});
  for (const record of records) {
    const label = record.label.toLowerCase().replaceAll(' ', '-');
    fs.writeFileSync(path.join(raw, `${label}.stdout.txt`), record.stdout ?? '');
    fs.writeFileSync(path.join(raw, `${label}.stderr.txt`), record.stderr ?? '');
  }
  fs.writeFileSync(verification, ledger.join('\n') + '\n');
  for (const full of [modified, patch, verification, rollback]) {
    const bytes = fs.readFileSync(full);
    new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    console.log(`REOPENED ${full} bytes=${bytes.length} SHA256=${sha256(bytes)}`);
  }
  console.log(ledger.slice(-5).join('\n'));
}
