import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir,mkdtemp,realpath,rm,writeFile } from 'node:fs/promises';
import { basename,dirname,join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PINNED_COMMIT,PINNED_PATH,EXPECTED_HASHES,defaultRepository,sha256,trustedVariants,verifyDownloadedDraft,runTrustedFixtureProof } from './verify-trusted-title-change.mjs';

const pinned=()=>execFileSync('git',['--no-optional-locks','-C',defaultRepository,'show','--no-textconv',PINNED_COMMIT+':'+PINNED_PATH],{maxBuffer:16384});

test('fixture pin refuses arbitrary code before a module is ever imported',()=>{
 const source=pinned();assert.equal(sha256(source),EXPECTED_HASHES.original80);
 assert.throws(()=>trustedVariants(Buffer.from(source+'\nthrow new Error("unexpected code");\n')),/pinned helper bytes do not match/);
 assert.throws(()=>trustedVariants('export function taskTitle(){return "anything";}'),/pinned helper bytes do not match/);
});

test('downloaded drafts are data-only and must match the exact prescribed manual change',()=>{
 const {manual100}=trustedVariants(pinned());
 const verified=verifyDownloadedDraft(Buffer.from(manual100.replaceAll('\n','\r\n')));
 assert.equal(verified.normalizedSha256,EXPECTED_HASHES.manual100);assert.equal(verified.executedDownloadedFile,false);
 assert.throws(()=>verifyDownloadedDraft(Buffer.from(manual100.replace('> 100','> 101'))),/differs from the exact trusted/);
 assert.throws(()=>verifyDownloadedDraft(Buffer.from(manual100+'\nprocess.exit(0);\n')),/differs from the exact trusted/);
});

test('pinned original, prescribed manual change and fresh minimum-length variation meet independent boundary expectations',async()=>{
 const report=await runTrustedFixtureProof({writeReport:false});
 assert.equal(report.passed,120);assert.equal(report.total,120);assert.equal(report.scope.executedArbitraryCode,false);assert.equal(report.scope.temporaryDirectoryRemoved,true);
 const get=(variant,id)=>report.results.find(result=>result.variant===variant).checks.find(check=>check.id===id).actual;
 assert.equal(get('original80','length-80'),'accepted · 80 code units');assert.equal(get('original80','length-81'),'rejected');assert.equal(get('original80','length-100'),'rejected');
 assert.equal(get('manual100','length-100'),'accepted · 100 code units');assert.equal(get('manual100','length-101'),'rejected');assert.equal(get('manual100','trim-100'),'accepted · 100 code units');
 assert.equal(get('manual100','minimum-2'),'accepted · 2 code units');assert.equal(get('transferMin3','minimum-2'),'rejected');assert.equal(get('transferMin3','minimum-3'),'accepted · 3 code units');
 for(const result of report.results){assert.equal(result.idRegressionChecks,12);assert.ok(result.checks.every(check=>check.passed));}
});

test('downloaded-path workflow accepts only the known manual fixture and refuses added executable text',async()=>{
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','.sites-runtime');await mkdir(root,{recursive:true});
 const realRoot=await realpath(root);assert.equal(realRoot.toLowerCase(),root.toLowerCase());
 const temporary=await mkdtemp(join(realRoot,'trusted-title-draft-test-'));
 try{
  const draft=join(temporary,'validation.js'),{manual100}=trustedVariants(pinned());
  await writeFile(draft,manual100.replaceAll('\n','\r\n'));
  const report=await runTrustedFixtureProof({draft,writeReport:false});assert.equal(report.downloadedDraft.matches,'manual100');assert.equal(report.downloadedDraft.executedDownloadedFile,false);assert.equal(report.passed,120);
  await writeFile(draft,manual100+'\nthrow new Error("THIS MUST NOT EXECUTE");\n');
  await assert.rejects(()=>runTrustedFixtureProof({draft,writeReport:false}),/differs from the exact trusted/);
 }finally{
  const target=await realpath(temporary);assert.equal(dirname(target).toLowerCase(),realRoot.toLowerCase());assert.ok(basename(target).startsWith('trusted-title-draft-test-'));
  await rm(target,{recursive:true,force:true});
 }
});
