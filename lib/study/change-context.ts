import type { RuntimeConfig } from '../contracts.ts';
import type { ProjectSnapshot } from '../learner/types.ts';
import { ApiError } from '../server/http.ts';
import { cloudDiff } from '../cloud/workspace.ts';
import { localWorkspace, type ChangeProposal, type WorkingCopy } from './workspace.ts';

export type AppliedChangeContext={path:string;source:string;hash:string;label:string;changeProposalId:string;originalSource:string;baseHash:string;diff:string;mode:'ai'|'manual-declared';appliedAt:string};
export type ChangeContextInput={projectId:string;ownerId:string;workingPath:string;proposalId:string};
type WorkspaceReader=<T>(action:'read'|'proposal',input:Record<string,unknown>)=>Promise<T>;
export async function sourceHash(source:string){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
const changed=()=>new ApiError(409,'CHANGE_CONTEXT_STALE','The saved file no longer matches this applied change. Reload and review the latest diff.');

/** Only trusted stored proposals may reach this constructor; no request source or diff is accepted. */
export async function buildAppliedChangeContext(proposal:ChangeProposal,file:WorkingCopy['files'][number],label:string):Promise<AppliedChangeContext>{
 if(!proposal.appliedAt||!Number.isFinite(Date.parse(proposal.appliedAt)))throw new ApiError(409,'CHANGE_NOT_APPLIED','Apply a reviewed change before checking your understanding.');
 if(proposal.path!==file.path||proposal.mode!=='ai'&&proposal.mode!=='manual-declared'||typeof proposal.source!=='string'||typeof proposal.original!=='string'||typeof file.source!=='string')throw changed();
 if(proposal.source.length>6000||proposal.original.length>6000)throw new ApiError(400,'WORKING_FILE_UNAVAILABLE','Choose a changed file with at most 6,000 characters before and after the edit.');
 const [beforeHash,afterHash,currentHash]=await Promise.all([sourceHash(proposal.original),sourceHash(proposal.source),sourceHash(file.source)]);
 if(beforeHash!==proposal.baseHash||afterHash!==proposal.resultHash||currentHash!==file.hash||file.hash!==proposal.resultHash||file.source!==proposal.source||beforeHash===afterHash)throw changed();
 // Reconstruct from the immutable before/after text rather than trusting a client-supplied or stale diff.
 const {diff}=cloudDiff(file.path,proposal.original,proposal.source);
 if(!diff)throw changed();
 return {path:file.path,source:file.source,hash:currentHash,label,changeProposalId:proposal.id,originalSource:proposal.original,baseHash:beforeHash,diff,mode:proposal.mode,appliedAt:proposal.appliedAt};
}

/** Reauthorize the owner and pinned workflow before reading either saved proposal or current source. */
export async function resolveOwnedChangeContext(c:RuntimeConfig,input:ChangeContextInput,reader?:WorkspaceReader):Promise<AppliedChangeContext>{
 const {projectId,ownerId,workingPath,proposalId}=input;
 if(!projectId||!ownerId||!workingPath||!proposalId||projectId.length>100||ownerId.length>200||workingPath.length>250||proposalId.length>100)throw new ApiError(400,'CHANGE_CONTEXT_INVALID');
 const project=await c.DB.prepare('SELECT snapshot_json FROM study_projects WHERE id=? AND owner_id=? AND pilot_id=? AND expires_at>?').bind(projectId,ownerId,c.PILOT_ID||'groundtruth-pilot.v1',new Date().toISOString()).first<{snapshot_json:string}>();
 if(!project)throw new ApiError(404,'PROJECT_NOT_FOUND');
 const snapshot=JSON.parse(project.snapshot_json) as ProjectSnapshot;
 if(!snapshot.files.some(file=>file.path===workingPath))throw new ApiError(404,'SOURCE_NOT_IN_WORKFLOW');
 const identity={ownerId,projectId,url:snapshot.url,commit:snapshot.commit,paths:snapshot.files.map(file=>file.path)};
 const read:WorkspaceReader=reader||((action,value)=>localWorkspace(c,action,value));
 const proposal=await read<ChangeProposal>('proposal',{...identity,proposalId});
 const copy=await read<WorkingCopy>('read',identity);
 if(proposal.id!==proposalId||proposal.path!==workingPath||copy.commit!==snapshot.commit)throw changed();
 const file=copy.files.find(file=>file.path===workingPath);if(!file)throw changed();
 return buildAppliedChangeContext(proposal,file,c.CLOUD_ENABLED==='true'?'Cloud draft · not pushed to GitHub':'Local working copy · uncommitted');
}
