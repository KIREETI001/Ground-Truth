import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../lib/server/http.ts';
import { generateStudy } from '../lib/study/model.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';
import type { ProjectSnapshot } from '../lib/learner/types.ts';
import { createTestDb } from './sqlite-d1.ts';

const snapshot:ProjectSnapshot={repository:'example/tasks',url:'https://github.com/example/tasks',commit:'a'.repeat(40),analysedAt:'2026-11-05T00:00:00Z',files:[{path:'src/tasks.ts',language:'TypeScript',excerpt:'export const normalize = (title: string) => title.trim();'}],signals:[],suggestedMissionId:null,warnings:['Selected source only.']};
const hint={feedback:'What happens to the surrounding spaces?',nextStep:'Read the returned expression in src/tasks.ts.',evidenceIds:['f0-l0']};
const result=(content:unknown=hint,extra:Record<string,unknown>={})=>Response.json({model:'muse-spark-1.3',choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}],...extra});
const configured=(db:RuntimeConfig['DB']):RuntimeConfig=>({DB:db,MODEL_CALLS_ENABLED:'true',MODEL_API_KEY:'test-secret-never-logged',MODEL_ID:'muse-spark-1.3',PILOT_ID:'test'});

test('Meta study generation uses the official structured-output API and privacy-preserving identifiers',async()=>{
 const d=createTestDb();try{
  let seen=0;
  const generated=await generateStudy({...configured(d.db),LOCAL_LLM_ENABLED:'true'},'private-username','hint',{question:'Where is normalization applied?'},snapshot,async(url,init)=>{
   seen++;
   assert.equal(String(url),'https://api.meta.ai/v1/chat/completions');
   assert.equal(init?.redirect,'manual');
   assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-secret-never-logged');
   const request=JSON.parse(String(init?.body));
   assert.equal(request.model,'muse-spark-1.3');
   assert.equal(request.messages[0].role,'developer');
   assert.match(request.messages[0].content,/UNTRUSTED DATA/);
   assert.match(request.messages[1].content,/src\/tasks.ts/);
   assert.equal(request.response_format.type,'json_schema');
   assert.equal(request.response_format.json_schema.strict,true);
   assert.deepEqual(request.response_format.json_schema.schema.properties.evidenceIds.items.enum,['f0-l0']);
   assert.match(request.safety_identifier,/^[a-f0-9]{64}$/);
   assert.ok(!JSON.stringify(request).includes('private-username'));
   assert.equal(request.prompt_cache_key,'groundtruth.study.v2.hint');
   assert.equal(request.reasoning_effort,'low');
   assert.equal(request.max_completion_tokens,4096);
   assert.equal(request.max_tokens,undefined);
   assert.equal(request.temperature,undefined);
   assert.equal(request.chat_template_kwargs,undefined);
   assert.ok(init?.signal);
   return result();
  });
  assert.equal(seen,1);
  assert.deepEqual(generated,{feedback:hint.feedback,nextStep:hint.nextStep,evidence:[{path:'src/tasks.ts',quote:snapshot.files[0].excerpt}]});
 }finally{d.close();}
});

test('Meta configuration rejects untrusted endpoints, unsupported models and absent keys without local fallback',async()=>{
 const d=createTestDb();try{
  for(const change of [{MODEL_BASE_URL:'https://other.test/v1'},{MODEL_BASE_URL:'https://api.meta.ai/v1?key=secret'},{MODEL_ID:'muse-spark-1.3-contributor'},{MODEL_API_KEY:''},{MODEL_API_KEY:'bad\nkey'},{MODEL_CALLS_ENABLED:'yes'}]){
   let calls=0;
   await assert.rejects(()=>generateStudy({...configured(d.db),LOCAL_LLM_ENABLED:'true',...change},'student','hint',{},snapshot,async()=>{calls++;return result();}));
   assert.equal(calls,0);
  }
 }finally{d.close();}
});

test('Meta failures, redirects, refusals, truncation and incorrect citations fail closed and release the account lease',async()=>{
 const d=createTestDb();try{
  const responses=[()=>new Response('sensitive provider body',{status:401}),()=>new Response(null,{status:307,headers:{location:'https://other.test'}}),()=>result(hint,{model:'unexpected-model'}),()=>result(hint,{choices:[{finish_reason:'length',message:{content:JSON.stringify(hint)}}]}),()=>result(hint,{choices:[{finish_reason:'stop',message:{refusal:'No',content:JSON.stringify(hint)}}]}),()=>result({...hint,evidenceIds:['invented']}),()=>result({...hint,feedback:'Here is the answer.'}),()=>new Response('x'.repeat(65000)),()=>{throw new Error('network error reflecting test-secret-never-logged');}];
  for(const response of responses){
   await assert.rejects(()=>generateStudy(configured(d.db),'student','hint',{},snapshot,async()=>response()),error=>{
    assert.ok(error instanceof ApiError);assert.equal(error.code,'META_MODEL_UNAVAILABLE');
    assert.ok(!String(error).includes('test-secret-never-logged'));
    assert.ok(!String(error).includes('sensitive provider body'));
    return true;
   });
   assert.equal((await d.db.prepare('SELECT count(*) AS n FROM coach_locks').first<{n:number}>())?.n,0);
  }
 }finally{d.close();}
});

test('Meta rate limiting returns a retryable user message, never retries or calls another provider',async()=>{
 const d=createTestDb();try{
  let calls=0;
  await assert.rejects(()=>generateStudy({...configured(d.db),LOCAL_LLM_ENABLED:'true'},'student','hint',{},snapshot,async()=>{calls++;return new Response('rate limited',{status:429});}),{code:'META_RATE_LIMIT'});
  assert.equal(calls,1);
  assert.equal((await d.db.prepare('SELECT count(*) AS n FROM coach_locks').first<{n:number}>())?.n,0);
 }finally{d.close();}
});

test('Meta daily quota is reserved atomically before networking',async()=>{
 const d=createTestDb();try{
  await d.db.prepare('INSERT INTO study_usage VALUES(?,?,60)').bind('student',new Date().toISOString().slice(0,10)).run();
  let calls=0;
  await assert.rejects(()=>generateStudy(configured(d.db),'student','hint',{},snapshot,async()=>{calls++;return result();}),{code:'DAILY_MODEL_LIMIT'});
  assert.equal(calls,0);
  assert.equal((await d.db.prepare('SELECT count(*) AS n FROM coach_locks').first<{n:number}>())?.n,0);
 }finally{d.close();}
});

test('cloud inference locks only the requesting account rather than every learner',async()=>{
 const d=createTestDb();try{
  let release!:()=>void,entered!:()=>void;
  const waiting=new Promise<void>(resolve=>{release=resolve;});
  const ready=new Promise<void>(resolve=>{entered=resolve;});
  const first=generateStudy(configured(d.db),'first','hint',{},snapshot,async()=>{entered();await waiting;return result();});
  await ready;
  await assert.rejects(()=>generateStudy(configured(d.db),'first','hint',{},snapshot,async()=>result()),{code:'MODEL_BUSY'});
  await generateStudy(configured(d.db),'second','hint',{},snapshot,async()=>result());
  release();await first;
  assert.equal((await d.db.prepare('SELECT count(*) AS n FROM coach_locks').first<{n:number}>())?.n,0);
 }finally{d.close();}
});
