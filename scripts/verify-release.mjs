import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))];
const failures=[];
for(const file of files){
  if(/(^|\/)(?:\.env(?!\.example)|\.dev\.vars|\.sites-runtime|\.wrangler|\.vercel)(?:\/|$|\.)/.test(file))failures.push(file+': private runtime file');
  if(statSync(file).size>2*1024*1024)continue;
  const source=readFileSync(file,'utf8');
  if(/\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bsbp_[a-f0-9]{32,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s:'"/]+:[^\s@'"]{16,}@/.test(source))failures.push(file+': possible credential');
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`Release inventory: ${files.length} authored files; no high-confidence credentials or private runtime files found.`);
