import type { RuntimeConfig } from '../contracts.ts';
import type { ProjectTree } from '../discovery/types.ts';
import { language,snapshotFromSources } from '../discovery/github.ts';
import { ApiError } from '../server/http.ts';
import { localWorkspace } from './workspace.ts';
export async function localRepositoryTree(c:RuntimeConfig,url:unknown,ref:unknown):Promise<ProjectTree>{
 const raw=await localWorkspace<{url:string;repository:string;commit:string;files:{path:string;size:number}[];truncated:boolean}>(c,'repository-tree',{url,...(ref===undefined?{}:{ref})});
 if(!Array.isArray(raw.files)||raw.files.length>400||!/^[a-f0-9]{40}$/.test(raw.commit))throw new ApiError(502,'PROJECT_RESPONSE_INVALID');
 const files=raw.files.flatMap(f=>{const supported=language(f.path);return supported&&Number.isInteger(f.size)&&f.size>0&&f.size<=12288?[{...f,language:supported}]:[];});
 return {...raw,files,warnings:['A public Git snapshot is cached on this laptop for 24-hour reuse. No repository code is executed.','Only ordinary source files up to 12 KiB are eligible; hidden, generated, dependency and potentially sensitive paths are excluded from study.',...(raw.truncated?['The file catalogue is partial.']:[])]};
}
export async function localRepositorySnapshot(c:RuntimeConfig,tree:Pick<ProjectTree,'url'|'repository'|'commit'>,paths:string[]){
 const result=await localWorkspace<{files:{path:string;source:string}[]}>(c,'repository-files',{url:tree.url,commit:tree.commit,paths});
 if(!Array.isArray(result.files)||result.files.length!==paths.length||result.files.some((f,i)=>f.path!==paths[i]||typeof f.source!=='string'))throw new ApiError(502,'PROJECT_RESPONSE_INVALID');
 return snapshotFromSources(tree,result.files);
}
