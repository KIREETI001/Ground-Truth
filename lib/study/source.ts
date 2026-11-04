import type { RuntimeConfig } from '../contracts.ts';
import type { ProjectSnapshot } from '../learner/types.ts';
import { snapshotFromSources } from '../discovery/github.ts';
import { ApiError } from '../server/http.ts';
import { localWorkspace } from './workspace.ts';
export type CompleteSource={path:string;source:string;complete:true;bytes:number;lines:number;commit:string};
type ReadFiles=(input:{url:string;commit:string;paths:string[]})=>Promise<{files:{path:string;source:string}[]}>;
export async function readStudySource(c:RuntimeConfig,snapshot:ProjectSnapshot,path:string,reader?:ReadFiles):Promise<CompleteSource>{
 return (await readStudySources(c,snapshot,[path],reader))[0];
}
/** One pinned-tree read supplies every selected file for the inference context. */
export async function readStudySources(c:RuntimeConfig,snapshot:ProjectSnapshot,paths=snapshot.files.map(file=>file.path),reader?:ReadFiles):Promise<CompleteSource[]>{
 if(!paths.length||paths.length>3||new Set(paths).size!==paths.length||paths.some(path=>!snapshot.files.some(file=>file.path===path)))throw new ApiError(404,'SOURCE_NOT_IN_WORKFLOW','A file is outside the saved workflow.');
 const result=await (reader||((input)=>localWorkspace<{files:{path:string;source:string}[]}>(c,'repository-files',input)))({url:snapshot.url,commit:snapshot.commit,paths});
 if(!Array.isArray(result.files)||result.files.length!==paths.length||result.files.some((file,index)=>file.path!==paths[index]||typeof file.source!=='string'))throw new ApiError(502,'SOURCE_UNAVAILABLE');
 const checked=snapshotFromSources(snapshot,result.files);
 if(checked.files.length!==result.files.length)throw new ApiError(422,'PROJECT_UNSAFE_SOURCE','A selected file contains unsupported or potentially sensitive source.');
 return result.files.map(file=>({path:file.path,source:file.source,complete:true,bytes:new TextEncoder().encode(file.source).length,lines:file.source.split('\n').length,commit:snapshot.commit}));
}
export function contextFromFullSource(snapshot:ProjectSnapshot,files:CompleteSource[],budget=10000):ProjectSnapshot{
 const perFile=Math.floor(budget/Math.max(1,files.length));
 return {...snapshot,files:files.map(file=>{let text=file.source;if(text.length>perFile){const prefix=text.slice(0,perFile);const line=prefix.lastIndexOf('\n');text=line>0?prefix.slice(0,line+1):prefix;}return {path:file.path,language:snapshot.files.find(f=>f.path===file.path)?.language||'source',excerpt:text};}),warnings:files.map(f=>f.source.length>perFile?f.path+': model context is bounded; the complete file remains available in the source viewer.':f.path+': complete selected file is available to the model.')};
}
