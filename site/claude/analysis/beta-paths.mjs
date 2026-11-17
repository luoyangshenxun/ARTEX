import fs from 'node:fs';
import path from 'node:path';
import {parse} from './tools/acorn-8.15.0/package/dist/acorn.mjs';
import {dir,source,walk} from './source-lib.mjs';
const {module,text}=source('S1',641);
const ast=parse(text,{ecmaVersion:'latest',sourceType:'module'});
const output=[];
walk(ast,(node,ancestors)=>{
  if(node.start<3088595||node.end>3230472)return;
  if(node.type!=='CallExpression'||node.callee.type!=='MemberExpression')return;
  const object=node.callee.object;
  if(!['vn','Ea'].includes(object.name)||!['push','filter','splice','includes'].includes(node.callee.property.name))return;
  if(node.callee.property.name==='includes')return;
  const statement=[...ancestors].reverse().find(a=>/Statement$|VariableDeclarator/.test(a.type));
  const contains=a=>a&&a.start<=node.start&&a.end>=node.end;
  const guards=ancestors.filter(a=>a.type==='IfStatement'||a.type==='ConditionalExpression')
    .map(a=>({test:text.slice(a.test.start,a.test.end),
      branch:contains(a.test)?'test':contains(a.consequent)?'then':'else'}));
  const shortCircuit=ancestors.filter(a=>a.type==='LogicalExpression'&&contains(a.right))
    .map(a=>({operator:a.operator,left:text.slice(a.left.start,a.left.end)}));
  const start=statement?.start??node.start,end=statement?.end??node.end;
  const item={module:module.modulePath,function:'Eos',operation:text.slice(node.start,node.end),
    offset:node.start,binaryOffset:module.contentsOffset+node.start,
    guards,shortCircuit,statement:text.slice(start,Math.min(end,start+2600))};
  output.push(item);
});
fs.writeFileSync(path.join(dir,'beta-mutations.json'),JSON.stringify(output,null,2)+'\n');
for(const item of output)console.log(JSON.stringify(item));
