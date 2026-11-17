// Bounded static query: never imports or executes an extracted client module.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const [selection = 'S1', term, contextArg = '300', limitArg = '15', startArg = '0'] = process.argv.slice(2);
const [sample, moduleIndex] = selection.split(':');
if (!term) throw new Error('sample literal [context chars] [limit]');
const graph = JSON.parse(fs.readFileSync(path.join(dir, 'raw/embedded-modules.json')))
  .find(item => item.sample === sample);
const context = Number(contextArg), limit = Number(limitArg);
let count = 0;
for (const module of graph.modules) {
  if (moduleIndex !== undefined && module.index !== Number(moduleIndex)) continue;
  if (!module.contentsLength || !/\.js$|\/cli$/.test(module.modulePath)) continue;
  const text = fs.readFileSync(path.join(dir, module.extractedPath)).toString(module.textEncoding);
  let offset = Number(startArg) - 1;
  while ((offset = text.indexOf(term, offset + 1)) >= 0) {
    console.log(JSON.stringify({sample, index: module.index, module: module.modulePath,
      offset, binaryOffset: module.contentsOffset + offset * (module.encoding === 2 ? 2 : 1),
      excerpt: text.slice(Math.max(0, offset - context), offset + term.length + context)}));
    if (++count >= limit) process.exit(0);
  }
}
