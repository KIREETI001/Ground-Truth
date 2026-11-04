import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './sqlite-d1.ts';
import { handleStudy } from '../lib/study/server.ts';
import { classifyPath,repositoryCatalogue,representativePaths,validateRepositoryMap,type RepositoryMap } from '../lib/study/repository.ts';
import type { ProjectTree,DiscoveryFetcher } from '../lib/discovery/types.ts';
import type { StudyGenerator } from '../lib/study/model.ts';
import { generateStudy } from '../lib/study/model.ts';
import { snapshotFromSources } from '../lib/discovery/github.ts';
import type { StudyProject } from '../lib/study/types.ts';
const commit='a'.repeat(40),treeSha='b'.repeat(40),repo='https://github.com/student/workflows',api='https://api.github.com/repos/student/workflows';
const sources=[{path:'server/routes.ts',source:'export function handler(request: Request) { return new Response(request.method); }'},{path:'ui/page.tsx',source:'export function Page(){ return <main>Project</main>; }'},{path:'db/schema.sql',source:'CREATE TABLE projects (id TEXT PRIMARY KEY, owner_id TEXT);'}];
const files=sources.map((s,i)=>({path:s.path,language:i===2?'SQL':'TypeScript',size:s.source.length,sha:String(i+1).repeat(40)}));
const generated={summary:'Likely request handling, interface and data workflows.',features:[{id:'requests',area:'backend',title:'Request handling',summary:'Trace the request handler and its relation to stored projects.',concepts:['Request lifecycle','Data boundaries'],filePaths:['server/routes.ts','db/schema.sql']},{id:'interface',area:'frontend',title:'Project interface',summary:'Inspect the project page.',concepts:['Components','Semantic markup'],filePaths:['ui/page.tsx']}]};
const fixture:DiscoveryFetcher=async(input)=>{const url=String(input);if(url===api)return Response.json({full_name:'student/workflows',private:false,default_branch:'main'});if(url===api+'/git/ref/heads/main')return Response.json({object:{type:'commit',sha:commit}});if(url===api+'/git/commits/'+commit)return Response.json({sha:commit,tree:{sha:treeSha}});if(url===api+'/git/trees/'+treeSha+'?recursive=1')return Response.json({sha:treeSha,truncated:false,tree:files.map(f=>({...f,type:'blob',mode:'100644'}))});const index=files.findIndex(f=>url===api+'/git/blobs/'+f.sha);if(index>=0)return new Response(sources[index].source);throw new Error('Unexpected URL '+url);};
const request=(path:string,method='POST')=>new Request('http://127.0.0.1/api/study/'+path,{method});
async function mapFor(c:Parameters<typeof handleStudy>[1],generator:StudyGenerator=async()=>generated){return await (await handleStudy(request('repository-maps'),c,'student',{url:repo,acknowledged:true},generator,fixture))!.json() as RepositoryMap;}
async function focused(c:Parameters<typeof handleStudy>[1],map:RepositoryMap,purpose='transfer'){
 return await (await handleStudy(request('projects'),c,'student',{mapId:map.id,featureId:'requests',purpose,goal:'Understand the request workflow',transferGoal:'Add a project API to my study planner.',acknowledged:true},undefined,fixture))!.json() as StudyProject;
}
test('balanced repository catalogue exposes backend and data even when UI paths dominate',()=>{
 const tree:ProjectTree={repository:'student/workflows',url:repo,commit,truncated:false,warnings:[],files:[...Array.from({length:190},(_,i)=>({path:`ui/component-${i}.tsx`,language:'TypeScript',size:100})),...files]};
 const catalogue=repositoryCatalogue(tree);
 assert.ok(catalogue.length<=48);assert.ok(catalogue.some(f=>f.path==='server/routes.ts'));assert.ok(catalogue.some(f=>f.path==='db/schema.sql'));
 const sample=representativePaths(catalogue);assert.equal(sample.length,3);assert.ok(sample.includes('server/routes.ts'));
 assert.equal(classifyPath('server/tests/routes.test.ts'),'testing');assert.equal(classifyPath('src/index.ts'),'core');
});
test('local Git source uses the same bounded sensitive-source filtering as public API imports',()=>{
 const tree={repository:'student/workflows',url:repo,commit};
 const safe=snapshotFromSources(tree,[{path:'server/api.ts',source:sources[0].source}]);assert.equal(safe.files[0].path,'server/api.ts');
 assert.throws(()=>snapshotFromSources(tree,[{path:'server/api.ts',source:'const secret = "this-is-a-sensitive-secret-value";'}]),/no safely readable source/);
 assert.throws(()=>snapshotFromSources(tree,[{path:'../outside.ts',source:'export const x=1;'}]),/read budget/);
 assert.throws(()=>snapshotFromSources(tree,[{path:'server/api.ts',source:'x'.repeat(12289)}]),/read budget/);
});
test('repository map uses actual file catalogue and representative source without a file choice',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};
 const map=await mapFor(c,async(task,data,snapshot)=>{assert.equal(task,'repository');assert.ok(snapshot.files.some(f=>f.path==='server/routes.ts'&&f.excerpt.includes('handler')));assert.ok(JSON.stringify(data).includes('ui/page.tsx'));return generated;});
 assert.equal(map.commit,commit);assert.equal(map.features[0].area,'backend');assert.equal(map.sampledPaths.length,3);
 const listed=await (await handleStudy(request('repository-maps','GET'),c,'student',{}))!.json() as {maps:RepositoryMap[]};assert.equal(listed.maps[0].id,map.id);
 const other=await (await handleStudy(request('repository-maps','GET'),c,'other',{}))!.json() as {maps:RepositoryMap[]};assert.equal(other.maps.length,0);
 }finally{d.close();}
});
test('unknown paths and duplicate workflow IDs are rejected instead of showing invented features',()=>{
 const snapshot={repository:'student/workflows',url:repo,commit,analysedAt:'',files:[{path:'server/routes.ts',language:'TypeScript',excerpt:sources[0].source},{path:'db/schema.sql',language:'SQL',excerpt:sources[2].source}],signals:[],suggestedMissionId:null,warnings:[]};
 assert.throws(()=>validateRepositoryMap(generated,snapshot),/unknown workflow source/);
 assert.throws(()=>validateRepositoryMap({...generated,features:[generated.features[0],generated.features[0]]},snapshot),/duplicate features/);
 const canonical=validateRepositoryMap({...generated,features:[{...generated.features[0],filePaths:['server/routes.ts','server/routes.ts']}]},snapshot);
 assert.deepEqual(canonical.features[0].filePaths,['server/routes.ts']);
});
test('opening an area automatically imports its pinned workflow and preserves the learning purpose',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'},map=await mapFor(c),project=await focused(c,map,'improve');
 assert.deepEqual(project.snapshot.files.map(f=>f.path),['server/routes.ts','db/schema.sql']);assert.equal(project.learningPath?.purpose,'improve');assert.equal(project.learningPath?.featureTitle,'Request handling');
 await assert.rejects(()=>handleStudy(request('projects'),c,'other',{mapId:map.id,featureId:'requests',purpose:'transfer',transferGoal:'My new API project',acknowledged:true},undefined,fixture),/Reopen or regenerate/);
 await assert.rejects(()=>handleStudy(request('projects'),c,'student',{mapId:map.id,featureId:'made-up',purpose:'improve',acknowledged:true},undefined,fixture),/WORKFLOW_NOT_IN_MAP/);
 await assert.rejects(()=>handleStudy(request('projects'),c,'student',{mapId:map.id,featureId:'requests',purpose:'improve',paths:['private.ts'],acknowledged:true},undefined,fixture));
 await handleStudy(request('projects/'+project.id,'DELETE'),c,'student',{});
 assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_learning_paths').first<{n:number}>())?.n,0);
 }finally{d.close();}
});
test('public-reference mode rejects every editing endpoint before accessing the local filesystem',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'},map=await mapFor(c),project=await focused(c,map);
 for(const action of ['workspace','working-copy','propose-manual','propose-ai','apply-change'])await assert.rejects(()=>handleStudy(request('projects/'+project.id+'/'+action,action==='working-copy'?'GET':'POST'),c,'student',{}),/public reference/);
 }finally{d.close();}
});
test('transfer challenge carries the target context, saves an adaptation question, and respects independent mode',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'},map=await mapFor(c),project=await focused(c,map);
 const result=await (await handleStudy(request('projects/'+project.id+'/exercise'),c,'student',{transferChallenge:true,questionFormat:'coding'},async(task,data)=>{assert.equal(task,'exercise');const context=data as {transferChallenge:boolean;learningPath:{transferGoal:string;purpose:string}};assert.equal(context.transferChallenge,true);assert.equal(context.learningPath.purpose,'transfer');assert.match(context.learningPath.transferGoal,/study planner/);return {format:'coding',starterCode:'// TODO: validate the task title',title:'Adapt the boundary',prompt:'Write a function that rejects empty task titles for your study planner.',kind:'change-plan',filePaths:['server/routes.ts'],reviewPoints:['Ground the adaptation in the source.','Describe an original validation plan.']};}))!.json() as StudyProject;
 assert.equal(result.exercises[0].prompt.intent,'transfer');const ex=result.exercises[0].id;
 await handleStudy(request('projects/'+project.id+'/independent'),c,'student',{exerciseId:ex});
 await assert.rejects(()=>mapFor(c),/Finish your independent answer/);
 await handleStudy(request('projects/'+project.id+'/submit'),c,'student',{exerciseId:ex,answer:'Synthetic adaptation plan: trace request methods and design explicit tests in my own project.'});
 const saved=await (await handleStudy(request('projects/'+project.id,'GET'),c,'student',{}))!.json() as StudyProject;assert.match(saved.exercises[0].answer||'',/Synthetic adaptation/);
 }finally{d.close();}
});
test('mapping requires consent and expired or cross-pilot maps cannot open learning paths',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};
 await assert.rejects(()=>handleStudy(request('repository-maps'),c,'student',{url:repo},async()=>generated,fixture),/SOURCE_CONSENT_REQUIRED/);
 const map=await mapFor(c);await assert.rejects(()=>focused({...c,PILOT_ID:'other'},map),/Reopen or regenerate/);
 await d.db.prepare("UPDATE study_repository_maps SET expires_at='2000-01-01T00:00:00.000Z'").run();await assert.rejects(()=>focused(c,map),/Reopen or regenerate/);
 }finally{d.close();}
});
test('local mapping constrains output paths to the actual catalogue during generation',async()=>{
 const d=createTestDb();try{
 const snapshot={repository:'student/workflows',url:repo,commit,analysedAt:'',files:sources.map(s=>({path:s.path,language:'TypeScript',excerpt:s.source})),signals:[],suggestedMissionId:null,warnings:[]};
 const result=await generateStudy({DB:d.db,LOCAL_LLM_ENABLED:'true'},'student','repository',{catalogue:files},snapshot,async(url,init)=>{
  assert.equal(String(url),'http://127.0.0.1:8081/v1/chat/completions');
  const body=JSON.parse(String(init?.body));
  assert.deepEqual(body.response_format.json_schema.schema.properties.features.items.properties.filePaths.items.enum,sources.map(s=>s.path));
  assert.equal(body.max_tokens,2400);
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(generated)}}]});
 });
 assert.deepEqual(result,generated);
 }finally{d.close();}
});


test('collection removal scopes repository records to the signed-in owner and pilot and cascades their paths',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'},map=await mapFor(c),project=await focused(c,map);
 await d.db.prepare("INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) SELECT 'foreign-user','other',pilot_id,goal,snapshot_json,created_at,expires_at FROM study_projects WHERE id=?").bind(project.id).run();
 await d.db.prepare("INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) SELECT 'foreign-pilot',owner_id,'other',goal,snapshot_json,created_at,expires_at FROM study_projects WHERE id=?").bind(project.id).run();
 await d.db.prepare("INSERT INTO study_repository_maps(id,owner_id,pilot_id,map_json,created_at,expires_at) SELECT 'foreign-map','other',pilot_id,map_json,created_at,expires_at FROM study_repository_maps WHERE id=?").bind(map.id).run();
 await assert.rejects(()=>handleStudy(request('collection/remove-repository'),c,null,{repository:'student/workflows'}),/AUTH_REQUIRED/);
 await assert.rejects(()=>handleStudy(request('collection/remove-repository'),c,'student',{repository:'../bad'}),/REPOSITORY_INVALID/);
 await assert.rejects(()=>handleStudy(request('collection/remove-repository','GET'),c,'student',{repository:'student/workflows'}),/METHOD_NOT_ALLOWED/);
 const result=await (await handleStudy(request('collection/remove-repository'),c,'student',{repository:'student/workflows'}))!.json() as {removedPaths:number;removedMaps:number};
 assert.deepEqual(result,{removedPaths:1,removedMaps:1});
 assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_learning_paths').first<{n:number}>())?.n,0);
 assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_projects').first<{n:number}>())?.n,2);
 assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_repository_maps').first<{n:number}>())?.n,1);
 }finally{d.close();}
});
