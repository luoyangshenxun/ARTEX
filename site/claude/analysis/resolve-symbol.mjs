import {parse} from './tools/acorn-8.15.0/package/dist/acorn.mjs';
import {graphs,source,walk} from './source-lib.mjs';
const [sample,index,...symbols]=process.argv.slice(2);
const {module,text,graph}=source(sample,index);
const ast=parse(text,{ecmaVersion:'latest',sourceType:'module'});
for(const symbol of symbols){
  const imported=ast.body.filter(node=>node.type==='ImportDeclaration')
    .flatMap(node=>node.specifiers.map(specifier=>({node,specifier})))
    .find(({specifier})=>specifier.local.name===symbol);
  if(imported){
    const target=graph.modules.find(m=>m.modulePath===imported.node.source.value);
    console.log(JSON.stringify({symbol,from:module.modulePath,import:imported.node.source.value,
      targetIndex:target?.index,imported:imported.specifier.imported?.name}));
  }else{
    const found=[];
    walk(ast,(node,ancestors)=>{
      if(node.id?.name!==symbol||ancestors.some(a=>/Function/.test(a.type)))return;
      if(!['FunctionDeclaration','VariableDeclarator','ClassDeclaration'].includes(node.type))return;
      found.push({start:node.start,end:node.end,text:text.slice(node.start,Math.min(node.end,node.start+4000))});
    });
    console.log(JSON.stringify({symbol,index:Number(index),definitions:found}));
  }
}
