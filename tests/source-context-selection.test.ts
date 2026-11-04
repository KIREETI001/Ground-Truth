import test from 'node:test';
import assert from 'node:assert/strict';
import { contextFromFullSource,selectSourceWindow,type CompleteSource } from '../lib/study/source.ts';
import { sourceEvidence,validateGenerated } from '../lib/study/model.ts';
import type { ProjectSnapshot } from '../lib/learner/types.ts';

const commit='a'.repeat(40);
const snapshot:ProjectSnapshot={repository:'example/boundaries',url:'https://github.com/example/boundaries',commit,analysedAt:'2026-11-05T00:00:00Z',files:[{path:'src/config.ts',language:'TypeScript',excerpt:'export const version = 1;'},{path:'src/normalize.ts',language:'TypeScript',excerpt:'export const normalize = (value: string) => value.trim();'},{path:'tests/normalize.ts',language:'TypeScript',excerpt:'assert.equal(normalize(" x "), "x");'}],signals:[],suggestedMissionId:null,warnings:[]};
const complete=(path:string,source:string):CompleteSource=>({path,source,complete:true,commit,bytes:Buffer.byteLength(source),lines:source.split('\n').length});

test('focused source windows reach a later boundary and retain exact source substrings within the shared budget',()=>{
 const header='// License and setup notes with no implementation details.\n'.repeat(180);
 const source=header+'export function normalizeTaskTitle(value: string) {\n  if (!value.trim()) throw new Error("Empty task title");\n  return value.trim().toLowerCase();\n}\n'+'// unrelated trailing comments\n'.repeat(100);
 const files=[complete('src/config.ts','export const version = 1;\n'),complete('src/normalize.ts',source),complete('tests/normalize.ts','assert.equal(normalize(" x "), "x");\n')];
 const selected=contextFromFullSource(snapshot,files,1100,'normalizeTaskTitle empty task title boundary');
 assert.ok(selected.files.reduce((sum,file)=>sum+file.excerpt.length,0)<=1100);
 assert.match(selected.files[1].excerpt,/if \(!value.trim\(\)\)/);
 selected.files.forEach((file,index)=>assert.ok(files[index].source.includes(file.excerpt)));
 assert.match(selected.warnings[1],/exact source window/);
 assert.ok(!selected.files[1].excerpt.startsWith('// License'));
});

test('source evidence covers later selected files rather than allowing the first file to exhaust the manifest',()=>{
 const context={...snapshot,files:[{...snapshot.files[0],excerpt:Array.from({length:30},(_,i)=>'export const config'+i+' = '+i+';').join('\n')},snapshot.files[1],snapshot.files[2]]};
 const manifest=sourceEvidence(context);
 assert.deepEqual([...new Set(manifest.map(e=>e.path))],context.files.map(file=>file.path));
 const later=manifest.find(e=>e.path==='tests/normalize.ts')!;
 const feedback=validateGenerated('hint',{feedback:'Which surrounding spaces does this assertion check?',nextStep:'Inspect the selected normalization assertion.',evidenceIds:[later.id]},context) as {evidence:{path:string;quote:string}[]};
 assert.deepEqual(feedback.evidence,[{path:later.path,quote:later.quote}]);
 assert.throws(()=>validateGenerated('hint',{feedback:'Which assertion is shown?',nextStep:'Inspect the selected assertion.',evidence:[{path:later.path,quote:'assert.equal(invented(), true);'}]},context),/Source quote/);
});

test('window selection rejects mismatched source revisions and never exceeds a single-line budget',()=>{
 assert.throws(()=>contextFromFullSource(snapshot,[{...complete('src/config.ts','export const x = 1;'),commit:'b'.repeat(40)}]),/SOURCE_CONTEXT_INVALID/);
 const text='const long = "'+'x'.repeat(5000)+'";';
 const selected=selectSourceWindow(text,300,'long');
 assert.ok(selected.excerpt.length<=300);assert.ok(text.includes(selected.excerpt));
});
