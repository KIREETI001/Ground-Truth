import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash,randomUUID } from 'node:crypto';

const root=await fs.mkdtemp(path.join(os.tmpdir(),'groundtruth-proposal-read-test-'));
process.env.GROUNDTRUTH_WORKSPACES=root;
const {workspaceAction}=await import('../scripts/local-workspace.mjs');
after(async()=>{const resolved=path.resolve(root);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep+'groundtruth-proposal-read-test-'));await fs.rm(resolved,{recursive:true,force:true});});

test('local proposal lookup is owner-scoped, read-only and rejects traversal identifiers',async()=>{
 const identity={ownerId:'synthetic-proposal-owner',projectId:randomUUID()},proposalId=randomUUID();
 const ownerHash=createHash('sha256').update(identity.ownerId).digest('hex').slice(0,24);
 const folder=path.join(root,ownerHash,identity.projectId),proposals=path.join(folder,'proposals');
 await fs.mkdir(proposals,{recursive:true});
 await fs.writeFile(path.join(folder,'workspace.json'),JSON.stringify({paths:['index.js'],commit:'a'.repeat(40)}));
 const proposal={id:proposalId,path:'index.js',source:'export const x = 2;',original:'export const x = 1;',appliedAt:'2026-11-05T00:00:00Z'};
 const filename=path.join(proposals,proposalId+'.json');await fs.writeFile(filename,JSON.stringify(proposal));
 const before=await fs.readFile(filename,'utf8'),entries=await fs.readdir(folder);
 assert.deepEqual(await workspaceAction('proposal',{...identity,proposalId}),proposal);
 assert.equal(await fs.readFile(filename,'utf8'),before);assert.deepEqual(await fs.readdir(folder),entries);
 await assert.rejects(()=>workspaceAction('proposal',{...identity,ownerId:'another-owner',proposalId}),/Create the local working copy/);
 await assert.rejects(()=>workspaceAction('proposal',{...identity,proposalId:'../workspace'}),/Choose a saved proposal/);
 await fs.writeFile(filename,JSON.stringify({...proposal,path:'private.js'}));
 await assert.rejects(()=>workspaceAction('proposal',{...identity,proposalId}),/does not belong/);
});
