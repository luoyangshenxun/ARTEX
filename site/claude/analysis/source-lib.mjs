import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const dir = path.dirname(fileURLToPath(import.meta.url));
export function graphs() {
  return JSON.parse(fs.readFileSync(path.join(dir, 'raw/embedded-modules.json')));
}
export function source(sample, index) {
  const graph = graphs().find(item => item.sample === sample);
  const module = graph.modules.find(item => item.index === Number(index));
  const bytes = fs.readFileSync(path.join(dir, module.extractedPath));
  return {graph, module, text: bytes.toString(module.textEncoding)};
}
export function walk(node, visit, ancestors = []) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node, ancestors);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    if (Array.isArray(value)) {
      for (const child of value) if (child?.type) walk(child, visit, [...ancestors, node]);
    } else if (value?.type) walk(value, visit, [...ancestors, node]);
  }
}
