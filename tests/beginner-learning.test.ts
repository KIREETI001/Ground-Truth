import test from 'node:test';
import assert from 'node:assert/strict';
import { readStudySource,contextFromFullSource } from '../lib/study/source.ts';
import { validateGenerated,generateStudy } from '../lib/study/model.ts';
import { shuffleMCQ } from '../lib/study/mcq.ts';
import { handleStudy } from '../lib/study/server.ts';
import { createTestDb } from './sqlite-d1.ts';
import type { ProjectSnapshot } from '../lib/learner/types.ts';
import type { StudyProject } from '../lib/study/types.ts';
const snapshot:ProjectSnapshot={repository:'test/repo',url:'https://github.com/test/repo',commit:'a'.repeat(40),analysedAt:'2026-11-04T00:00:00.000Z',files:[{path:'db/schema.sql',language:'SQL',excerpt:'CREATE TABLE products (id INT PRIMARY KEY);'}],signals:[],suggestedMissionId:null,warnings:[]};
const quiz={title:'Find the table key',prompt:'Which column identifies a product row in this table?',kind:'trace',filePaths:['db/schema.sql'],reviewPoints:['Locate the primary key.','Use the source rather than a naming guess.'],format:'mcq' as const,options:[{id:'A',text:'The id column.'},{id:'B',text:'Every column together.'},{id:'C',text:'The table name itself.'},{id:'D',text:'No column identifies a row.'}],correctOption:'A',answerExplanation:'PRIVATE EXPLANATION: PRIMARY KEY is declared on id.'};
const overview={summary:'This schema stores products. Each product row has its own identifier.',filePaths:['db/schema.sql'],checks:[],glossary:[{term:'Table',meaning:'A collection of rows with the same columns.'},{term:'Primary key',meaning:'A value used to distinguish one row from another.'}],flow:[{title:'Read the table',description:'Find the products table definition.',filePaths:['db/schema.sql']},{title:'Find its identifier',description:'Read which column declares the primary key.',filePaths:['db/schema.sql']}]};
const req=(path:string,body?:unknown)=>new Request('http://127.0.0.1/api/study/'+path,{method:body?'POST':'GET'});
async function seed(db:D1Database){await db.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind('p','student','pilot','Understand how products are stored.',JSON.stringify(snapshot),'2026-11-04T00:00:00.000Z','2099-01-01T00:00:00.000Z').run();}
test('complete source retains content after the old 1,500-character boundary',async()=>{
 const full='-- source documentation\n'.repeat(100)+'CREATE TABLE stock (product_id INT, size INT, quantity INT);\n';
 const d=createTestDb();try{const result=await readStudySource({DB:d.db},snapshot,'db/schema.sql',async()=>({files:[{path:'db/schema.sql',source:full}]}));assert.equal(result.source,full);assert.ok(result.source.endsWith('quantity INT);\n'));assert.equal(result.complete,true);assert.ok(result.bytes>1500);
 let reads=0;await assert.rejects(()=>readStudySource({DB:d.db},snapshot,'../outside.sql',async()=>{reads++;return {files:[]};}),/outside the saved workflow/);assert.equal(reads,0);
 }finally{d.close();}
});
test('full-source viewing still rejects sensitive text and oversized files',async()=>{
 const d=createTestDb();try{
 await assert.rejects(()=>readStudySource({DB:d.db},snapshot,'db/schema.sql',async()=>({files:[{path:'db/schema.sql',source:'const secret = "sensitive-credential-value-123456789";'}]})),/safely readable/);
 await assert.rejects(()=>readStudySource({DB:d.db},snapshot,'db/schema.sql',async()=>({files:[{path:'db/schema.sql',source:'x'.repeat(12289)}]})),/read budget/);
 }finally{d.close();}
});
test('model context is bounded separately from the complete displayed source',()=>{
 const full='SELECT * FROM products;\n'.repeat(300);const result=contextFromFullSource(snapshot,[{path:'db/schema.sql',source:full,complete:true,bytes:full.length,lines:301,commit:snapshot.commit}],2000);assert.ok(result.files[0].excerpt.length<=2000);assert.ok(result.files[0].excerpt.endsWith('\n'));assert.match(result.warnings[0],/complete file remains available/);assert.ok(full.length>result.files[0].excerpt.length);
});
test('beginner visuals reject invented source paths and MCQs reject duplicate options',()=>{
 assert.deepEqual(validateGenerated('analyse',overview,snapshot),overview);
 assert.throws(()=>validateGenerated('analyse',{...overview,flow:[{...overview.flow[0],filePaths:['not-here.ts']},overview.flow[1]]},snapshot),/Unknown visual source/);
 const cleanQuiz=validateGenerated('exercise',{...quiz,prompt:quiz.prompt+'\n\nA. First\nB. Second\nC. Third\nD. Fourth'},snapshot) as typeof quiz;assert.equal(cleanQuiz.prompt,quiz.prompt);
 assert.throws(()=>validateGenerated('exercise',{...quiz,options:[quiz.options[0],quiz.options[0],quiz.options[2],quiz.options[3]]},snapshot),/MCQ options/);
 const shuffled=shuffleMCQ(quiz,()=>0);assert.equal(shuffled.options.find(o=>o.id===shuffled.correctOption)?.text,'The id column.');
});
test('MCQ keys remain private until immutable submission, and invalid selections cannot commit',async()=>{
 const d=createTestDb();try{await seed(d.db);const c={DB:d.db,PILOT_ID:'pilot'};
 const created=await (await handleStudy(req('projects/p/exercise',{}),c,'student',{questionFormat:'mcq'},async()=>quiz))!.json() as StudyProject;
 const exercise=created.exercises[0];assert.equal(exercise.prompt.format,'mcq');assert.equal(exercise.mcqResult,null);assert.equal('correctOption' in exercise.prompt,false);assert.equal('answerExplanation' in exercise.prompt,false);assert.ok(!JSON.stringify(created).includes('PRIVATE EXPLANATION'));
 await handleStudy(req('projects/p/independent',{}),c,'student',{exerciseId:exercise.id});
 await assert.rejects(()=>handleStudy(req('projects/p/submit',{}),c,'student',{exerciseId:exercise.id,optionId:'Z'}),/Choose one/);
 const correct=exercise.prompt.options!.find(o=>o.text==='The id column.')!;
 const submitted=await (await handleStudy(req('projects/p/submit',{}),c,'student',{exerciseId:exercise.id,optionId:correct.id,answer:''}))!.json() as StudyProject;
 assert.equal(submitted.exercises[0].mcqResult?.matchesSuggestedAnswer,true);assert.match(submitted.exercises[0].mcqResult?.explanation||'',/PRIVATE EXPLANATION/);assert.equal(submitted.stats.independentAttempts,1);assert.equal(submitted.masteryIndex,0);
 await assert.rejects(()=>handleStudy(req('projects/p/submit',{}),c,'student',{exerciseId:exercise.id,optionId:'D'}),/EXERCISE_STATE_CHANGED/);
 }finally{d.close();}
});
test('source routes enforce saved-project ownership before reading a file',async()=>{
 const d=createTestDb();try{await seed(d.db);const c={DB:d.db,PILOT_ID:'pilot'};
 await assert.rejects(()=>handleStudy(req('projects/p/source?path=db%2Fschema.sql'),c,'another-student',{}),/PROJECT_NOT_FOUND/);
 await assert.rejects(()=>handleStudy(req('projects/p/source?path=private.sql'),c,'student',{}),/outside the saved workflow/);
 }finally{d.close();}
});
test('local generation requests beginner overview fields and the MCQ format without preset fallback',async()=>{
 const d=createTestDb();try{
 const result=await generateStudy({DB:d.db,LOCAL_LLM_ENABLED:'true'},'student','analyse',{},snapshot,async(_url,init)=>{const request=JSON.parse(String(init?.body));assert.ok(request.response_format.json_schema.schema.required.includes('flow'));assert.ok(request.response_format.json_schema.schema.required.includes('glossary'));assert.equal(request.response_format.json_schema.schema.properties.checks.maxItems,0);assert.ok(request.response_format.json_schema.schema.properties.checks.items.properties.referenceId.enum.length>0);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(overview)}}]});});assert.deepEqual(result,overview);
 const mcq=await generateStudy({DB:d.db,LOCAL_LLM_ENABLED:'true'},'student','exercise',{questionFormat:'mcq'},snapshot,async(_url,init)=>{const request=JSON.parse(String(init?.body));assert.equal(request.response_format.json_schema.schema.properties.format.const,'mcq');assert.equal(request.response_format.json_schema.schema.properties.options.minItems,4);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(quiz)}}]});});assert.deepEqual(mcq,quiz);
 }finally{d.close();}
});


test('practice defaults to MCQ, rejects open-ended requests, and saves short code without executing it',async()=>{
 const d=createTestDb();try{await seed(d.db);const c={DB:d.db,PILOT_ID:'pilot'};
 await assert.rejects(()=>handleStudy(req('projects/p/exercise',{}),c,'student',{questionFormat:'explanation'},async()=>quiz),/QUESTION_FORMAT_INVALID/);
 await assert.rejects(()=>handleStudy(req('projects/p/exercise',{}),c,'student',{},async()=>({title:'Essay',prompt:'Explain this',kind:'trace',filePaths:['db/schema.sql'],reviewPoints:['A','B']})),/multiple-choice/);
 const code={title:'Select product identifiers',prompt:'Complete the SQL query to select only product identifiers.',kind:'trace',filePaths:['db/schema.sql'],reviewPoints:['Select id.','Read from products.'],format:'coding',starterCode:'SELECT /* TODO */ FROM products;'};
 assert.equal((validateGenerated('exercise',code,snapshot) as typeof code).format,'coding');
 const cleaned=validateGenerated('exercise',{...code,starterCode:'// Example: SELECT id FROM products;\n// TODO: choose a column\nSELECT /* TODO */ FROM products;'},snapshot) as typeof code;assert.ok(!cleaned.starterCode.includes('Example:'));assert.ok(cleaned.starterCode.includes('TODO'));
 assert.throws(()=>validateGenerated('exercise',{...code,starterCode:'SELECT 1;\n'.repeat(17)},snapshot),/scaffold/);
 const result=await (await handleStudy(req('projects/p/exercise',{}),c,'student',{questionFormat:'coding'},async()=>code))!.json() as StudyProject;
 assert.equal(result.exercises[0].prompt.starterCode,code.starterCode);
 const id=result.exercises[0].id;await handleStudy(req('projects/p/independent',{}),c,'student',{exerciseId:id});
 const saved=await (await handleStudy(req('projects/p/submit',{}),c,'student',{exerciseId:id,answer:'SELECT id FROM products;'}))!.json() as StudyProject;
 assert.equal(saved.exercises[0].answer,'SELECT id FROM products;');assert.equal(saved.exercises[0].mcqResult,null);
 }finally{d.close();}
});


test('hint session queries are recorded before inference, including a failed local request',async()=>{
 const d=createTestDb();try{await seed(d.db);const c={DB:d.db,PILOT_ID:'pilot'};
 await assert.rejects(()=>handleStudy(req('projects/p/hint',{}),c,'student',{question:'Where should I inspect the table key?',sessionId:'rehearsal-session'},async()=>{throw new Error('model offline');}),/model offline/);
 const logged=await d.db.prepare("SELECT detail_json FROM study_events WHERE project_id='p' AND kind='guidance-query'").first<{detail_json:string}>();
 assert.deepEqual(JSON.parse(logged!.detail_json),{question:'Where should I inspect the table key?',sessionId:'rehearsal-session'});
 }finally{d.close();}
});
