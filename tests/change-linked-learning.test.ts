import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cloudWorkspace } from '../lib/cloud/workspace.ts';
import { buildAppliedChangeContext,resolveOwnedChangeContext,sourceHash } from '../lib/study/change-context.ts';
import { generateStudy,validateGenerated,type StudyModelOutcome } from '../lib/study/model.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';
import type { ProjectSnapshot } from '../lib/learner/types.ts';
import type { ChangeProposal,WorkingCopy } from '../lib/study/workspace.ts';
import { createTestDb } from './sqlite-d1.ts';
import { handleStudy } from '../lib/study/server.ts';
import type { StudyProject } from '../lib/study/types.ts';

const projectId='a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0',path='src/normalize.ts',commit='a'.repeat(40);
const original='export const normalize = (value: string) => value.trim();\n';
const revised='export const normalize = (value: string) => value.trim().toLowerCase();\n';
const snapshot:ProjectSnapshot={repository:'example/tasks',url:'https://github.com/example/tasks',commit,analysedAt:'2026-11-05T00:00:00Z',files:[{path,language:'TypeScript',excerpt:original}],signals:[],suggestedMissionId:null,warnings:[]};
const quiz={format:'mcq',title:'A changed normalization boundary',prompt:'What does the revised function return for an uppercase title with surrounding spaces?',kind:'trace',filePaths:[path],options:[{id:'A',text:'A lowercase title without surrounding spaces.'},{id:'B',text:'An uppercase title without surrounding spaces.'},{id:'C',text:'A lowercase title with surrounding spaces.'},{id:'D',text:'The unchanged original title.'}],correctOption:'A',answerExplanation:'PRIVATE RATIONALE: trim preserves removal of surrounding spaces while toLowerCase changes letter case.',reviewPoints:['PRIVATE REVIEW: compare the original and revised return expressions.','PRIVATE REVIEW: whitespace removal is preserved while letter case changes.']};
async function setup(){
 const d=createTestDb();d.sqlite.exec(readFileSync(new URL('../lib/cloud/workspace-schema.sql',import.meta.url),'utf8'));
 const c:RuntimeConfig={DB:d.db,PILOT_ID:'pilot',CLOUD_ENABLED:'true'};
 await c.DB.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(projectId,'student','pilot','Understand normalization boundaries',JSON.stringify(snapshot),'2026-11-05T00:00:00Z','2099-01-01T00:00:00Z').run();
 const identity={projectId,ownerId:'student'};
 const copy=await cloudWorkspace(c,'create',{...identity,url:snapshot.url,commit,paths:[path],ownershipConfirmed:true},async()=>({files:[{path,source:original}]})) as WorkingCopy;
 const proposal=await cloudWorkspace(c,'propose',{...identity,path,baseHash:copy.files[0].hash,source:revised,mode:'ai',summary:'Normalize letter case while retaining whitespace trimming.'}) as ChangeProposal;
 return {d,c,identity,copy,proposal};
}

test('change-linked context reconstructs the exact owned applied edit and preserves before/after hashes',async()=>{
 const {d,c,identity,proposal}=await setup();try{
  await assert.rejects(()=>resolveOwnedChangeContext(c,{...identity,workingPath:path,proposalId:proposal.id}),{code:'CHANGE_NOT_APPLIED'});
  await cloudWorkspace(c,'apply',{...identity,proposalId:proposal.id,confirmed:true});
  const context=await resolveOwnedChangeContext(c,{...identity,workingPath:path,proposalId:proposal.id});
  assert.equal(context.originalSource,original);assert.equal(context.source,revised);
  assert.equal(context.baseHash,await sourceHash(original));assert.equal(context.hash,await sourceHash(revised));
  assert.equal(context.changeProposalId,proposal.id);assert.equal(context.mode,'ai');assert.ok(context.appliedAt);
  assert.match(context.diff,/-export const normalize.*value.trim\(\);/);assert.match(context.diff,/\+export const normalize.*toLowerCase/);
 }finally{d.close();}
});

test('change linkage rejects another owner, another pilot, wrong selected path and intervening source edits',async()=>{
 const {d,c,identity,proposal}=await setup();try{
  await cloudWorkspace(c,'apply',{...identity,proposalId:proposal.id,confirmed:true});
  const input={...identity,workingPath:path,proposalId:proposal.id};
  await assert.rejects(()=>resolveOwnedChangeContext(c,{...input,ownerId:'someone-else'}),{code:'PROJECT_NOT_FOUND'});
  await assert.rejects(()=>resolveOwnedChangeContext({...c,PILOT_ID:'other'},input),{code:'PROJECT_NOT_FOUND'});
  await assert.rejects(()=>resolveOwnedChangeContext(c,{...input,workingPath:'src/private.ts'}),{code:'SOURCE_NOT_IN_WORKFLOW'});
  const row=await c.DB.prepare('SELECT state_json FROM cloud_workspaces WHERE project_id=?').bind(projectId).first<{state_json:string}>();
  const state=JSON.parse(row!.state_json);state.files[0].source=revised+'// later edit\n';state.files[0].hash=await sourceHash(state.files[0].source);
  await c.DB.prepare('UPDATE cloud_workspaces SET state_json=? WHERE project_id=?').bind(JSON.stringify(state),projectId).run();
  await assert.rejects(()=>resolveOwnedChangeContext(c,input),{code:'CHANGE_CONTEXT_STALE'});
 }finally{d.close();}
});

test('applied change constructor rejects stored hash corruption and regenerates a stale stored diff',async()=>{
 const file={path,source:revised,hash:await sourceHash(revised)};
 const proposal:ChangeProposal={id:'proposal',path,source:revised,original,baseHash:await sourceHash(original),resultHash:file.hash,diff:'invented diff',mode:'manual-declared',summary:'Manual edit',added:1,removed:1,appliedAt:'2026-11-05T00:00:00Z'};
 assert.match((await buildAppliedChangeContext(proposal,file,'Draft')).diff,/toLowerCase/);
 await assert.rejects(()=>buildAppliedChangeContext({...proposal,baseHash:'b'.repeat(64)},file,'Draft'),{code:'CHANGE_CONTEXT_STALE'});
});

test('exercise validation permits only multiple choice or small code and rejects answer-key leakage',()=>{
 const {format,options,correctOption,answerExplanation,...open}=quiz;void format;void options;void correctOption;void answerExplanation;
 assert.throws(()=>validateGenerated('exercise',open,snapshot),/multiple-choice or short coding/);
 assert.throws(()=>validateGenerated('exercise',{...quiz,prompt:quiz.prompt+' Correct answer: A'},snapshot),/Private answer keys/);
 assert.throws(()=>validateGenerated('exercise',{...quiz,title:'Correct answer is A'},snapshot),/Private answer keys/);
 assert.throws(()=>validateGenerated('exercise',{...open,format:'coding',prompt:'Write an explanation of your adaptation plan.'},snapshot),/small code answer/);
 assert.throws(()=>validateGenerated('exercise',{...open,format:'coding',prompt:'Explain this behavior.'},snapshot),/small code answer/);
 assert.throws(()=>validateGenerated('exercise',{...open,format:'coding',prompt:'Write a title normalizer. Show its expected output array.'},snapshot),/one standalone implementation/);
 assert.throws(()=>validateGenerated('exercise',{...open,format:'coding',prompt:'Write a title normalizer. Include calls showing the three cases.'},snapshot),/one standalone implementation/);
 assert.equal((validateGenerated('exercise',{...open,format:'coding',prompt:'Write a function that trims and lowercases one title in 3–5 lines.'},snapshot) as unknown as {format:string}).format,'coding');
});

test('a blank-editor coding exercise remains valid when replayed from its saved representation',()=>{
 const coding={title:'Normalize one title',prompt:'Write a function that returns a trimmed title or null for a blank input in 3–5 lines.',kind:'trace',filePaths:[path],format:'coding',reviewPoints:['Trim before checking length.','Reject a blank title.']};
 const generated=validateGenerated('exercise',coding,snapshot);
 const replay=validateGenerated('exercise',JSON.parse(JSON.stringify(generated)),snapshot);
 assert.deepEqual(replay,generated);assert.equal((replay as {starterCode?:string}).starterCode,'');
});

test('generation receipts expose counts only and the model contract includes the actual change and private rationale',async()=>{
 const d=createTestDb();try{
  const receipts:StudyModelOutcome[]=[];
  await generateStudy({DB:d.db,MODEL_CALLS_ENABLED:'true',MODEL_API_KEY:'test-key'},'private-owner','exercise',{questionFormat:'mcq',phase:'practice',changeContext:{originalSource:original,source:revised,diff:'-trim\n+trim.toLowerCase',changeProposalId:'private-proposal'}},snapshot,async(_url,init)=>{
   const request=JSON.parse(String(init?.body));assert.match(request.messages[0].content,/ACTUAL changed input\/output boundary/);assert.match(request.messages[0].content,/private reviewPoints/);assert.match(request.messages[1].content,/originalSource/);assert.ok(JSON.parse(request.messages[1].content).sourceEvidence.length);
   return Response.json({model:'muse-spark-1.3',usage:{prompt_tokens:100,completion_tokens:40,prompt_tokens_details:{cached_tokens:60}},choices:[{finish_reason:'stop',message:{content:JSON.stringify(quiz)}}]});
  },outcome=>{receipts.push(outcome);});
  assert.equal(receipts.length,1);assert.equal(receipts[0].status,'success');assert.equal(receipts[0].inputTokens,100);assert.equal(receipts[0].outputTokens,40);assert.equal(receipts[0].cachedInputTokens,60);
  assert.ok(!JSON.stringify(receipts).includes('private-'));assert.ok(!JSON.stringify(receipts).includes('normalize'));assert.ok(!JSON.stringify(receipts).includes('PRIVATE'));
  await assert.rejects(()=>generateStudy({DB:d.db,MODEL_CALLS_ENABLED:'true',MODEL_API_KEY:'test-key'},'student','exercise',{},snapshot,async()=>new Response('',{status:429}),()=>{throw new Error('sink failed');}),{code:'META_RATE_LIMIT'});
 }finally{d.close();}
});

test('the server keeps a change-linked practice and fresh transfer tied to an immutable independent answer',async()=>{
 const {d,c,identity,proposal}=await setup();try{
  await cloudWorkspace(c,'apply',{...identity,proposalId:proposal.id,confirmed:true});
  const request=(action:string,body:unknown)=>new Request('https://groundtruth.test/api/study/projects/'+projectId+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const base={workingPath:path,changeProposalId:proposal.id,questionFormat:'mcq'};
  let calls=0;
  const generated=await handleStudy(request('exercise',base),c,'student',{...base,phase:'practice'},async(task,data,selected)=>{
   calls++;assert.equal(task,'exercise');const context=data as {phase:string;changeContext:{originalSource:string;source:string;diff:string}};
   assert.equal(context.phase,'practice');assert.equal(context.changeContext.originalSource,original);assert.equal(context.changeContext.source,revised);assert.match(context.changeContext.diff,/toLowerCase/);
   assert.equal(selected.files[0].excerpt,revised);return quiz;
  });
  const practice=await generated!.json() as StudyProject,exercise=practice.exercises[0];
  assert.equal(exercise.prompt.phase,'practice');assert.equal(exercise.prompt.sourceContext?.changeProposalId,proposal.id);assert.equal(exercise.prompt.sourceContext?.originalSource,original);
  assert.ok(!JSON.stringify(exercise.prompt).includes('PRIVATE'));assert.equal('correctOption' in exercise.prompt,false);assert.equal('reviewPoints' in exercise.prompt,false);assert.equal(exercise.mcqResult,null);
  await assert.rejects(()=>handleStudy(request('exercise',{}),c,'student',{...base,phase:'transfer',parentExerciseId:exercise.id},async()=>{calls++;return quiz;}));
  assert.equal(calls,1);
  await handleStudy(request('independent',{}),c,'student',{exerciseId:exercise.id});
  await assert.rejects(()=>handleStudy(request('exercise',{}),c,'student',{...base,phase:'transfer',parentExerciseId:exercise.id},async()=>{calls++;return quiz;}),{code:'INDEPENDENT_MODE'});
  assert.equal(calls,1);
  await handleStudy(request('submit',{}),c,'student',{exerciseId:exercise.id,optionId:'A'});
  const committed=await c.DB.prepare('SELECT answer FROM study_exercises WHERE id=?').bind(exercise.id).first<{answer:string}>();
  await assert.rejects(()=>handleStudy(request('exercise',{}),c,'student',{phase:'transfer',parentExerciseId:exercise.id,questionFormat:'mcq'},async()=>quiz),{code:'TRANSFER_CHANGE_MISMATCH'});
  await assert.rejects(()=>handleStudy(request('exercise',{}),c,'student',{...base,phase:'transfer',parentExerciseId:exercise.id},async()=>({...quiz,kind:'change-plan',prompt:'  '+quiz.prompt+'  '})),{code:'TRANSFER_CHALLENGE_NOT_FRESH'});
  const variation={...quiz,title:'A fresh tag boundary',prompt:'For a separate tag normalizer, which result preserves whitespace trimming and lowercase output?',kind:'change-plan'};
  const transferred=await handleStudy(request('exercise',{}),c,'student',{...base,phase:'transfer',parentExerciseId:exercise.id},async(_task,data)=>{
   const context=data as {phase:string;parentExerciseId:string;changeContext:{source:string}};assert.equal(context.phase,'transfer');assert.equal(context.parentExerciseId,exercise.id);assert.equal(context.changeContext.source,revised);return variation;
  });
  const transferProject=await transferred!.json() as StudyProject,transfer=transferProject.exercises[0];
  assert.equal(transfer.prompt.phase,'transfer');assert.equal(transfer.prompt.parentExerciseId,exercise.id);assert.equal(transfer.prompt.sourceContext?.changeProposalId,proposal.id);
  assert.notEqual(transfer.prompt.prompt,exercise.prompt.prompt);assert.ok(!JSON.stringify(transfer.prompt).includes('PRIVATE'));assert.equal(transferProject.masteryIndex,0);
  await assert.rejects(()=>handleStudy(request('submit',{}),c,'student',{exerciseId:exercise.id,optionId:'B'}),{code:'EXERCISE_STATE_CHANGED'});
  assert.deepEqual(await c.DB.prepare('SELECT answer FROM study_exercises WHERE id=?').bind(exercise.id).first(),committed);
 }finally{d.close();}
});

test('hints use the latest owned question capture, preserve ordinary source, and omit committed answers and private rubrics',async()=>{
 const d=createTestDb();try{
  const c:RuntimeConfig={DB:d.db,PILOT_ID:'pilot'},sourcePath='server/validation.js';
  const before='export function taskTitle(title) { if (title.length < 1 || title.length > 80) return null; return title; }';
  const after=before.replace('> 80','> 100'),base={...snapshot,files:[{path:sourcePath,language:'JavaScript',excerpt:before}]};
  await c.DB.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(projectId,'student','pilot','Understand the accepted title boundary',JSON.stringify(base),'2026-11-05T00:00:00Z','2099-01-01T00:00:00Z').run();
  const prompt={format:'coding',title:'Changed title boundary',prompt:'Implement one title check that accepts a trimmed length from 1 through 100.',phase:'practice',kind:'trace',filePaths:[sourcePath],sourceContext:{path:sourcePath,source:after,hash:await sourceHash(after),originalSource:before,baseHash:await sourceHash(before),changeProposalId:'owned-applied-proposal',label:'Captured draft'}};
  const rubric={reviewPoints:['PRIVATE_REVIEW_CRITERION'],mcq:{correctOption:'C',answerExplanation:'PRIVATE_KEY_RATIONALE'}};
  await c.DB.prepare("INSERT INTO study_exercises(id,project_id,prompt_json,rubric_json,status,created_at) VALUES(?,?,?,?,'guided',?)").bind('captured-question',projectId,JSON.stringify(prompt),JSON.stringify(rubric),'2026-11-05T00:00:01Z').run();
  const request=()=>new Request('https://groundtruth.test/api/study/projects/'+projectId+'/hint',{method:'POST'});
  let calls=0;
  const hint=async(expectedSource:string,expectedTitle:string)=>handleStudy(request(),c,'student',{question:'Which boundary should I inspect?'},async(task,data,selected)=>{
   calls++;assert.equal(task,'hint');assert.equal(selected.files[0].excerpt,expectedSource);
   const context=data as {exercise:{title:string;prompt:string;phase?:string}};assert.equal(context.exercise.title,expectedTitle);
   const encoded=JSON.stringify(data);assert.ok(!encoded.includes('PRIVATE_'));assert.ok(!encoded.includes('COMMITTED_ANSWER'));assert.ok(!encoded.includes('correctOption'));assert.ok(!encoded.includes('reviewPoints'));assert.ok(!encoded.includes('sourceContext'));
   return {feedback:'How does the comparison treat the endpoint?',nextStep:'Inspect the selected title comparison.',evidence:[{path:sourcePath,quote:expectedSource.includes('> 100')?'title.length > 100':'title.length > 80'}]};
  });
  await hint(after,prompt.title);
  await c.DB.prepare("UPDATE study_exercises SET status='submitted',answer=?,started_at=?,submitted_at=? WHERE id=?").bind('COMMITTED_ANSWER_MUST_STAY_PRIVATE','2026-11-05T00:00:02Z','2026-11-05T00:00:03Z','captured-question').run();
  await hint(after,prompt.title);
  const ordinary={format:'coding',title:'Original source check',prompt:'Implement the original source check.',kind:'trace',filePaths:[sourcePath]};
  await c.DB.prepare("INSERT INTO study_exercises(id,project_id,prompt_json,rubric_json,status,created_at) VALUES(?,?,?,?,'guided',?)").bind('ordinary-question',projectId,JSON.stringify(ordinary),'[]','2026-11-05T00:00:04Z').run();
  await hint(before,ordinary.title);
  await c.DB.prepare('UPDATE study_exercises SET ended_at=? WHERE id=?').bind('2026-11-05T00:00:05Z','ordinary-question').run();
  await hint(after,prompt.title);
  await assert.rejects(()=>handleStudy(request(),c,'someone-else',{question:'Read another learner source.'},async()=>{calls++;return {};}),{code:'PROJECT_NOT_FOUND'});assert.equal(calls,4);
 }finally{d.close();}
});
