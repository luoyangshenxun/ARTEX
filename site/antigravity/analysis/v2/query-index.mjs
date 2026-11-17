import fs from 'node:fs';
const [sample, pattern='userAgent$|ClientInfo$|clientMetadata|ClientMetadata|BuildGenerateContentRequest$|StreamGenerateContent$|setHeaders$|SetHTTPHeaders$|ResolveAuthMode$|OnboardUser$|marshalCCPARequest$']=process.argv.slice(2);
const j=JSON.parse(fs.readFileSync(`site/antigravity/analysis/v2/${sample}-native-index.json`));
for(const f of j.functions.filter(f=>new RegExp(pattern).test(f.name)))console.log(f.offset,f.size,f.name);
