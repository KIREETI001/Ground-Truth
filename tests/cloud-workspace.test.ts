import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cloudWorkspace,cloudDiff } from '../lib/cloud/workspace.ts';
import type { WorkingCopy,ChangeProposal } from '../lib/study/workspace.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';
import { createTestDb } from './sqlite-d1.ts';

const project='b'.repeat(8)+'-'+('b'.repeat(4)+'-').repeat(3)+'b'.repeat(12),commit='a'.repeat(40),path='src/tasks.ts';
const original='export const normalize = (title: string) => title.trim();\n';
const revised=original.replace('title.trim()','title.trim().toLowerCase()');
const snapshot={repository:'example/tasks',url:'https://github.com/example/tasks',commit,files:[{path,language:'TypeScript',excerpt:original}],warnings:[]};
const identity={ownerId:'student',projectId:project};
const create={...identity,url:snapshot.url,commit,paths:[path],ownershipConfirmed:true};
const reader=async()=>({files:[{path,source:original}]});
async function setup(){const d=createTestDb();d.sqlite.exec(readFileSync(new URL('../lib/cloud/workspace-schema.sql',import.meta.url),'utf8'));const config:RuntimeConfig={DB:d.db,PILOT_ID:'pilot'};await d.db.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(project,'student','pilot','Learn normalization',JSON.stringify(snapshot),'2026-11-05T00:00:00Z','2099-01-01T00:00:00Z').run();return {d,config};}

test('cloud draft preserves complete selected source, requires explicit approval and retains backup on idempotent apply',async()=>{
 const {d,config}=await setup();try{
  const copy=await cloudWorkspace(config,'create',create,reader) as WorkingCopy;
  assert.equal(copy.files[0].source,original);assert.match(copy.files[0].hash,/^[a-f0-9]{64}$/);assert.equal(copy.commit,commit);assert.equal(copy.diff,'');
  const proposal=await cloudWorkspace(config,'propose',{...identity,path,source:revised,baseHash:copy.files[0].hash,mode:'manual-declared'},reader) as ChangeProposal;
  assert.equal((await cloudWorkspace(config,'read',identity,reader) as WorkingCopy).files[0].source,original);
  assert.match(proposal.diff,/-export const normalize/);assert.match(proposal.diff,/\+export const normalize/);
  await assert.rejects(()=>cloudWorkspace(config,'apply',{...identity,proposalId:proposal.id},reader));
  const applied=await cloudWorkspace(config,'apply',{...identity,proposalId:proposal.id,confirmed:true},reader) as ChangeProposal;
  assert.ok(applied.appliedAt);
  assert.deepEqual(await cloudWorkspace(config,'apply',{...identity,proposalId:proposal.id,confirmed:true},reader),applied);
  const after=await cloudWorkspace(config,'read',identity,reader) as WorkingCopy;assert.equal(after.files[0].source,revised);
  const row=await d.db.prepare('SELECT state_json FROM cloud_workspaces WHERE project_id=?').bind(project).first<{state_json:string}>();
  const saved=JSON.parse(row!.state_json);assert.equal(saved.backups.length,1);assert.equal(saved.backups[0].source,original);assert.equal(saved.files[0].original,original);
  // Reopening a draft cannot reset applied work to the imported source.
  assert.equal((await cloudWorkspace(config,'create',create,reader) as WorkingCopy).files[0].source,revised);
 }finally{d.close();}
});

test('cloud draft denies other users, other pilots, expired paths and public-reference edits',async()=>{
 const {d,config}=await setup();try{
  await cloudWorkspace(config,'create',create,reader);
  await assert.rejects(()=>cloudWorkspace(config,'read',{...identity,ownerId:'another'},reader),/not found/);
  await assert.rejects(()=>cloudWorkspace({...config,PILOT_ID:'another'},'read',identity,reader),/not found/);
  await d.db.prepare('UPDATE study_projects SET expires_at=? WHERE id=?').bind('2000-01-01T00:00:00Z',project).run();
  await assert.rejects(()=>cloudWorkspace(config,'read',identity,reader),/not found/);
  await d.db.prepare('UPDATE study_projects SET expires_at=? WHERE id=?').bind('2099-01-01T00:00:00Z',project).run();
  await d.db.prepare('INSERT INTO study_learning_paths(project_id,purpose,area,feature_title,concepts_json,transfer_goal,map_id) VALUES(?,?,?,?,?,?,?)').bind(project,'transfer','backend','Normalize','[]','Apply elsewhere','map').run();
  await assert.rejects(()=>cloudWorkspace(config,'read',identity,reader),/read-only/);
 }finally{d.close();}
});

test('cloud proposals reject unknown paths, stale hashes, unsafe source and intervening edits',async()=>{
 const {d,config}=await setup();try{
  const copy=await cloudWorkspace(config,'create',create,reader) as WorkingCopy;
  const input={...identity,path,baseHash:copy.files[0].hash,source:revised,mode:'ai'};
  for(const patch of [{path:'../secret.ts'},{path:'src/other.ts'},{baseHash:'c'.repeat(64)},{source:'x'.repeat(12289)},{source:'binary\0data'},{mode:'auto'}])await assert.rejects(()=>cloudWorkspace(config,'propose',{...input,...patch},reader));
  const p=await cloudWorkspace(config,'propose',input,reader) as ChangeProposal;
  const other=await cloudWorkspace(config,'propose',{...input,source:original.replace('title.trim()','title.toUpperCase()')},reader) as ChangeProposal;
  await cloudWorkspace(config,'apply',{...identity,proposalId:other.id,confirmed:true},reader);
  await assert.rejects(()=>cloudWorkspace(config,'apply',{...identity,proposalId:p.id,confirmed:true},reader),/changed after/);
 }finally{d.close();}
});

test('concurrent cloud proposals use a compare-and-swap update instead of losing history',async()=>{
 const {d,config}=await setup();try{
  const copy=await cloudWorkspace(config,'create',create,reader) as WorkingCopy;
  const input={...identity,path,baseHash:copy.files[0].hash,source:revised,mode:'manual-declared'};
  const proposals=await Promise.allSettled([cloudWorkspace(config,'propose',input,reader),cloudWorkspace(config,'propose',{...input,source:revised+'\n'},reader)]);
  assert.equal(proposals.filter(p=>p.status==='fulfilled').length,1);
  assert.equal(proposals.filter(p=>p.status==='rejected').length,1);
  const row=await d.db.prepare('SELECT state_json FROM cloud_workspaces WHERE project_id=?').bind(project).first<{state_json:string}>();assert.equal(JSON.parse(row!.state_json).proposals.length,1);
 }finally{d.close();}
});

test('independent activities block cloud draft mutations while allowing source review',async()=>{
 const {d,config}=await setup();try{
  const copy=await cloudWorkspace(config,'create',create,reader) as WorkingCopy;
  await d.db.prepare('INSERT INTO study_exercises(id,project_id,prompt_json,rubric_json,status,created_at) VALUES(?,?,?,?,?,?)').bind('exercise',project,'{}','[]','independent','2026-11-05T00:00:00Z').run();
  await cloudWorkspace(config,'read',identity,reader);
  await assert.rejects(()=>cloudWorkspace(config,'propose',{...identity,path,baseHash:copy.files[0].hash,source:revised,mode:'ai'},reader),/independent/);
  await assert.rejects(()=>cloudWorkspace(config,'create',create,reader),/independent/);
 }finally{d.close();}
});

test('cloud draft initialization binds immutable source identity and refuses skipped sensitive files',async()=>{
 const {d,config}=await setup();try{
  await assert.rejects(()=>cloudWorkspace(config,'create',{...create,ownershipConfirmed:false},reader));
  for(const patch of [{commit:'c'.repeat(40)},{url:'https://github.com/other/repo'},{paths:['src/other.ts']}])await assert.rejects(()=>cloudWorkspace(config,'create',{...create,...patch},reader));
  await assert.rejects(()=>cloudWorkspace(config,'create',create,async()=>({files:[{path,source:'export const api_key = "sk_'+'live_'+'abcdefghijklmnopqrstuvwxyz123456";'}]})));
  assert.deepEqual(cloudDiff(path,original,original),{diff:'',added:0,removed:0});
 }finally{d.close();}
});
