import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createHash,randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'groundtruth-workspace-test-'));
process.env.GROUNDTRUTH_WORKSPACES=root;
const {workspaceAction,startWorkspaceServer,repositoryAction}=await import('../scripts/local-workspace.mjs');
const digest=s=>createHash('sha256').update(s).digest('hex');
after(async()=>{const resolved=path.resolve(root),prefix=path.resolve(os.tmpdir())+path.sep+'groundtruth-workspace-test-';assert.ok(resolved.startsWith(prefix));await fs.rm(resolved,{recursive:true,force:true});});
async function fixture(){
 const input={ownerId:'synthetic-owner',projectId:randomUUID()};
 const folder=path.join(root,digest(input.ownerId).slice(0,24),input.projectId),repo=path.join(folder,'repo');
 await fs.mkdir(repo,{recursive:true});await fs.writeFile(path.join(root,'empty-config'),'');
 await promisify(execFile)('git',['init','--quiet'],{cwd:repo,env:{...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:path.join(root,'empty-config')},windowsHide:true});
 const source='export const answer = 1;\n';
 await fs.writeFile(path.join(repo,'index.js'),source);
 await fs.writeFile(path.join(folder,'workspace.json'),JSON.stringify({paths:['index.js'],commit:'a'.repeat(40),url:'https://github.com/example/project'}));
 return {input,folder,repo,source};
}

test('repository mapping reuses a pinned Git cache and reads source without executing it',async()=>{
 const url='https://github.com/synthetic/cache-test',folder=path.join(root,'.repository-cache',digest(url)),repo=path.join(folder,'git');
 await fs.mkdir(path.join(repo,'server'),{recursive:true});
 const run=async args=>(await promisify(execFile)('git',args,{cwd:repo,env:{...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:path.join(root,'empty-config')},windowsHide:true})).stdout;
 await fs.writeFile(path.join(root,'empty-config'),'');await run(['init','--quiet']);
 const source='throw new Error("This imported source must never execute");\n';
 await fs.writeFile(path.join(repo,'server','api.js'),source);await fs.mkdir(path.join(repo,'node_modules'),{recursive:true});await fs.writeFile(path.join(repo,'node_modules','ignored.js'),'ignored');
 await run(['add','.']);await run(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.invalid','commit','--quiet','-m','Fixture']);
 const commit=(await run(['rev-parse','HEAD'])).trim();await fs.writeFile(path.join(folder,digest('HEAD')+'.json'),JSON.stringify({commit,at:Date.now()}));
 const tree=await repositoryAction('repository-tree',{url});assert.equal(tree.commit,commit);assert.deepEqual(tree.files.map(f=>f.path),['server/api.js']);
 const read=await repositoryAction('repository-files',{url,commit,paths:['server/api.js']});assert.equal(read.files[0].source,source);
 await assert.rejects(()=>repositoryAction('repository-files',{url,commit,paths:['../outside.js']}),/Only selected/);
 await assert.rejects(()=>repositoryAction('repository-tree',{url,ref:'../main'}),/plain branch/);
 await assert.rejects(()=>repositoryAction('repository-tree',{url:'https://evil.test/repo'}),/plain public/);
});
test('a proposal does not alter a file before approval; applied receipts are idempotent',async()=>{
 const f=await fixture();const proposal=await workspaceAction('propose',{...f.input,path:'index.js',baseHash:digest(f.source),source:'export const answer = 2;\n',mode:'manual-declared',summary:'Synthetic manual edit'});
 assert.equal(await fs.readFile(path.join(f.repo,'index.js'),'utf8'),f.source);
 assert.match(proposal.diff,/--- a\/index.js/);
 await assert.rejects(()=>workspaceAction('apply',{...f.input,proposalId:proposal.id,confirmed:false}),/Review and confirm/);
 const receipt=await workspaceAction('apply',{...f.input,proposalId:proposal.id,confirmed:true});
 assert.ok(receipt.appliedAt);assert.equal(await fs.readFile(path.join(f.repo,'index.js'),'utf8'),'export const answer = 2;\n');
 const repeated=await workspaceAction('apply',{...f.input,proposalId:proposal.id,confirmed:true});assert.equal(repeated.appliedAt,receipt.appliedAt);
 assert.equal(await fs.readFile(path.join(f.folder,'backups',proposal.id),'utf8'),f.source);
});
test('stale proposals cannot overwrite a later manual or IDE edit',async()=>{
 const f=await fixture();const proposal=await workspaceAction('propose',{...f.input,path:'index.js',baseHash:digest(f.source),source:'export const answer = 2;\n',mode:'ai',summary:'Synthetic proposal'});
 await fs.writeFile(path.join(f.repo,'index.js'),'export const answer = 3;\n');
 await assert.rejects(()=>workspaceAction('apply',{...f.input,proposalId:proposal.id,confirmed:true}),/file changed after this diff/i);
 assert.equal(await fs.readFile(path.join(f.repo,'index.js'),'utf8'),'export const answer = 3;\n');
});
test('working-copy operations reject other owners, traversal and unselected or sensitive files',async()=>{
 const f=await fixture();
 await assert.rejects(()=>workspaceAction('read',{...f.input,ownerId:'another-owner'}),/Create the local/);
 for(const name of ['../outside.js','.env','nested/../../outside.js','other.js']){
 await assert.rejects(()=>workspaceAction('propose',{...f.input,path:name,baseHash:digest(f.source),source:'changed',mode:'manual-declared'}));
 }
 await assert.rejects(()=>workspaceAction('read',{ownerId:'owner',projectId:'../../escape'}),/Invalid workspace identity/);
});
test('creating a working copy requires permission and a pinned public GitHub URL before invoking Git',async()=>{
 const input={ownerId:'o',projectId:randomUUID(),url:'file:///private',commit:'a'.repeat(40),paths:['index.js']};
 await assert.rejects(()=>workspaceAction('create',{...input,ownershipConfirmed:false}),/Permission/);
 await assert.rejects(()=>workspaceAction('create',{...input,ownershipConfirmed:true}),/Invalid pinned/);
});
test('the loopback working-copy service rejects unauthenticated and browser-origin requests',async()=>{
 const token='a'.repeat(64),server=startWorkspaceServer(token,{port:0});await once(server,'listening');
 try{const url='http://127.0.0.1:'+server.address().port+'/read';
 const anon=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(anon.status,401);
 const browser=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,Origin:'http://untrusted.test','Content-Type':'application/json'},body:'{}'});assert.equal(browser.status,403);
 const get=await fetch(url,{headers:{Authorization:'Bearer '+token}});assert.equal(get.status,403);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

