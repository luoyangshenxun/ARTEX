import {parse} from './tools/acorn-8.15.0/package/dist/acorn.mjs';
import {source, walk} from './source-lib.mjs';
const [sample, index, ...names] = process.argv.slice(2);
const {module, text} = source(sample, index);
const ast = parse(text, {ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true});
const result = [];
walk(ast, (node, ancestors) => {
  for (const arg of names.filter(name => name.startsWith('@'))) {
    const offset = Number(arg.slice(1));
    if (/Function|VariableDeclarator|MethodDefinition/.test(node.type)
        && node.start <= offset && offset < node.end)
      console.log(JSON.stringify({scopeAt: offset, type: node.type,
        name: node.id?.name ?? node.key?.name, start: node.start, end: node.end,
        prefix: text.slice(node.start, Math.min(node.start + 150, node.end))}));
  }
  for (const arg of names.filter(name => name.startsWith('&'))) {
    if (node.type === 'Identifier' && node.name === arg.slice(1)) {
      const scope = [...ancestors].reverse().find(a => a.type === 'FunctionDeclaration');
      console.log(JSON.stringify({reference: node.name, offset: node.start, scope: scope?.id?.name,
        scopeStart: scope?.start, excerpt: text.slice(Math.max(0, node.start - 100), node.end + 200)}));
    }
  }
  const name = node.id?.name ?? node.key?.name;
  let select = names.includes(name);
  for (const term of names.filter(name => name.startsWith('~')).map(name => name.slice(1))) {
    if (node.type === 'Literal' && typeof node.value === 'string' && node.value.includes(term)) {
      const fn = [...ancestors].reverse().find(a => /Function/.test(a.type));
      const entry = fn ?? ancestors.at(-1) ?? node;
      if (!result.some(item => item.start === entry.start)) result.push(entry);
    }
  }
  if (select && !result.some(item => item.start === node.start)) result.push(node);
});
for (const node of result) console.log(JSON.stringify({
  sample, module: module.modulePath, index: Number(index), type: node.type,
  name: node.id?.name ?? node.key?.name, start: node.start, end: node.end,
  binaryOffset: module.contentsOffset + node.start * (module.encoding === 2 ? 2 : 1),
  text: text.slice(node.start, Math.min(node.end, node.start + 18000)),
  truncated: node.end - node.start > 18000
}));
