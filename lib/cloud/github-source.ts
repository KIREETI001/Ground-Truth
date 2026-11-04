import { language, snapshotFromSources } from '../discovery/github.ts';
import { ApiError } from '../server/http.ts';
import { cloudGitHubFetcher } from './github-fetch.ts';

const SHA=/^[a-f0-9]{40}$/i;
const FILE_LIMIT=12*1024,TOTAL_LIMIT=32*1024,NETWORK_LIMIT=256*1024;
type Input={url:unknown;commit:unknown;paths:unknown};
type TreeEntry={path?:unknown;type?:unknown;mode?:unknown;sha?:unknown;size?:unknown};
function invalid(message='The pinned source could not be verified.'):never{throw new ApiError(502,'PROJECT_SOURCE_INVALID',message);}

/** Public, pinned Git blobs only. No code execution, credentials, redirects or download URLs. */
export async function readCloudFiles(input:Input,fetcher?:typeof fetch):Promise<{files:{path:string;source:string}[]}>{
 const match=typeof input.url==='string'&&input.url.match(/^https:\/\/github\.com\/([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)\/([a-z0-9][a-z0-9_.-]{0,99})\/?$/i);
 if(!match||typeof input.commit!=='string'||!SHA.test(input.commit)||!Array.isArray(input.paths)||!input.paths.length||input.paths.length>3||new Set(input.paths).size!==input.paths.length||!input.paths.every(path=>typeof path==='string'&&language(path)))throw new ApiError(400,'PROJECT_SOURCE_INVALID','Choose up to three supported files at a pinned public GitHub commit.');
 const selected=input.paths as string[],commit=input.commit.toLowerCase(),repository=match[1]+'/'+match[2],api='https://api.github.com/repos/'+repository;
 const network=cloudGitHubFetcher({CLOUD_ENABLED:'true'},fetcher)||fetch;
 const signal=AbortSignal.timeout(15000);let networkBytes=0;
 async function read(url:string,limit:number,raw=false){
  const response=await network(url,{method:'GET',redirect:'manual',credentials:'omit',signal,headers:{Accept:raw?'application/vnd.github.raw+json':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'GroundTruth-Public-Learning'}});
  if(response.redirected||response.status>=300&&response.status<400)throw new ApiError(502,'PROJECT_REDIRECT_REFUSED','Use the current public repository URL.');
  if(response.status===403||response.status===429)throw new ApiError(503,'PROJECT_RATE_LIMITED','Public GitHub reads are rate limited. Try again later.');
  if(response.status===404)throw new ApiError(404,'PROJECT_NOT_FOUND','The public repository or pinned file is unavailable.');
  if(!response.ok)throw new ApiError(502,'PROJECT_UNAVAILABLE','GitHub is temporarily unavailable.');
  if(Number(response.headers.get('content-length')||0)>limit)invalid('The source response exceeds its read budget.');
  const reader=response.body?.getReader();if(!reader)invalid();
  const chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.length;networkBytes+=next.value.length;if(bytes>limit||networkBytes>NETWORK_LIMIT){await reader.cancel();invalid('The source response exceeds its read budget.');}chunks.push(next.value);}}
  finally{reader.releaseLock();}
  const merged=new Uint8Array(bytes);let offset=0;for(const part of chunks){merged.set(part,offset);offset+=part.length;}
  const text=new TextDecoder('utf-8',{fatal:true}).decode(merged);return {text,bytes:merged};
 }
 async function json(url:string,limit:number){const {text}=await read(url,limit);const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))invalid();return value;}
 try{
  const metadata=await json(api,16*1024);
  if(metadata.private!==false||typeof metadata.full_name!=='string'||metadata.full_name.toLowerCase()!==repository.toLowerCase())throw new ApiError(400,'PROJECT_PUBLIC_REQUIRED','Only public repositories are supported.');
  const revision=await json(api+'/git/commits/'+commit,12*1024);
  if(revision.sha!==commit||!revision.tree||!SHA.test(revision.tree.sha))invalid();
  const tree=await json(api+'/git/trees/'+revision.tree.sha+'?recursive=1',192*1024);
  if(tree.sha!==revision.tree.sha||!Array.isArray(tree.tree)||typeof tree.truncated!=='boolean')invalid();
  let total=0;const files:{path:string;source:string}[]=[];
  for(const path of selected){
   const matches=(tree.tree as TreeEntry[]).filter(entry=>entry.path===path),entry=matches[0];
   if(matches.length!==1||entry.type!=='blob'||!['100644','100755'].includes(String(entry.mode))||typeof entry.sha!=='string'||!SHA.test(entry.sha)||!Number.isSafeInteger(entry.size)||Number(entry.size)<1||Number(entry.size)>FILE_LIMIT)invalid('A selected file is missing, unsafe or outside the read budget.');
   total+=Number(entry.size);if(total>TOTAL_LIMIT)invalid('The selected files exceed the combined source budget.');
   const blob=await read(api+'/git/blobs/'+entry.sha,FILE_LIMIT,true);if(blob.bytes.length!==entry.size)invalid();
   // Verify Git object identity, including exact byte length, before decoding is used.
   const header=new TextEncoder().encode('blob '+blob.bytes.length+'\0'),object=new Uint8Array(header.length+blob.bytes.length);object.set(header);object.set(blob.bytes,header.length);
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',object)),byte=>byte.toString(16).padStart(2,'0')).join('');if(digest!==entry.sha)invalid();
   files.push({path,source:blob.text});
  }
  const checked=snapshotFromSources({url:'https://github.com/'+repository,repository,commit},files);
  if(checked.files.length!==files.length||files.some(file=>!checked.files.some(accepted=>accepted.path===file.path)))throw new ApiError(422,'PROJECT_UNSAFE_SOURCE','A selected file contains unsupported or potentially sensitive source.');
  return {files};
 }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(502,'PROJECT_UNAVAILABLE','The pinned public source could not be read. Retry later.');}
}
