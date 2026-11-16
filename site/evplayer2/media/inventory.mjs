import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('./',import.meta.url);
const files=['EVPlayer2.exe','PlayerLibRender56_vs.dll','Bridge.dll','MetaLib.dll'];
const cstring=(b,o)=>{const end=b.indexOf(0,o);return b.subarray(o,end<0?b.length:end).toString('ascii');};
const interesting=/MediaPlayer|EVPlayer|RenderImpl|TextureImpl|AudioImpl|RtAudio|Surface|playFile|tsList|avformat|avcodec|avio_|av_read_frame|av_find|av_seek|sws_|swr_|ffurl|m3u8|playlist|tsDownloadUrl|tsUrl|signUrl|evsDown|getDownEVSKey|play url|video url|file_items|file_id|course_id|play_min_frames|cache_size|evseccoursedata|evsecstudentdata|slot_startPlay|slot_getPlaySubtitle|slot_rePlayFileFailed|use_hw_decoder|use_evx|https?:\/\/|\/student\/|\/user\/|\/course\/|\.ev[2568sx]\b|demux|decode|open_input|find_stream_info|read_packet|read_frame|playback/i;
const modules=[];
for(const name of files){
 const file='F:/EVPlayer2/'+name,b=fs.readFileSync(file),pe=b.readUInt32LE(0x3c),optional=pe+24,optionalSize=b.readUInt16LE(pe+20),sectionCount=b.readUInt16LE(pe+6),sections=[];
 const magic=b.readUInt16LE(optional),is64=magic===0x20b,dir=optional+(is64?112:96),imageBase=is64?b.readBigUInt64LE(optional+24).toString(16):b.readUInt32LE(optional+28).toString(16);
 for(let i=0;i<sectionCount;i++){const s=optional+optionalSize+i*40;sections.push({name:b.subarray(s,s+8).toString('ascii').replace(/\0.*$/,''),virtualSize:b.readUInt32LE(s+8),rva:b.readUInt32LE(s+12),rawSize:b.readUInt32LE(s+16),raw:b.readUInt32LE(s+20),flags:b.readUInt32LE(s+36)});}
 const offset=rva=>{const s=sections.find(s=>rva>=s.rva&&rva<s.rva+Math.max(s.virtualSize,s.rawSize));return s?s.raw+rva-s.rva:rva;};
 const toRva=raw=>{const s=sections.find(s=>raw>=s.raw&&raw<s.raw+s.rawSize);return s?s.rva+raw-s.raw:null;};
 const exports=[],imports=[],functions=[],strings=[];
 const er=b.readUInt32LE(dir),es=b.readUInt32LE(dir+4);
 if(er){const e=offset(er),count=b.readUInt32LE(e+24),funcs=offset(b.readUInt32LE(e+28)),names=offset(b.readUInt32LE(e+32)),ords=offset(b.readUInt32LE(e+36));for(let i=0;i<count;i++){const symbol=cstring(b,offset(b.readUInt32LE(names+i*4))),rva=b.readUInt32LE(funcs+b.readUInt16LE(ords+i*2)*4);exports.push({name:symbol,rva,forwarder:rva>=er&&rva<er+es?cstring(b,offset(rva)):null});}}
 const ir=b.readUInt32LE(dir+8);
 if(ir){for(let d=offset(ir);d+20<=b.length;d+=20){const original=b.readUInt32LE(d),dllRva=b.readUInt32LE(d+12),iat=b.readUInt32LE(d+16);if(!original&&!dllRva&&!iat)break;const dll=cstring(b,offset(dllRva)),stride=is64?8:4;for(let i=0;i<20000;i++){const o=offset(original||iat)+i*stride;const thunk=is64?b.readBigUInt64LE(o):BigInt(b.readUInt32LE(o));if(thunk===0n)break;const high=is64?(1n<<63n):(1n<<31n);imports.push({dll,name:(thunk&high)!==0n?'#'+String(thunk&0xffffn):cstring(b,offset(Number(thunk))+2),iatRva:iat+i*stride});}}}
 const exceptionRva=b.readUInt32LE(dir+24),exceptionSize=b.readUInt32LE(dir+28);
 if(exceptionRva)for(let o=offset(exceptionRva),end=o+exceptionSize;o+12<=end;o+=12){const begin=b.readUInt32LE(o),finish=b.readUInt32LE(o+4);if(finish>begin)functions.push({begin,end:finish});}
 functions.sort((a,b)=>a.begin-b.begin);
 const containing=rva=>{let low=0,high=functions.length-1;while(low<=high){const mid=(low+high)>>1,f=functions[mid];if(rva<f.begin)high=mid-1;else if(rva>=f.end)low=mid+1;else return f;}return null;};
 for(let i=0;i<b.length;){if(b[i]<32||b[i]>126){i++;continue;}const begin=i;while(i<b.length&&b[i]>=32&&b[i]<=126)i++;if(i-begin<6||i-begin>1500)continue;const text=b.toString('ascii',begin,i);if(interesting.test(text)){const rva=toRva(begin);strings.push({encoding:'ascii',offset:begin,rva,text});}}
 const wanted=new Map(strings.filter(s=>s.rva!==null).map(s=>[s.rva,s])),xrefs=[],importMap=new Map(imports.map(i=>[i.iatRva,i]));
 for(const section of sections.filter(s=>(s.flags&0x20000000)!==0)){const end=section.raw+section.rawSize;for(let o=section.raw;o+7<end;o++){const rva=section.rva+o-section.raw;
   if((b[o]===0x48||b[o]===0x4c)&&b[o+1]===0x8d&&(b[o+2]&0xc7)===5){const target=rva+7+b.readInt32LE(o+3);if(wanted.has(target))xrefs.push({kind:'rip_lea',rva,target,string:wanted.get(target).text,function:containing(rva)});}
   if(b[o]===0xff&&(b[o+1]===0x15||b[o+1]===0x25)){const target=rva+6+b.readInt32LE(o+2),symbol=importMap.get(target);if(symbol&&(/MediaPlayer|Surface|avformat|avcodec|avio_|curl_|QNetwork|QFile/.test(symbol.name)))xrefs.push({kind:b[o+1]===0x15?'iat_call':'iat_jump',rva,target,import:symbol,function:containing(rva)});}
 }}
 const result={name,file,sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length,imageBase,sections,exports,imports,functions,mediaStrings:strings,xrefs};modules.push(result);
 fs.writeFileSync(new URL(name+'.inventory.json',root),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({name,exports:exports.filter(e=>/MediaPlayer|EVPlayer|RenderImpl|TextureImpl|AudioImpl|Surface|avformat|avcodec|avio_|av_read_frame|tsList/.test(e.name)),interestingStrings:strings.length,xrefs:xrefs.length,imports:imports.filter(i=>/avformat|avcodec|avio_|curl_|QNetwork|QFile/.test(i.name))}));
}
fs.writeFileSync(new URL('inventory_summary.json',root),JSON.stringify(modules.map(m=>({name:m.name,file:m.file,sha256:m.sha256,bytes:m.bytes,exports:m.exports.length,imports:m.imports.length,mediaStrings:m.mediaStrings.length,xrefs:m.xrefs.length})),null,2)+'\n');