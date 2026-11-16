import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(dir, 'unpacked', '{code_GetDestDir}', 'resources', 'app');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const specs = [
  ['E01', 'product.json', '"ideVersion"', 0, 180],
  ['E02', 'product.json', '"languageServerCL"', 0, 180],
  ['E03', 'out/main.js', 'get clientMetadata(){const t=this._productService', 0, 480],
  ['E04', 'out/main.js', 'function BBo()', 0, 250],
  ['E05', 'out/main.js', 'async makePostRequest(t,n,r,i,a)', 0, 1400],
  ['E06', 'out/main.js', 'async loadCodeAssist(t,n)', 0, 3000],
  ['E07', 'out/main.js', 'function kEn(e)', 0, 320],
  ['E08', 'out/main.js', 'function nZn(e,t,n)', 100, 750],
  ['E09', 'out/main.js', 'function NBo(', 0, 700],
  ['E10', 'out/main.js', 'function DKe(e,t)', 0, 580],
  ['E11', 'out/main.js', 'getLoginUrl(t){', 0, 500],
  ['E12', 'out/main.js', 'async exchangeCodeForToken(t,n,r)', 0, 650],
  ['E13', 'out/main.js', 'function Zqe(e,t,n)', 6, 1400],
  ['E14', 'out/main.js', 'async buildUpdateFeedUrl(t){let n=`win32-', 0, 370],
  ['E15', 'extensions/agy/vscode/extension.js', 'Va.MIN_AGY_VERSION=', 0, 720],
  ['E16', 'extensions/agy/vscode/extension.js', 'function db(a,b)', 0, 440],
  ['E17', 'extensions/agy/vscode/extension.js', 'async function ac(a,b,c,d=ob)', 0, 2900],
  ['E18', 'extensions/agy/vscode/extension.js', 'async spawnAndWaitForPort(a)', 0, 950],
  ['E19', 'node_modules/google-auth-library/build/src/auth/authclient.js', 'static DEFAULT_REQUEST_INTERCEPTOR', 0, 1000],
  ['E20', 'node_modules/google-auth-library/build/src/shared.cjs', 'const PRODUCT_NAME', 0, 250],
  ['E21', 'node_modules/google-auth-library/build/src/auth/oauth2client.js', 'async requestAsync(opts', 0, 650],
  ['E22', 'node_modules/google-auth-library/build/src/auth/oauth2client.js', 'async getRequestMetadataAsync(', 0, 2800],
  ['E23', 'node_modules/gaxios/build/cjs/src/gaxios.js', 'static async #getFetch()', 0, 330],
  ['E24', 'node_modules/gaxios/build/cjs/src/gaxios.js', 'const shouldDirectlyPassData', 0, 2550],
  ['E25', 'node_modules/gaxios/node_modules/node-fetch/src/request.js', 'export const getNodeRequestOptions', 0, 3000],
  ['E26', 'node_modules/gaxios/node_modules/node-fetch/src/headers.js', "case 'keys':", 0, 250],
  ['E27', 'out/main.js', 'oAe="1071006060591-', 0, 640],
  ['E28', 'out/main.js', 't.languageServerCL||"Unknown"', 220, 430],
];
const entries = specs.map(([id, file, marker, before, length]) => {
  const bytes = fs.readFileSync(path.join(app, file)), code = bytes.toString('utf8');
  const found = code.indexOf(marker);
  if (found < 0) throw new Error(`${id}: marker missing in ${file}: ${marker}`);
  const start = Math.max(0, found - before);
  const end = Math.min(code.length, start + length);
  let excerpt = code.slice(start, end);
  const redacted = [];
  excerpt = excerpt.replace(/GOCSPX-[A-Za-z0-9_-]+/g, value => {
    const hash = sha(value);
    redacted.push({sha256: hash, bytes: Buffer.byteLength(value)});
    return `<CLIENT_SECRET_SHA256:${hash}>`;
  });
  return {
    id, file: path.relative(dir, path.join(app, file)).replaceAll('\\', '/'),
    sourceSha256: sha(bytes), sourceBytes: bytes.length,
    startByte: Buffer.byteLength(code.slice(0, start)),
    endByteExclusive: Buffer.byteLength(code.slice(0, end)),
    line: code.slice(0, start).split('\n').length, marker,
    excerpt, ...(redacted.length ? {redactedClientSecrets: redacted} : {}),
  };
});
fs.writeFileSync(path.join(dir, 'focused-evidence.json'), JSON.stringify(entries, null, 2) + '\n');
for (const entry of entries) console.log(`${entry.id} ${entry.file}:${entry.line} byte=${entry.startByte}`);
