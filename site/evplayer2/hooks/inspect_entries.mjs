import fs from 'node:fs';
import * as frida from 'frida';
const session=await frida.attach(56664);
const script=await session.createScript(`
function bytes(p,n){return Array.from(new Uint8Array(p.readByteArray(n)),x=>x.toString(16).padStart(2,'0')).join('');}
function decode(start,count){const result=[];let p=start;for(let i=0;i<count;i++){try{const ins=Instruction.parse(p);result.push({address:p.toString(),bytes:bytes(p,ins.size),instruction:ins.toString(),operands:ins.operands});p=ins.next;}catch(error){result.push({error:String(error)});break;}}return result;}
rpc.exports={inspect(){
const out={entries:[],callsites:[]};
for(const [mod,name] of [['user32.dll','SetWindowDisplayAffinity'],['user32.dll','GetWindowDisplayAffinity'],['win32u.dll','NtUserSetWindowDisplayAffinity']]){
const m=Process.findModuleByName(mod);const p=m?m.findExportByName(name):null;if(!p){out.entries.push({mod,name,address:null});continue;}
const entry={mod,name,address:p.toString(),range:Process.findRangeByAddress(p),bytes:bytes(p,48),disassembly:decode(p,8)};
const ins=Instruction.parse(p);if(ins.mnemonic==='jmp'&&ins.operands[0].type==='mem'){const op=ins.operands[0].value;if(op.base==='rip'){const slot=ins.next.add(op.disp);entry.jumpSlot=slot.toString();entry.jumpTarget=slot.readPointer().toString();entry.targetModule=Process.findModuleByAddress(slot.readPointer());entry.targetInstructions=decode(slot.readPointer(),8);}}out.entries.push(entry);
}
const m=Process.getModuleByName('EVPlayer2.exe');for(const rva of [0x18986a,0x17ca88,0x17cab6,0x17cc38]){const ret=m.base.add(rva);const before=ret.sub(6);out.callsites.push({rva:'0x'+rva.toString(16),before:bytes(ret.sub(24),48),callMinus6:decode(before,5),callMinus5:decode(ret.sub(5),4),after:decode(ret,12)});}return out;
}};
`);
try { await script.load(); const result=await script.exports.inspect(); fs.writeFileSync(new URL('./entries.json',import.meta.url),JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result)); }
finally { await script.unload(); await session.detach(); }