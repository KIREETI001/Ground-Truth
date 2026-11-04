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
const stopWords=new Set(['the','and','for','with','this','that','from','into','only','learn','understand','source','file','function','return','project','code','what','which','should','does']);
export function sourceFocusTerms(focus:string|string[]=''){
 return [...new Set((Array.isArray(focus)?focus.join(' '):focus).replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().match(/[a-z][a-z0-9_]{2,40}/g)||[])].filter(term=>!stopWords.has(term)).slice(0,40);
}
/** An exact contiguous source window, centered on a relevant behavior rather than imports at byte zero. */
export function selectSourceWindow(source:string,budget:number,focus:string|string[]=''){
 if(source.length<=budget)return {excerpt:source,startLine:1,endLine:source.split('\n').length};
 if(budget<=0)return {excerpt:'',startLine:1,endLine:1};
 const lines=source.split('\n'),offsets:number[]=[];let offset=0;
 const terms=sourceFocusTerms(focus);
 let best=0,bestScore=-Infinity;
 lines.forEach((line,index)=>{
  offsets.push(offset);offset+=line.length+1;
  const lower=line.toLowerCase(),comment=/^\s*(?:\/\/|\*|#|--)/.test(line);
  let score=terms.reduce((sum,term)=>sum+(lower.includes(term)?8:0),0);
  if(comment)score=Math.min(3,score*.15);
  if(!comment&&/\b(?:function|def|class)\b|=>|\b(?:SELECT|CREATE TABLE)\b/i.test(line))score+=3;
  if(!comment&&/\b(?:if|throw|return|where|check|constraint)\b/i.test(line))score+=2;
  if(comment||/^\s*(?:import\b|from\b|export\s+\{)/.test(line))score-=3;
  if(!line.trim())score-=5;
  if(score>bestScore){best=index;bestScore=score;}
 });
 let start=Math.max(0,offsets[best]-Math.floor(budget*.3));
 // Keep the nearest enclosing declaration when it fits alongside the selected boundary.
 for(let i=best;i>=0&&offsets[best]-offsets[i]<budget*.45;i--){if(/\b(?:function|def|class)\b|(?:const|let)\s+\w+\s*=.*=>/.test(lines[i])){start=offsets[i];break;}}
 if(start>0){const next=source.indexOf('\n',start-1);if(next>=0&&next<offsets[best])start=next+1;}
 let end=Math.min(source.length,start+budget);
 if(end<source.length){const last=source.lastIndexOf('\n',end-1);if(last>=offsets[best])end=last+1;}
 // A single unusually long line is still bounded and remains a literal source substring.
 const excerpt=source.slice(start,end),startLine=source.slice(0,start).split('\n').length;
 return {excerpt,startLine,endLine:startLine+excerpt.split('\n').length-1};
}
export function contextFromFullSource(snapshot:ProjectSnapshot,files:CompleteSource[],budget=10000,focus:string|string[]=''):ProjectSnapshot{
 if(!Number.isFinite(budget)||budget<1||!files.length||files.length>3||new Set(files.map(file=>file.path)).size!==files.length||files.some(file=>file.commit!==snapshot.commit||!snapshot.files.some(selected=>selected.path===file.path)))throw new ApiError(400,'SOURCE_CONTEXT_INVALID');
 const bounded=Math.min(24000,Math.floor(budget)),perFile=Math.floor(bounded/files.length),allocations=files.map(file=>Math.min(file.source.length,perFile));
 let remaining=bounded-allocations.reduce((sum,size)=>sum+size,0);
 files.forEach((file,index)=>{const extra=Math.min(remaining,file.source.length-allocations[index]);allocations[index]+=extra;remaining-=extra;});
 const windows=files.map((file,index)=>selectSourceWindow(file.source,allocations[index],[...(Array.isArray(focus)?focus:[focus]),...snapshot.signals.filter(signal=>signal.path===file.path).map(signal=>signal.note)]));
 return {...snapshot,files:files.map((file,index)=>({path:file.path,language:snapshot.files.find(f=>f.path===file.path)?.language||'source',excerpt:windows[index].excerpt})),warnings:files.map((file,index)=>file.source.length>allocations[index]?file.path+': model context uses an exact source window (lines '+windows[index].startLine+'–'+windows[index].endLine+'); the complete file remains available in the source viewer.':file.path+': complete selected file is available to the model.')};
}
