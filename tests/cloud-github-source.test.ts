import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readCloudFiles } from '../lib/cloud/github-source.ts';
const commit='a'.repeat(40),treeSha='b'.repeat(40),path='src/tasks.ts',source='export const normalize = (title: string) => title.trim();\n';
const blobSha=createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0'+source).digest('hex');
const input={url:'https://github.com/example/tasks',commit,paths:[path]};
function remote(options:{mode?:string;body?:string;sha?:string;private?:boolean;redirect?:boolean}={}):typeof fetch{return async(url,init)=>{
 assert.match(String(url),/^https:\/\/api.github.com\/repos\/example\/tasks(?:\/|$)/);assert.equal(init?.redirect,'manual');assert.equal(new Headers(init?.headers).get('Authorization'),null);
 if(options.redirect)return new Response(null,{status:302,headers:{location:'https://unexpected.test'}});
 if(String(url).endsWith('/git/commits/'+commit))return Response.json({sha:commit,tree:{sha:treeSha}});
 if(String(url).includes('/git/trees/'))return Response.json({sha:treeSha,truncated:false,tree:[{path,type:'blob',mode:options.mode||'100644',sha:options.sha||blobSha,size:Buffer.byteLength(source)}]});
 if(String(url).includes('/git/blobs/'))return new Response(options.body??source);
 return Response.json({private:options.private??false,full_name:'example/tasks'});
};}

test('cloud source reads complete verified public blobs at the pinned commit',async()=>{assert.deepEqual(await readCloudFiles(input,remote()),{files:[{path,source}]});});
test('cloud source refuses traversal, credentials in URL, hidden paths and unpinned references before networking',async()=>{
 for(const patch of [{url:'https://github.com/example/tasks?secret=x'},{url:'http://127.0.0.1/private'},{commit:'main'},{paths:['../secret.ts']},{paths:['.env.ts']},{paths:[path,path]},{paths:['node_modules/index.js']}]){
  let calls=0;await assert.rejects(()=>readCloudFiles({...input,...patch},async()=>{calls++;return new Response();}));assert.equal(calls,0);
 }
});
test('cloud source rejects private repositories, redirects, symlinks, submodules and changed blobs',async()=>{
 for(const options of [{private:true},{redirect:true},{mode:'120000'},{mode:'160000'},{body:source.replace('trim','TRIM')},{sha:'c'.repeat(40)}])await assert.rejects(()=>readCloudFiles(input,remote(options)));
});
test('cloud source has a hard body budget rather than trusting content-length',async()=>{await assert.rejects(()=>readCloudFiles(input,remote({body:'x'.repeat(12289)})),/read budget/);});
