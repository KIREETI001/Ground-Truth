import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir,mkdtemp,readFile,realpath,rm,writeFile } from 'node:fs/promises';
import { basename,dirname,join,resolve } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';

export const PINNED_COMMIT='026d25d212336d5e26c42b32bb31a37c1bfc157b';
export const PINNED_PATH='server/validation.js';
export const EXPECTED_HASHES=Object.freeze({
 original80:'bf5faa68b8a04f454e43d31045c9bbd35aa9c9ec330ccf8cccb3380e88ceb680',
 manual100:'1ba3ba6185074ec97465e605516ced8229614346b9ce47a23e8ff588c9789570',
 transferMin3:'361d542f1613c6efde6ed2161499061ed69ef14cd5c41cd3666fae7402c46f20',
});
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const defaultRepository=resolve(projectRoot,'..','..','groundtruth-demo-study-tasks');
const reportDirectory=join(projectRoot,'submission','evaluation');
export const sha256=source=>createHash('sha256').update(source).digest('hex');
const samePath=(left,right)=>process.platform==='win32'?resolve(left).toLowerCase()===resolve(right).toLowerCase():resolve(left)===resolve(right);

/** No code may be imported until its complete bytes match the trusted fixture. */
export function trustedVariants(source){
 assert.equal(sha256(source),EXPECTED_HASHES.original80,'The pinned helper bytes do not match the trusted fixture. Nothing was executed.');
 const original80=Buffer.isBuffer(source)?source.toString('utf8'):source;
 assert.equal(original80.split('title.length > 80').length,2,'Expected one known maximum-length expression.');
 const manual100=original80.replace('title.length > 80','title.length > 100');
 assert.equal(manual100.split('title.length < 1').length,2,'Expected one known minimum-length expression.');
 const transferMin3=manual100.replace('title.length < 1','title.length < 3');
 const variants={original80,manual100,transferMin3};
 for(const [name,text] of Object.entries(variants))assert.equal(sha256(text),EXPECTED_HASHES[name],'Prescribed variant bytes changed: '+name);
 return variants;
}

/** A downloaded file is compared as data; it is never imported or executed. */
export function verifyDownloadedDraft(bytes){
 assert.ok(bytes.byteLength<=16384,'Downloaded draft exceeds the known fixture size budget. Nothing was executed.');
 const source=Buffer.from(bytes).toString('utf8').replaceAll('\r\n','\n');
 const normalizedSha256=sha256(source);
 assert.equal(normalizedSha256,EXPECTED_HASHES.manual100,'Downloaded draft differs from the exact trusted 80→100 fixture change. It will not be executed.');
 return {rawSha256:sha256(bytes),normalizedSha256,matches:'manual100',normalization:'CRLF → LF only',executedDownloadedFile:false};
}

// Expected outputs are explicit requirement vectors, independent of taskTitle's
// implementation. Each tuple is input plus expected original/manual/transfer.
const reject=(id,label,value)=>[id,label,value,null,null,null];
const acceptAll=(id,label,value)=>[id,label,value,value,value,value];
const acceptRevised=(id,label,value)=>[id,label,value,null,value,value];
const titles=[
 reject('blank-empty','Empty string',''),reject('blank-spaces','Spaces only','   '),reject('blank-whitespace','Tabs and line breaks only','\t\r\n '),
 ['trim-normal','Spaces around Learn SQL','  Learn SQL  ','Learn SQL','Learn SQL','Learn SQL'],
 ['minimum-1','One character','x','x','x',null],['minimum-2','Two characters','ab','ab','ab',null],acceptAll('minimum-3','Three characters','abc'),
 ['trim-minimum-2','Padded two-character title','  ab  ','ab','ab',null],['trim-minimum-3','Padded three-character title','\t abc \n','abc','abc','abc'],acceptAll('internal-space','Internal space is retained','a b'),
 ...[79,80].map(length=>acceptAll('length-'+length,length+' ASCII characters','x'.repeat(length))),
 ...[81,99,100].map(length=>acceptRevised('length-'+length,length+' ASCII characters','x'.repeat(length))),reject('length-101','101 ASCII characters','x'.repeat(101)),
 ['trim-100','100 characters with surrounding whitespace','\t'+'x'.repeat(100)+' \n',null,'x'.repeat(100),'x'.repeat(100)],reject('trim-101','101 characters with surrounding whitespace',' '+'x'.repeat(101)+' '),
 reject('non-string-number','Number 123',123),reject('non-string-zero','Number zero',0),reject('non-string-null','Null',null),reject('non-string-undefined','Undefined',undefined),
 reject('non-string-object','Object',{title:'Learn SQL'}),reject('non-string-array','Array',['Learn SQL']),reject('non-string-boolean','Boolean',true),
 acceptAll('punctuation','Punctuation is plain title text',"Learn SQL'); DROP TABLE tasks; --"),
 acceptRevised('utf16-100','50 emoji = 100 UTF-16 code units','😀'.repeat(50)),reject('utf16-102','51 emoji = 102 UTF-16 code units','😀'.repeat(51)),
];
const ids=[
 ['id-one','Positive ID 1','1',1],['id-normal','Positive ID 42','42',42],['id-safe-max','Maximum safe integer','9007199254740991',Number.MAX_SAFE_INTEGER],
 ...[['zero','0'],['negative','-1'],['decimal','1.5'],['alphabetic','abc'],['unsafe','9007199254740992'],['leading-zero','01'],['exponent','1e2'],['padded',' 1 '],['empty','']].map(([name,value])=>['id-'+name,'Invalid ID: '+name,value,null]),
];
const compact=value=>value===null?'rejected':typeof value==='number'?String(value):'accepted · '+value.length+' code unit'+(value.length===1?'':'s');

export function evaluateHelper(helper,variant){
 const maximum=variant==='original80'?80:100,minimum=variant==='transferMin3'?3:1;
 const expectationIndex={original80:3,manual100:4,transferMin3:5}[variant];
 assert.ok(expectationIndex,'Unknown trusted fixture variant.');
 const checks=[];
 for(const vector of titles){
  const [id,input,value]=vector,expected=vector[expectationIndex];
  const actual=helper.taskTitle(value);
  assert.equal(actual,expected,variant+' failed '+id);
  checks.push({id,group:'taskTitle',input,expected:compact(expected),actual:compact(actual),passed:true});
 }
 for(const [id,input,value,expected] of ids){
  const actual=helper.taskId(value);assert.equal(actual,expected,variant+' changed ID behavior: '+id);
  checks.push({id,group:'taskId regression',input,expected:compact(expected),actual:compact(actual),passed:true});
 }
 return {variant,minimum,maximum,sha256:EXPECTED_HASHES[variant],titleChecks:titles.length,idRegressionChecks:ids.length,passed:checks.length,checks};
}

async function pinnedSource(repository){
 const repo=resolve(repository);
 const revision=execFileSync('git',['--no-optional-locks','-C',repo,'rev-parse','--verify',PINNED_COMMIT+'^{commit}'],{encoding:'utf8',maxBuffer:16384}).trim();
 assert.equal(revision,PINNED_COMMIT,'The required fixture commit is unavailable.');
 const source=execFileSync('git',['--no-optional-locks','-C',repo,'show','--no-textconv',PINNED_COMMIT+':'+PINNED_PATH],{maxBuffer:16384});
 const license=execFileSync('git',['--no-optional-locks','-C',repo,'show','--no-textconv',PINNED_COMMIT+':LICENSE'],{encoding:'utf8',maxBuffer:16384});
 assert.match(license,/^MIT License\n/,'The pinned fixture license changed.');
 return {source,licenseSha256:sha256(license)};
}

function markdownReport(report){
 const [original,manual,transfer]=report.results;
 const rows=original.checks.filter(check=>check.group==='taskTitle').map(check=>{
  const other=report.results.slice(1).map(result=>result.checks.find(item=>item.id===check.id).actual);
  return '| '+check.input+' | '+[check.actual,...other].join(' | ')+' |';
 });
 return '# Trusted fixture: independent title-change validation\n\n'+
  'Status: **'+report.passed+' / '+report.total+' checks passed**. This is an operator-authored fixture check. It contains no learner outcomes, educator validation or live model calls.\n\n'+
  'The source is the owned MIT Study Tasks repository at commit `'+PINNED_COMMIT+'`, file `'+PINNED_PATH+'`. Its SHA-256 is `'+EXPECTED_HASHES.original80+'`. The command reads that exact Git object, verifies its complete hash, and imports only that helper and two prescribed hash-checked variants in a separate temporary folder under ignored `.sites-runtime`. It does not run the task app, its server, its database tests or arbitrary imported/user code. The temporary folder was removed after validation.\n\n'+
  'The manual variation changes only `title.length > 80` to `title.length > 100`. The separate transfer requirement changes the revised helper’s minimum from 1 to 3 after trimming while retaining the 100 limit. Both changes are authored fixtures, not learner submissions.\n\n'+
  '| Variant | Title checks | Unchanged ID regression checks | Total passed |\n| --- | ---: | ---: | ---: |\n'+
  [original,manual,transfer].map(result=>'| '+result.variant+' · '+result.minimum+'–'+result.maximum+' | '+result.titleChecks+' | '+result.idRegressionChecks+' | '+result.passed+' |').join('\n')+'\n\n'+
  '| Input | Original 1–80 | Manual 1–100 | Fresh transfer 3–100 |\n| --- | --- | --- | --- |\n'+rows.join('\n')+'\n\n'+
  'The unchanged `taskId` helper also passed positive-ID and maximum-safe-integer checks, rejecting zero, negative, decimal, alphabetic, unsafe, leading-zero, exponent, padded and empty IDs in all three variants. Title lengths follow JavaScript UTF-16 `.length`, rather than a count of displayed graphemes. Punctuation was supplied only as input text to `taskTitle`; no SQL or snippets were executed.\n\n'+
  (report.downloadedDraft?'Downloaded draft: its complete content matched the trusted manual variant after CRLF-to-LF normalization. Raw SHA-256: `'+report.downloadedDraft.rawSha256+'`. The downloaded file was **not executed**. The executable manual fixture was independently constructed from pinned trusted source.\n\n':'No downloaded cloud draft was supplied for this run. This report validates the prescribed fixture change, not a specific production draft.\n\n')+
  'Reproduce from the prototype directory:\n\n```powershell\nnode scripts/verify-trusted-title-change.mjs\nnode --test scripts/trusted-title-proof.test.mjs\n```\n\n'+
  'To check a later downloaded `validation.js` as data:\n\n```powershell\nnode scripts/verify-trusted-title-change.mjs --draft "C:\\path\\to\\validation.js"\n```\n\n'+
  'Use `--repo "C:\\path\\to\\groundtruth-demo-study-tasks"` if the owned fixture checkout is elsewhere. An unknown source hash or a downloaded file with any other code change is refused before execution.\n\n'+
  'Scope: this proves the listed input/output behavior for one known helper and its prescribed changes. It does not validate arbitrary repository changes, the whole app, production deployment, learner understanding, transfer by a learner, authorship or external AI use.\n';
}

export async function runTrustedFixtureProof({repository=defaultRepository,draft=null,writeReport=true}={}){
 const pinned=await pinnedSource(repository),variants=trustedVariants(pinned.source);
 let downloadedDraft=null;
 if(draft){const resolvedDraft=resolve(draft);downloadedDraft={path:resolvedDraft,...verifyDownloadedDraft(await readFile(resolvedDraft))};}
 const runtimeRoot=join(await realpath(projectRoot),'.sites-runtime');
 await mkdir(runtimeRoot,{recursive:true});
 const realRuntime=await realpath(runtimeRoot);
 assert.ok(samePath(realRuntime,runtimeRoot),'The temporary runtime directory must not redirect outside the workspace.');
 const temporary=await mkdtemp(join(realRuntime,'trusted-title-proof-'));
 const results=[];
 try{
  for(const [variant,source] of Object.entries(variants)){
   const modulePath=join(temporary,variant+'.mjs');await writeFile(modulePath,source,'utf8');
   assert.equal(sha256(await readFile(modulePath)),EXPECTED_HASHES[variant],'The staged trusted helper changed before execution.');
   results.push(evaluateHelper(await import(pathToFileURL(modulePath).href),variant));
  }
 }finally{
  // Verify the resolved absolute deletion target before recursive cleanup.
  const target=await realpath(temporary);
  assert.ok(samePath(dirname(target),realRuntime)&&basename(target).startsWith('trusted-title-proof-'),'Refusing cleanup outside the intended temporary directory.');
  await rm(target,{recursive:true,force:true});
 }
 const report={schema:'groundtruth.trusted-title-proof.v1',generatedAt:new Date().toISOString(),kind:'operator-authored trusted-fixture validation',fixture:{repository:resolve(repository),commit:PINNED_COMMIT,path:PINNED_PATH,license:'MIT',licenseSha256:pinned.licenseSha256,sourceSha256:EXPECTED_HASHES.original80},scope:{humanLearners:0,educatorValidation:false,liveModelCalls:0,executedArbitraryCode:false,executedDownloadedFile:false,wholeAppTest:false,temporaryDirectoryRemoved:true},downloadedDraft,results,passed:results.reduce((sum,result)=>sum+result.passed,0),total:results.reduce((sum,result)=>sum+result.checks.length,0)};
 if(writeReport){await mkdir(reportDirectory,{recursive:true});await writeFile(join(reportDirectory,'trusted-title-boundary-proof.json'),JSON.stringify(report,null,2)+'\n');await writeFile(join(reportDirectory,'trusted-title-boundary-proof.md'),markdownReport(report));}
 return report;
}

async function cli(){
 const args=process.argv.slice(2),options={};
 for(let index=0;index<args.length;index++){
  if(args[index]==='--help'){process.stdout.write('Usage: node scripts/verify-trusted-title-change.mjs [--repo PATH] [--draft validation.js] [--no-write]\nOnly exact trusted fixture code is executed. Downloaded drafts are compared as data.\n');return;}
  if(args[index]==='--no-write'){options.writeReport=false;continue;}
  if(args[index]==='--repo'||args[index]==='--draft'){assert.ok(args[index+1]&&!args[index+1].startsWith('--'),'A path is required after '+args[index]);options[args[index]==='--repo'?'repository':'draft']=args[++index];continue;}
  throw new Error('Unknown option: '+args[index]);
 }
 const report=await runTrustedFixtureProof(options);
 process.stdout.write(JSON.stringify({passed:report.passed,total:report.total,variants:report.results.map(result=>({name:result.variant,titleChecks:result.titleChecks,idRegressionChecks:result.idRegressionChecks,passed:result.passed})),downloadedDraftChecked:!!report.downloadedDraft,temporaryDirectoryRemoved:true,report:options.writeReport===false?null:'submission/evaluation/trusted-title-boundary-proof.md'},null,2)+'\n');
}
if(process.argv[1]&&samePath(process.argv[1],fileURLToPath(import.meta.url)))await cli().catch(error=>{process.stderr.write('Trusted fixture verification failed: '+error.message+'\n');process.exitCode=1;});
