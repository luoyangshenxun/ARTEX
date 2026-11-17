import fs from 'node:fs';
const [file, flag, mode] = process.argv.slice(2);
if (flag !== '--mode' || mode !== 'fingerprint') throw new Error('usage: probe-report.mjs FILE --mode fingerprint');
const text = fs.readFileSync(file, 'utf8');
const match = text.match(/antigravity\/hub\/([\d.]+) \(aidev_client; os_type=darwin; arch=arm64; cl=(\d+)\)/);
if (!match) throw new Error('macOS core UA missing');
console.log(JSON.stringify({app_version: match[1], cl: match[2], round: text.includes('第二轮') ? 'v2' : 'v1'}));
