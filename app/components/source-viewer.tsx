'use client';
import { useEffect,useRef,useState } from 'react';
import { HelpTip } from './help-tip';
import { api } from '@/lib/client/api';
import type { CompleteSource } from '@/lib/study/source';
export function SourceViewer({projectId,path}:{projectId:string;path:string}){
 const [file,setFile]=useState<CompleteSource|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function load(){if(request.current)return;const controller=new AbortController();request.current=controller;setBusy(true);setError('');try{const result=await api<CompleteSource>('/api/study/projects/'+projectId+'/source?path='+encodeURIComponent(path),{signal:controller.signal});if(!controller.signal.aborted)setFile(result);}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Could not read the complete file.');}finally{if(!controller.signal.aborted){setBusy(false);request.current=null;}}}
 return <details className="complete-source" onToggle={e=>{if(e.currentTarget.open&&!file&&!request.current)void load();}}><summary>{path}</summary>{busy&&<p role="status">Loading complete file…</p>}{error&&<div role="alert"><p>{error}</p><button className="button button-outline" onClick={()=>void load()}>Retry full file</button></div>}{file&&<><div className="source-meta"><span>Complete file · {file.lines} lines · {file.bytes.toLocaleString()} bytes</span><small>Commit {file.commit.slice(0,7)}</small><HelpTip label="Original pinned source">This is the original selected file at the pinned GitHub commit. Controlled edits are kept in a separate draft in Changes. The source viewer does not execute code.</HelpTip></div><pre className="complete-source-code" tabIndex={0} aria-label={path+' complete source'}><code>{file.source}</code></pre></>}</details>;
}
