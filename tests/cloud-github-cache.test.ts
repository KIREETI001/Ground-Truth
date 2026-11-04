import test from 'node:test';
import assert from 'node:assert/strict';
import { cachedPublicGitHubFetch,cloudGitHubFetcher } from '../lib/cloud/github-fetch.ts';
import { readStudySources } from '../lib/study/source.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';
import type { ProjectSnapshot } from '../lib/learner/types.ts';

test('cloud cache decorates only credential-free public GitHub GETs and preserves timeout/redirect controls',async()=>{
 const signal=new AbortController().signal;const response=new Response('public source');
 let received:Parameters<typeof fetch>[1];
 const network:typeof fetch=async(_input,init)=>{received=init;return response;};
 assert.equal(await cachedPublicGitHubFetch(network)('https://api.github.com/repos/example/tasks/git/blobs/'+'a'.repeat(40),{method:'GET',redirect:'manual',credentials:'omit',signal}),response);
 assert.equal(received?.cache,'force-cache');assert.deepEqual(received?.next,{revalidate:300});assert.equal(received?.signal,signal);assert.equal(received?.redirect,'manual');assert.equal(received?.credentials,'omit');
});

test('cache never decorates Meta requests, credential-bearing requests or GitHub writes',async()=>{
 for(const [url,init] of [
  ['https://api.meta.ai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer private'}}],
  ['https://api.github.com/repos/example/tasks',{headers:{Authorization:'Bearer private'}}],
  ['https://api.github.com/repos/example/tasks',{headers:{Cookie:'private'}}],
  ['https://api.github.com/repos/example/tasks/git/blobs',{method:'POST'}],
  ['https://example.test/public',{method:'GET'}],
 ] as [string,RequestInit][]){
  let received:RequestInit|undefined;
  await cachedPublicGitHubFetch(async(_input,options)=>{received=options;return new Response();})(url,init);
  assert.equal(received,init);assert.equal(received?.cache,undefined);
 }
});

test('cloud cache preserves injected fetchers and leaves the local runtime untouched',()=>{
 const injected:typeof fetch=async()=>new Response();
 assert.equal(cloudGitHubFetcher({CLOUD_ENABLED:'true'},injected),injected);
 assert.equal(cloudGitHubFetcher({CLOUD_ENABLED:'false'}),undefined);
});

const snapshot:ProjectSnapshot={repository:'example/tasks',url:'https://github.com/example/tasks',commit:'a'.repeat(40),analysedAt:'',files:[{path:'src/a.ts',language:'TypeScript',excerpt:'export const a = 1;'},{path:'src/b.ts',language:'TypeScript',excerpt:'export const b = 2;'}],signals:[],suggestedMissionId:null,warnings:[]};

test('inference source refresh reads all selected files in one bounded pinned-source operation',async()=>{
 let calls=0;
 const sources=await readStudySources({} as RuntimeConfig,snapshot,undefined,async(input)=>{
  calls++;assert.deepEqual(input,{url:snapshot.url,commit:snapshot.commit,paths:['src/a.ts','src/b.ts']});
  return {files:snapshot.files.map(file=>({path:file.path,source:file.excerpt+'\n// Full source beyond the excerpt.'}))};
 });
 assert.equal(calls,1);assert.equal(sources.length,2);assert.ok(sources.every(file=>file.complete&&file.commit===snapshot.commit));assert.match(sources[1].source,/Full source/);
});

test('batch source reads refuse mismatched order, unknown paths and partially skipped unsafe source',async()=>{
 const config={} as RuntimeConfig;
 await assert.rejects(()=>readStudySources(config,snapshot,['src/unknown.ts'],async()=>({files:[]})),/outside/);
 await assert.rejects(()=>readStudySources(config,snapshot,undefined,async()=>({files:snapshot.files.toReversed().map(file=>({path:file.path,source:file.excerpt}))})),error=>(error as {code?:string}).code==='SOURCE_UNAVAILABLE');
 await assert.rejects(()=>readStudySources(config,snapshot,undefined,async()=>({files:[{path:'src/a.ts',source:'export const a = 1;'},{path:'src/b.ts',source:'const api_key = "sk_'+'live_'+'abcdefghijklmnopqrstuvwxyz123456";'}]})),error=>(error as {code?:string}).code==='PROJECT_UNSAFE_SOURCE');
});
