import type { RuntimeConfig } from '../contracts.ts';
import { ApiError } from '../server/http.ts';
export type WorkingCopy={folder:string;commit:string;files:{path:string;source:string;hash:string}[];diff:string};
export type ChangeProposal={id:string;path:string;baseHash:string;resultHash:string;source:string;original:string;diff:string;mode:'ai'|'manual-declared';summary:string;added:number;removed:number;appliedAt?:string};
export function editableSource(value:unknown):string{
 if(typeof value!=='string'||value.length>12000||value.includes('\0'))throw new ApiError(400,'INVALID_EDIT_SOURCE','Use a source file of at most 12,000 characters without binary data.');
 return value;
}
export async function localWorkspace<T>(config:RuntimeConfig,action:'create'|'read'|'propose'|'apply'|'auth-bootstrap'|'auth-hash'|'auth-verify'|'repository-tree'|'repository-files',input:Record<string,unknown>):Promise<T>{
 if(config.CLOUD_ENABLED==='true'){
  if(action==='auth-hash'||action==='auth-verify'||action==='auth-bootstrap')return await (await import('../cloud/auth-crypto.ts')).cloudAuthCrypto(action,input) as T;
  if(action==='repository-files')return await (await import('../cloud/github-source.ts')).readCloudFiles(input as {url:string;commit:string;paths:string[]}) as T;
  if(action==='repository-tree')throw new ApiError(400,'CLOUD_REPOSITORY_TREE','Use the public repository importer.');
  return await (await import('../cloud/workspace.ts')).cloudWorkspace(config,action,input) as T;
 }
 if(!config.LOCAL_WORKSPACE_TOKEN)throw new ApiError(503,'WORKSPACE_SERVICE_DISABLED','Start the local working-copy service before editing.');
 try{
 const response=await fetch('http://127.0.0.1:8082/'+action,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.LOCAL_WORKSPACE_TOKEN},signal:AbortSignal.timeout(95000),body:JSON.stringify(input)});
 const text=await response.text();if(new TextEncoder().encode(text).length>196608)throw new Error('Workspace response too large');
 const result=JSON.parse(text);
 if(!response.ok)throw new ApiError(response.status,'WORKSPACE_OPERATION_FAILED',typeof result.error==='string'?result.error:'Local operation failed');
 return result as T;
 }catch(e){if(e instanceof ApiError)throw e;throw new ApiError(503,'WORKSPACE_SERVICE_UNAVAILABLE','The local working-copy service is unavailable. Start it from the IDE task and retry.');}
}

