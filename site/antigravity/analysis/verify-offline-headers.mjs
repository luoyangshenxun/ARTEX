import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(dir, 'unpacked', '{code_GetDestDir}', 'resources', 'app');
const require = createRequire(path.join(app, 'package.json'));
const {OAuth2Client} = require('google-auth-library');
const authVersion = require('google-auth-library/package.json').version;
const product = JSON.parse(fs.readFileSync(path.join(app, 'product.json')));
const fetchDir = path.join(app, 'node_modules', 'gaxios', 'node_modules', 'node-fetch');
const {Request, Response} = await import(pathToFileURL(path.join(fetchDir, 'src', 'index.js')));
const {getNodeRequestOptions} = await import(pathToFileURL(path.join(fetchDir, 'src', 'request.js')));
const client = new OAuth2Client();
client.setCredentials({access_token: 'TOKEN', token_type: 'Bearer', expiry_date: 4102444800000});
const baseAgent = `antigravity/${product.ideVersion} windows/amd64`;
const body = {
  cloudaicompanion_project: 'PROJECT',
  metadata: {ide_type: 'ANTIGRAVITY', ide_version: product.ideVersion, ide_name: 'antigravity'},
};
let captured;
let adapterCalls = 0;
await client.request({
  url: 'https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist',
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'User-Agent': baseAgent},
  data: body,
  noProxy: ['*'],
  fetchImplementation: async (url, options) => {
    adapterCalls++;
    const request = new Request(url, options);
    const converted = getNodeRequestOptions(request);
    captured = {url: String(url), method: converted.options.method,
      headers: converted.options.headers, body: options.body};
    return new Response('{}', {status: 200, headers: {'content-type': 'application/json'}});
  },
});
assert.equal(adapterCalls, 1);
assert.equal(captured.headers.authorization, 'Bearer TOKEN');
assert.equal(captured.headers['user-agent'], `${baseAgent} google-api-nodejs-client/${authVersion}`);
assert.equal(captured.headers['x-goog-api-client'], `gl-node/${process.versions.node}`);
assert.equal(captured.headers['content-type'], 'application/json');
assert.equal(captured.headers.accept, '*/*');
assert.equal(captured.headers['accept-encoding'], 'gzip, deflate, br');
assert.equal(captured.headers['content-length'], String(Buffer.byteLength(captured.body)));
assert.deepEqual(JSON.parse(captured.body), body);
const result = {
  kind: 'OFFLINE_DEPENDENCY_REPRODUCTION',
  officialClientExecuted: false, networkRequests: 0,
  note: 'Synthetic TOKEN and PROJECT. Host Node version is not the official Electron runtime.',
  hostNodeVersion: process.versions.node, googleAuthLibraryVersion: authVersion,
  captured,
  limits: 'Host, Connection, TLS/HTTP negotiation and final wire header order are not captured.',
  exitStatus: 0,
};
const output = path.join(dir, 'offline-header-verification.json');
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
