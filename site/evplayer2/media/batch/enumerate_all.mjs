import fs from 'node:fs';
import * as frida from '../../hooks/node_modules/frida/build/src/frida.js';
const root=new URL('./',import.meta.url),pid=67068,session=await frida.attach(pid);let script,audit;
const state={time:new Date().toISOString(),pid,status:'enumerating',courses:[],failures:[],outputDirectory:'H:/orca/rea/site/evplayer2/media/account_mp4'};
const save=()=>fs.writeFileSync(new URL('account_manifest.json',root),JSON.stringify(state,null,2)+'\n');
try{script=await session.createScript('const SPEC={hwnd:"0x250514"};\n'+fs.readFileSync(new URL('account.agent.js',root),'utf8'),{name:'account-all-course-enumeration'});await script.load();const initial=await script.exports.snapshot();const courseModel=initial.models.find(m=>m.model==='0x1fc8356d010');const courses=courseModel.nodes.filter(n=>!n.childCount);state.courseGroups=courseModel.nodes.filter(n=>n.childCount);save();
for(const course of courses){
 try{const action=await script.exports.invokeIndex('0x1fc828a6fe0',courseModel.model,course.path,'slot_treeViewDoubleClicked');let after,selected;
 for(let attempt=0;attempt<15;attempt++){await new Promise(r=>setTimeout(r,1500));after=await script.exports.snapshot();selected=after.models.find(m=>m.visible&&m.model!==courseModel.model&&m.nodes.length);if(selected)break;}
 if(!selected)throw Error('Course content did not load');
 const detail=after.widgets.find(w=>w.class==='CourseDetailForm'&&w.visible);
 if(!detail)throw Error('Visible course detail missing');
 const record={title:course.title,coursePath:course.path,dataObject:course.dataObject,detailObject:detail.object,view:selected.object,model:selected.model,items:selected.nodes};state.courses.push(record);save();console.log(JSON.stringify({title:course.title,count:record.items.length,detail:detail.object,model:selected.model}));
 }catch(e){state.failures.push({title:course.title,error:String(e)});save();console.log(JSON.stringify({title:course.title,error:String(e)}));}
}
state.status=state.failures.length?'enumeration_partial':'enumerated';state.totalItems=state.courses.reduce((n,c)=>n+c.items.length,0);state.totalVideos=state.courses.reduce((n,c)=>n+c.items.filter(i=>/\.(mp4|mkv|avi|mov|wmv|flv|evs|ev[4568])$/i.test(i.title)).length,0);audit=await script.exports.shutdown();state.audit=audit;save();console.log(JSON.stringify({status:state.status,courses:state.courses.length,totalItems:state.totalItems,totalVideos:state.totalVideos,failures:state.failures,audit}));
}finally{if(script){if(!audit)try{state.audit=await script.exports.shutdown();save();}catch{}await script.unload();}await session.detach();}
