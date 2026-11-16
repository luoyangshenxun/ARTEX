import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const analysis = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(analysis, 'unpacked', '{code_GetDestDir}', 'resources', 'app');
const output = path.join(analysis, 'static-evidence.json');
const terms = [
  'cloudcode-pa', 'daily-cloudcode', 'v1internal', 'antigravity/hub/',
  'changelist', 'user-agent', 'userAgent', 'X-Goog-', 'x-goog-', 'X-Client-',
  'loadCodeAssist', 'onboardUser', 'fetchAvailableModels', 'generateContent',
  'streamGenerateContent', 'thoughtSignature', 'ideVersion', 'ideType',
  'clientMetadata', 'systemInstruction', 'client_id', 'clientId',
  'client_secret', 'redirect_uri', 'code_challenge', 'code_verifier',
  'oauth2', 'releaseBaseUrl', 'releases', 'updateUrl', 'agy --hub',
  'storage.googleapis.com', 'antigravity-public', '--hub', 'hubVersion',
  'buildVersion', 'x-server', 'ANTIGRAVITY_CLI', 'AGY_VERSION',
];
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'node_modules.asar.unpacked'].includes(entry.name)) walk(full);
    } else if (/\.(?:[cm]?js|json|sh|cmd|bat|ps1)$/.test(entry.name)) files.push(full);
  }
}
walk(path.join(app, 'extensions', 'agy'));
walk(path.join(app, 'out'));
for (const name of ['package.json', 'product.json']) {
  const full = path.join(app, name);
  if (fs.existsSync(full)) files.push(full);
}
const evidence = [];
for (const file of files) {
  const bytes = fs.readFileSync(file);
  const text = bytes.toString('utf8');
  const hits = [];
  for (const term of terms) {
    let start = 0;
    let count = 0;
    while ((start = text.indexOf(term, start)) !== -1) {
      count++;
      if (count <= 20) {
        hits.push({
          term,
          charOffset: start,
          byteOffset: Buffer.byteLength(text.slice(0, start)),
          line: text.slice(0, start).split('\n').length,
          context: text.slice(Math.max(0, start - 300), start + term.length + 550),
        });
      }
      start += term.length;
    }
    if (count > 20) hits.push({term, totalMatches: count, sampled: 20});
  }
  if (hits.length) evidence.push({
    file: path.relative(analysis, file).replaceAll('\\', '/'),
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    hits,
  });
}
const result = {scope: app, generatedAt: new Date().toISOString(), scannedFiles: files.length, terms, evidence};
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({output, scannedFiles: files.length, matchedFiles: evidence.length}));
for (const item of evidence) {
  console.log(`${item.file}: ${[...new Set(item.hits.map(hit => hit.term))].join(', ')}`);
}
