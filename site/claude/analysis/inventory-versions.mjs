import fs from 'node:fs';
import path from 'node:path';
import {dir, graphs} from './source-lib.mjs';
const rows = [];
for (const graph of graphs()) {
  const binary = fs.readFileSync(path.join(dir, graph.binary));
  const binaryText = binary.toString('latin1');
  const bun = [...binaryText.matchAll(/Bun v\d+\.\d+\.\d+[^\x00\r\n]{0,45}/g)]
    .map(match => ({offset: match.index, value: match[0]}));
  const nodes = [...binaryText.matchAll(/(?:node|Node\.js|NodeJS)[/ :v]+\d+\.\d+\.\d+/g)]
    .map(match => ({offset: match.index, value: match[0]}));
  const sdk = [];
  for (const module of graph.modules) {
    if (!/\.js$/.test(module.modulePath)) continue;
    const text = fs.readFileSync(path.join(dir, module.extractedPath)).toString(module.textEncoding);
    if (text.includes('X-Stainless-Package-Version')) {
      const first = text.indexOf('X-Stainless-Package-Version');
      sdk.push({index: module.index, module: module.modulePath,
        candidates: [...text.slice(Math.max(0, first - 2000), first).matchAll(/\b\d+\.\d+\.\d+\b/g)]
          .map(match => match[0]),
        excerpt: text.slice(Math.max(0, first - 1100), first + 300)});
    }
  }
  const row = {sample: graph.sample, version: graph.version, bun: bun.slice(0, 12),
    nodeStrings: nodes.slice(0, 12), sdk};
  rows.push(row);
  console.log(JSON.stringify(process.argv.includes('--compact')
    ? {sample: row.sample, version: row.version, bun: row.bun.map(x => x.value),
      node: row.nodeStrings[0], sdk: row.sdk.map(x => x.candidates)} : row));
}
fs.writeFileSync(path.join(dir, 'raw/version-inventory.json'), JSON.stringify(rows, null, 2) + '\n');
