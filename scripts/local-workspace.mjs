import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { authOperation } from './local-auth-crypto.mjs';
const execute=promisify(execFile);
const ROOT=process.env.GROUNDTRUTH_WORKSPACES||path.join(os.homedir(),'.groundtruth-workspaces');
const locks=new Set();
const hash=s=>createHash('sha256').update(s).digest('hex');
const uuid=/^[a-f0-9-]{36}$/i;
function fault(message,status=400){return Object.assign(new Error(message),{status});}
function identity(input){
 if(typeof input.ownerId!=='string'||!input.ownerId||input.ownerId.length>200||!uuid.test(input.projectId))throw fault('Invalid workspace identity');
 return path.join(ROOT,hash(input.ownerId).slice(0,24),input.projectId);
}
function validPath(value){if(typeof value!=='string'||value.length>250||value.includes('\\')||value.split('/').some(s=>!s||s==='.'||s==='..'||s.startsWith('.'))||!/\.(?:[cm]?js|jsx|ts|tsx|py|java|cs|cpp|cc|c|h|hpp|sql|css|html|vue|svelte)$/.test(value))throw fault('Only selected ordinary source files can be edited');return value;}
async function git(args,cwd,allowDiff=false){
 const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('GIT_'))delete env[key];
 Object.assign(env,{GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:path.join(ROOT,'empty-config'),GIT_TERMINAL_PROMPT:'0',GIT_LFS_SKIP_SMUDGE:'1'});
 try{return (await execute('git',['-c','core.hooksPath='+path.join(ROOT,'no-hooks'),'-c','protocol.allow=never','-c','protocol.https.allow=always','-c','credential.helper=',...args],{cwd,env,timeout:90000,maxBuffer:1024*1024,windowsHide:true})).stdout;}
 catch(e){if(allowDiff&&e.code===1)return e.stdout;throw fault('Git operation failed or exceeded its time limit',502);}
}
async function registry(input){const folder=identity(input);let data;try{data=JSON.parse(await fs.readFile(path.join(folder,'workspace.json'),'utf8'));}catch{throw fault('Create the local working copy first',404);}return {folder,repo:path.join(folder,'repo'),data};}
async function selectedFile(ws,name){
 validPath(name);if(!ws.data.paths.includes(name))throw fault('This file was not selected for editing',403);
 const file=path.resolve(ws.repo,name),real=await fs.realpath(file),relative=path.relative(await fs.realpath(ws.repo),real);
 if(relative.startsWith('..')||path.isAbsolute(relative)||(await fs.lstat(file)).isSymbolicLink())throw fault('Source path leaves the managed working copy',403);
 const stat=await fs.stat(real);if(!stat.isFile()||stat.size>12288)throw fault('Editable files must be regular files up to 12 KiB');
 const source=await fs.readFile(real,'utf8');if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(source))throw fault('Binary source is not supported');
 return {path:name,file:real,source,hash:hash(source)};
}
export async function workspaceAction(action,input){
 const folder=identity(input);
 if(locks.has(folder))throw fault('A workspace operation is already running',409);
 locks.add(folder);
 try{
 if(action==='create'){
  if(input.ownershipConfirmed!==true)throw fault('Permission to modify a local copy must be confirmed');
  if(typeof input.url!=='string'||!/^https:\/\/github\.com\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\/?$/.test(input.url)||!String(input.commit).match(/^[a-f0-9]{40}$/i))throw fault('Invalid pinned GitHub repository');
  if(!Array.isArray(input.paths)||!input.paths.length||input.paths.length>3)throw fault('Choose up to three source files');
  input.paths.forEach(validPath);
  await fs.mkdir(ROOT,{recursive:true});await fs.writeFile(path.join(ROOT,'empty-config'),'');await fs.mkdir(path.join(ROOT,'no-hooks'),{recursive:true});
  await fs.mkdir(folder,{recursive:true});
  try{await fs.access(path.join(folder,'workspace.json'));}catch{
   const repo=path.join(folder,'repo');await fs.mkdir(repo,{recursive:true});
   await git(['init','--quiet'],repo);
   await git(['fetch','--quiet','--depth=1','--no-tags',input.url,input.commit],repo);
   await git(['checkout','--quiet','--detach','FETCH_HEAD'],repo);
   const actual=(await git(['rev-parse','HEAD'],repo)).trim();if(actual!==input.commit)throw fault('Commit identity changed',409);
   await fs.writeFile(path.join(folder,'workspace.json'),JSON.stringify({url:input.url,commit:input.commit,paths:input.paths}));
  }
 }
 const ws=await registry(input);
 if(action==='read'||action==='create'){
  const files=await Promise.all(ws.data.paths.map(name=>selectedFile(ws,name)));
  return {folder:ws.repo,commit:ws.data.commit,files:files.map(({path,source,hash})=>({path,source,hash})),diff:await git(['diff','--no-ext-diff','--no-textconv','--',...ws.data.paths],ws.repo)};
 }
 if(action==='propose'){
  const before=await selectedFile(ws,input.path);
  if(typeof input.baseHash!=='string'||before.hash!==input.baseHash)throw fault('The file changed. Reload it before proposing an edit',409);
  if(typeof input.source!=='string'||Buffer.byteLength(input.source)>12288||input.source.includes('\0'))throw fault('Proposed source is too large or invalid');
  if(!['ai','manual-declared'].includes(input.mode))throw fault('Unknown change mode');
  const id=randomUUID(),dir=path.join(folder,'proposals');await fs.mkdir(dir,{recursive:true});
  const oldPath=path.join(dir,id+'.before'),newPath=path.join(dir,id+'.after');
  await fs.writeFile(oldPath,before.source);await fs.writeFile(newPath,input.source);
  let diff=await git(['diff','--no-index','--no-ext-diff','--no-textconv','--',oldPath,newPath],ws.repo,true);
  if(!diff.trim())throw fault('The proposed text has no changes');
  diff=diff.replace(/^diff --git .*$/m,'diff --git a/'+input.path+' b/'+input.path).replace(/^--- .*$/m,'--- a/'+input.path).replace(/^\+\+\+ .*$/m,'+++ b/'+input.path);
  const added=diff.split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')).length,removed=diff.split('\n').filter(l=>l.startsWith('-')&&!l.startsWith('---')).length;
  const proposal={id,path:input.path,baseHash:before.hash,resultHash:hash(input.source),source:input.source,original:before.source,diff,mode:input.mode,summary:typeof input.summary==='string'?input.summary.slice(0,600):'Declared manual edit',added,removed,createdAt:new Date().toISOString()};
  await fs.writeFile(path.join(dir,id+'.json'),JSON.stringify(proposal),{flag:'wx'});
  return proposal;
 }
 if(action==='apply'){
  if(!uuid.test(input.proposalId)||input.confirmed!==true)throw fault('Review and confirm a proposal before applying');
  let proposal;try{proposal=JSON.parse(await fs.readFile(path.join(folder,'proposals',input.proposalId+'.json'),'utf8'));}catch{throw fault('Proposal not found',404);}
  const current=await selectedFile(ws,proposal.path);
  if(current.hash===proposal.resultHash){if(!proposal.appliedAt){proposal.appliedAt=new Date().toISOString();await fs.writeFile(path.join(folder,'proposals',proposal.id+'.json'),JSON.stringify(proposal));}return proposal;}
  if(proposal.appliedAt)throw fault('This proposal was already applied; the file has since changed',409);
  if(current.hash!==proposal.baseHash)throw fault('The file changed after this diff was prepared. Reload and review a new proposal',409);
  const backup=path.join(folder,'backups');await fs.mkdir(backup,{recursive:true});try{await fs.writeFile(path.join(backup,proposal.id),current.source,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||hash(await fs.readFile(path.join(backup,proposal.id),'utf8'))!==proposal.baseHash)throw e;}
  const temp=current.file+'.groundtruth-'+randomUUID();await fs.writeFile(temp,proposal.source,{flag:'wx'});await fs.rename(temp,current.file);
  proposal.appliedAt=new Date().toISOString();await fs.writeFile(path.join(folder,'proposals',proposal.id+'.json'),JSON.stringify(proposal));
  return proposal;
 }
 throw fault('Unknown workspace operation',404);
 }finally{locks.delete(folder);}
}
export function startWorkspaceServer(token,{port=8082}={}){
 if(typeof token!=='string'||token.length<32)throw new Error('A private workspace token is required');
 const expected=Buffer.from('Bearer '+token);
 return http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  const supplied=Buffer.from(req.headers.authorization||'');
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){res.writeHead(401);res.end(JSON.stringify({error:'Authentication required'}));return;}
  if(req.method!=='POST'||req.headers.origin){res.writeHead(403);res.end(JSON.stringify({error:'Only authenticated backend requests are accepted'}));return;}
  try{
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)throw fault('Request too large',413);chunks.push(chunk);}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   const action=req.url?.slice(1);
   const result=action?.startsWith('auth-')?await authOperation(action,body):action?.startsWith('repository-')?await repositoryAction(action,body):await workspaceAction(action,body);res.end(JSON.stringify(result));
  }catch(e){res.writeHead(e.status||500);res.end(JSON.stringify({error:e.status?e.message:'Local workspace operation failed'}));}
 }).listen(port,'127.0.0.1');
}
export async function repositoryAction(action,input){
 if(typeof input.url!=='string'||!/^https:\/\/github\.com\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\/?$/.test(input.url))throw fault('Use a plain public HTTPS GitHub repository URL');
 const url=input.url.replace(/\/$/,''),folder=path.join(ROOT,'.repository-cache',hash(url)),repo=path.join(folder,'git');
 if(locks.has(folder))throw fault('This repository is being read. Retry shortly',409);locks.add(folder);
 try{
  if(action==='repository-tree'){
   const ref=input.ref===undefined?'HEAD':input.ref;
   if(typeof ref!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._\/-]{0,119}$/.test(ref)||ref.includes('..'))throw fault('Choose a plain branch name');
   await fs.mkdir(repo,{recursive:true});await fs.mkdir(path.join(ROOT,'no-hooks'),{recursive:true});await fs.writeFile(path.join(ROOT,'empty-config'),'');
   const metadata=path.join(folder,hash(ref)+'.json');let cached;
   try{cached=JSON.parse(await fs.readFile(metadata,'utf8'));}catch{/* Fetch on first use. */}
   let commit=cached?.commit;
   if(!commit||Date.now()-cached.at>86400000){
    await git(['init','--bare','--quiet'],repo);
    await git(['fetch','--quiet','--no-tags','--depth=1',url,ref],repo);
    commit=(await git(['rev-parse','FETCH_HEAD'],repo)).trim();
    if(!/^[a-f0-9]{40}$/.test(commit))throw fault('Invalid public Git snapshot',502);
    await fs.writeFile(metadata,JSON.stringify({commit,at:Date.now()}));
   }
   const text=await git(['-c','core.quotepath=false','ls-tree','-r','-l','--full-tree',commit],repo);
   const entries=text.trim().split('\n').flatMap(line=>{const m=line.match(/^(100644|100755) blob ([a-f0-9]{40})\s+(\d+)\t(.+)$/);return m?[{path:m[4],sha:m[2],size:Number(m[3]),mode:m[1]}]:[];});
   // Return only ordinary supported source metadata; no hidden/dependency paths.
   const supported=entries.filter(f=>f.size>0&&f.size<=12288&&/\.(?:[cm]?js|jsx|ts|tsx|py|java|cs|cpp|cc|c|h|hpp|sql|css|html|vue|svelte)$/.test(f.path)&&!f.path.split('/').some(p=>p.startsWith('.')||['node_modules','vendor','dist','build','coverage','generated','target','venv','__pycache__'].includes(p)));
   return {url,repository:url.slice('https://github.com/'.length),commit,files:supported.slice(0,400).map(({path,size})=>({path,size})),truncated:supported.length>400};
  }
  if(action==='repository-files'){
   if(typeof input.commit!=='string'||!/^[a-f0-9]{40}$/.test(input.commit)||!Array.isArray(input.paths)||input.paths.length<1||input.paths.length>3)throw fault('Map a pinned repository and choose a bounded workflow first');
   // Older API imports may not have a local cache yet. Fetch their exact pinned commit.
   try{await git(['cat-file','-e',input.commit+'^{commit}'],repo);}catch{await fs.mkdir(repo,{recursive:true});await fs.mkdir(path.join(ROOT,'no-hooks'),{recursive:true});await fs.writeFile(path.join(ROOT,'empty-config'),'');await git(['init','--bare','--quiet'],repo);await git(['fetch','--quiet','--no-tags','--depth=1',url,input.commit],repo);}
   let total=0;const files=[];
   for(const name of input.paths){validPath(name);const entry=await git(['ls-tree',input.commit,'--',name],repo);if(!/^(100644|100755) blob /.test(entry))throw fault('Only ordinary source blobs can be read');const spec=input.commit+':'+name,size=Number((await git(['cat-file','-s',spec],repo)).trim());if(!Number.isFinite(size)||size<1||size>12288||total+size>32768)throw fault('Workflow source exceeds the local read budget');total+=size;files.push({path:name,source:await git(['show',spec],repo)});}
   return {files};
  }
  throw fault('Unknown repository operation',404);
 }finally{locks.delete(folder);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const key=await fs.readFile(new URL('../.sites-runtime/workspace-key.txt',import.meta.url),'utf8');
 startWorkspaceServer(key.trim());console.log('GroundTruth local working-copy service: 127.0.0.1:8082');
}

