import type { RuntimeConfig } from '../contracts.ts';
import type { ProjectSnapshot } from '../learner/types.ts';
import type { WorkingCopy, ChangeProposal } from '../study/workspace.ts';
import { language, snapshotFromSources } from '../discovery/github.ts';
import { ApiError } from '../server/http.ts';
import { readCloudFiles } from './github-source.ts';

type Action='create'|'read'|'propose'|'apply';
type File={path:string;source:string;hash:string;original:string};
type Proposal=ChangeProposal&{createdAt:string};
type State={files:File[];proposals:Proposal[];backups:{proposalId:string;path:string;hash:string;source:string}[]};
type Row={project_id:string;owner_id:string;pilot_id:string;commit_sha:string;state_json:string;version:number};
type FilesReader=typeof readCloudFiles;
const uuid=/^[a-f0-9-]{36}$/i,hashPattern=/^[a-f0-9]{64}$/;
const fault=(message:string,status=400)=>new ApiError(status,'WORKSPACE_OPERATION_FAILED',message);
async function hash(source:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),byte=>byte.toString(16).padStart(2,'0')).join('');}

/** A deterministic, bounded unified hunk. Changed blocks preserve all source lines. */
export function cloudDiff(path:string,before:string,after:string){
 if(before===after)return {diff:'',added:0,removed:0};
 const a=before.split('\n'),b=after.split('\n');let start=0,end=0;
 while(start<a.length&&start<b.length&&a[start]===b[start])start++;
 while(end<a.length-start&&end<b.length-start&&a[a.length-end-1]===b[b.length-end-1])end++;
 const lead=Math.max(0,start-3),tail=Math.min(3,end),removed=a.length-start-end,added=b.length-start-end;
 const lines=['--- a/'+path,'+++ b/'+path,'@@ -'+(lead+1)+','+(start-lead+removed+tail)+' +'+(lead+1)+','+(start-lead+added+tail)+' @@',...a.slice(lead,start).map(line=>' '+line),...a.slice(start,a.length-end).map(line=>'-'+line),...b.slice(start,b.length-end).map(line=>'+'+line),...a.slice(a.length-end,a.length-end+tail).map(line=>' '+line)];
 return {diff:lines.join('\n'),added,removed};
}
function source(value:unknown){
 if(typeof value!=='string'||new TextEncoder().encode(value).length>12288||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw fault('Use ordinary source text of at most 12 KiB.');
 return value;
}
function state(row:Row):State{const result=JSON.parse(row.state_json) as State;if(!Array.isArray(result.files)||!Array.isArray(result.proposals)||!Array.isArray(result.backups))throw fault('The saved draft is unavailable.',503);return result;}
function view(row:Row,data:State):WorkingCopy{return {folder:'Cloud draft · '+row.project_id,commit:row.commit_sha,files:data.files.map(({path,source,hash})=>({path,source,hash})),diff:data.files.map(file=>cloudDiff(file.path,file.original,file.source).diff).filter(Boolean).join('\n\n')};}

/** Selected-file drafts in Supabase, never filesystem writes or GitHub pushes. */
export async function cloudWorkspace(config:RuntimeConfig,action:Action,input:Record<string,unknown>,reader:FilesReader=readCloudFiles):Promise<WorkingCopy|ChangeProposal>{
 if(typeof input.ownerId!=='string'||!input.ownerId||input.ownerId.length>200||typeof input.projectId!=='string'||!uuid.test(input.projectId))throw fault('Invalid draft identity.');
 const owner=input.ownerId,project=input.projectId,pilot=config.PILOT_ID||'groundtruth-pilot.v1';
 const projectRow=await config.DB.prepare('SELECT p.snapshot_json,l.purpose FROM study_projects p LEFT JOIN study_learning_paths l ON l.project_id=p.id WHERE p.id=? AND p.owner_id=? AND p.pilot_id=? AND p.expires_at>?').bind(project,owner,pilot,new Date().toISOString()).first<{snapshot_json:string;purpose:string|null}>();
 if(!projectRow)throw fault('Learning path not found.',404);
 if(projectRow.purpose==='transfer')throw fault('Public reference paths are read-only.',403);
 if(action!=='read'){
  const independent=await config.DB.prepare("SELECT e.id FROM study_exercises e JOIN study_projects p ON p.id=e.project_id WHERE p.owner_id=? AND p.pilot_id=? AND e.status='independent' AND e.ended_at IS NULL AND p.expires_at>? LIMIT 1").bind(owner,pilot,new Date().toISOString()).first();
  if(independent)throw fault('End or submit your independent attempt before changing code.',403);
 }
 const snapshot=JSON.parse(projectRow.snapshot_json) as ProjectSnapshot;
 let row=await config.DB.prepare('SELECT * FROM cloud_workspaces WHERE project_id=? AND owner_id=? AND pilot_id=?').bind(project,owner,pilot).first<Row>();
 if(action==='create'){
  if(input.ownershipConfirmed!==true)throw fault('Confirm permission to modify a separate draft.');
  if(input.url!==snapshot.url||input.commit!==snapshot.commit||!Array.isArray(input.paths)||input.paths.length!==snapshot.files.length||input.paths.some(path=>!snapshot.files.some(file=>file.path===path))||new Set(input.paths).size!==input.paths.length)throw fault('The selected source differs from this saved learning path.');
  if(!row){
   const complete=await reader({url:snapshot.url,commit:snapshot.commit,paths:input.paths});
   if(complete.files.length!==snapshot.files.length||complete.files.some(file=>!snapshot.files.some(selected=>selected.path===file.path)))throw fault('The complete source does not match the saved workflow.',502);
   const checked=snapshotFromSources(snapshot,complete.files);if(checked.files.length!==complete.files.length)throw fault('The source contains unsupported or potentially sensitive text.');
   const files:File[]=[];for(const file of complete.files)files.push({path:file.path,source:source(file.source),original:file.source,hash:await hash(file.source)});
   const initial:State={files,proposals:[],backups:[]};
   await config.DB.prepare('INSERT OR IGNORE INTO cloud_workspaces(project_id,owner_id,pilot_id,commit_sha,state_json,version,updated_at) VALUES(?,?,?,?,?,0,?)').bind(project,owner,pilot,snapshot.commit,JSON.stringify(initial),new Date().toISOString()).run();
   row=await config.DB.prepare('SELECT * FROM cloud_workspaces WHERE project_id=? AND owner_id=? AND pilot_id=?').bind(project,owner,pilot).first<Row>();
  }
 }
 if(!row)throw fault('Create the cloud draft first.',404);
 if(row.commit_sha!==snapshot.commit)throw fault('The draft belongs to a different source revision.',409);
 const data=state(row);
 if(action==='read'||action==='create')return view(row,data);
 const save=async()=>{
  const serialized=JSON.stringify(data);if(new TextEncoder().encode(serialized).length>1024*1024)throw fault('This draft has reached its saved-history limit. Start a new learning path.',409);
  const update=await config.DB.prepare("UPDATE cloud_workspaces SET state_json=?,version=version+1,updated_at=? WHERE project_id=? AND owner_id=? AND pilot_id=? AND version=? AND EXISTS(SELECT 1 FROM study_projects p WHERE p.id=cloud_workspaces.project_id AND p.owner_id=? AND p.pilot_id=? AND p.expires_at>?) AND NOT EXISTS(SELECT 1 FROM study_exercises e JOIN study_projects p ON p.id=e.project_id WHERE p.owner_id=? AND p.pilot_id=? AND e.status='independent' AND e.ended_at IS NULL AND p.expires_at>?) RETURNING version").bind(serialized,new Date().toISOString(),project,owner,pilot,row!.version,owner,pilot,new Date().toISOString(),owner,pilot,new Date().toISOString()).first();
  if(!update)throw fault('The draft or activity changed. Reload and review the latest version.',409);
 };
 if(action==='propose'){
  if(typeof input.path!=='string'||!language(input.path))throw fault('Choose a supported source file.');
  const file=data.files.find(file=>file.path===input.path);if(!file)throw fault('This file is outside the selected workflow.',403);
  if(typeof input.baseHash!=='string'||!hashPattern.test(input.baseHash)||input.baseHash!==file.hash)throw fault('The file changed. Reload it before preparing an edit.',409);
  if(input.mode!=='ai'&&input.mode!=='manual-declared')throw fault('Unknown change mode.');
  const revised=source(input.source);
  if(revised.trim()){const checked=snapshotFromSources(snapshot,[{path:file.path,source:revised}]);if(!checked.files.some(accepted=>accepted.path===file.path))throw fault('The proposal contains unsupported or potentially sensitive text.');}
  const diff=cloudDiff(file.path,file.source,revised);if(!diff.diff)throw fault('The proposed text has no changes.');
  if(data.proposals.length>=30)throw fault('This draft has reached its proposal-history limit. Start a new learning path.',409);
  const proposal:Proposal={id:crypto.randomUUID(),path:file.path,baseHash:file.hash,resultHash:await hash(revised),source:revised,original:file.source,...diff,mode:input.mode,summary:typeof input.summary==='string'?input.summary.slice(0,600):'Declared manual change',createdAt:new Date().toISOString()};
  data.proposals.push(proposal);await save();return proposal;
 }
 if(action==='apply'){
  if(typeof input.proposalId!=='string'||!uuid.test(input.proposalId)||input.confirmed!==true)throw fault('Review and confirm the proposal before applying it.');
  const proposal=data.proposals.find(proposal=>proposal.id===input.proposalId);if(!proposal)throw fault('Proposal not found.',404);
  const file=data.files.find(file=>file.path===proposal.path);if(!file)throw fault('The proposal file is unavailable.',409);
  if(await hash(proposal.source)!==proposal.resultHash||await hash(proposal.original)!==proposal.baseHash)throw fault('The saved proposal failed its integrity check.',409);
  if(proposal.appliedAt){if(file.hash===proposal.resultHash)return proposal;throw fault('This proposal was already applied and the file has since changed.',409);}
  if(file.hash!==proposal.baseHash)throw fault('The file changed after this diff was prepared. Reload and review a new proposal.',409);
  data.backups.push({proposalId:proposal.id,path:file.path,hash:file.hash,source:file.source});
  file.source=proposal.source;file.hash=proposal.resultHash;proposal.appliedAt=new Date().toISOString();
  await save();return proposal;
 }
 throw fault('Unknown draft operation.',404);
}
