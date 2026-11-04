'use client';
import { useEffect,useRef,useState } from 'react';
import { post } from '@/lib/client/api';
import type { StudyProject } from '@/lib/study/types';
import { useRuntimeProfile } from './runtime-profile';
import { HelpTip } from './help-tip';

type Reply={feedback:string;nextStep:string;evidence?:{path:string;quote:string}[]};
type Message={id:string;question:string;reply?:Reply;error?:string;pending?:boolean};
type Session={id:string;draft:string;messages:Message[]};
export function HintWindow({project,open,paused,onClose,onUpdated,onBusyChange}:{project:StudyProject;open:boolean;paused:boolean;onClose:()=>void;onUpdated:(p:StudyProject)=>void;onBusyChange:(busy:boolean)=>void}){
 const runtime=useRuntimeProfile();
 const [sessions,setSessions]=useState<Record<string,Session>>({}),[position,setPosition]=useState<{x:number;y:number}|null>(null),[sending,setSending]=useState(false),[moveControls,setMoveControls]=useState(false);
 const box=useRef<HTMLElement>(null),input=useRef<HTMLTextAreaElement>(null),history=useRef<HTMLDivElement>(null),live=useRef(sessions),lock=useRef(false);
 live.current=sessions;
 const session=sessions[project.id];
 useEffect(()=>{if(!open)return;setSessions(all=>all[project.id]?all:{...all,[project.id]:{id:crypto.randomUUID(),draft:'',messages:[]}});requestAnimationFrame(()=>input.current?.focus());},[open,project.id]);
 useEffect(()=>{history.current?.scrollTo({top:history.current.scrollHeight});},[session?.messages]);
 useEffect(()=>{function fit(){const node=box.current;if(!node)return;setPosition(p=>p?{x:Math.max(8,Math.min(p.x,window.innerWidth-node.offsetWidth-8)),y:Math.max(8,Math.min(p.y,window.innerHeight-node.offsetHeight-8))}:p);}window.addEventListener('resize',fit);return()=>window.removeEventListener('resize',fit);},[]);
 function move(dx:number,dy:number){const node=box.current;if(!node)return;const rect=node.getBoundingClientRect();setPosition({x:Math.max(8,Math.min(rect.left+dx,window.innerWidth-node.offsetWidth-8)),y:Math.max(8,Math.min(rect.top+dy,window.innerHeight-node.offsetHeight-8))});}
 function close(){setSessions(all=>{const next={...all};delete next[project.id];return next;});onClose();requestAnimationFrame(()=>document.querySelector<HTMLElement>('.hint-launch')?.focus());}
 async function send(){if(lock.current||paused||!session||session.draft.trim().length<3)return;lock.current=true;setSending(true);onBusyChange(true);const projectId=project.id,sessionId=session.id,id=crypto.randomUUID(),question=session.draft.trim();
  setSessions(all=>({...all,[projectId]:{...all[projectId],draft:'',messages:[...all[projectId].messages,{id,question,pending:true}]}}));
  try{const result=await post<{response:Reply;project:StudyProject}>('/api/study/projects/'+projectId+'/hint',{question,sessionId});onUpdated(result.project);if(live.current[projectId]?.id===sessionId)setSessions(all=>({...all,[projectId]:{...all[projectId],messages:all[projectId].messages.map(m=>m.id===id?{...m,pending:false,reply:result.response}:m)}}));}
  catch(error){if(live.current[projectId]?.id===sessionId)setSessions(all=>({...all,[projectId]:{...all[projectId],messages:all[projectId].messages.map(m=>m.id===id?{...m,pending:false,error:error instanceof Error?error.message:'The AI service could not reply. Please retry.'}:m)}}));}
  finally{lock.current=false;setSending(false);onBusyChange(false);}
 }
 return <section ref={box} hidden={!open} className="floating-hints" role="dialog" aria-modal="false" aria-labelledby="hint-window-title" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close();}}} style={position?{left:position.x,top:position.y,right:'auto',bottom:'auto'}:undefined}>
  <header className="hint-window-header" onPointerDown={event=>{if((event.target as HTMLElement).closest('button')||event.button!==0)return;const node=event.currentTarget,start={x:event.clientX,y:event.clientY};node.setPointerCapture(event.pointerId);function drag(e:PointerEvent){move(e.clientX-start.x,e.clientY-start.y);start.x=e.clientX;start.y=e.clientY;}function stop(){node.removeEventListener('pointermove',drag);node.removeEventListener('pointerup',stop);node.removeEventListener('pointercancel',stop);}node.addEventListener('pointermove',drag);node.addEventListener('pointerup',stop);node.addEventListener('pointercancel',stop);}}>
   <div><h2 id="hint-window-title">Your hint session</h2><span>{project.learningPath?.featureTitle||project.snapshot.repository}</span></div>
   <button type="button" className="hint-move" aria-label="Move hint window using arrow keys" aria-expanded={moveControls} onClick={()=>setMoveControls(v=>!v)} title="Move window with arrow controls or drag the header" onKeyDown={event=>{const delta:Record<string,[number,number]>={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};if(delta[event.key]){event.preventDefault();move(...delta[event.key]);}}}>⤧</button>
   <button type="button" className="hint-close" aria-label="Close hint session" onClick={close}>×</button>
  </header>
  {moveControls&&<div className="hint-position-controls" aria-label="Move hint window"><button type="button" aria-label="Move hint window left" onClick={()=>move(-30,0)}>←</button><button type="button" aria-label="Move hint window up" onClick={()=>move(0,-30)}>↑</button><button type="button" aria-label="Move hint window down" onClick={()=>move(0,30)}>↓</button><button type="button" aria-label="Move hint window right" onClick={()=>move(30,0)}>→</button></div>}
  <div ref={history} className="hint-history" aria-live="polite" aria-relevant="additions text">
   {!session?.messages.length&&<p className="hint-empty">Ask about the code or a concept. Your conversation stays here until you close this session.</p>}
   {session?.messages.map(message=><article className="hint-exchange" key={message.id}><p className="hint-user"><strong>You</strong>{message.question}</p>{message.pending?<p role="status">{runtime.modelProvider==='meta'?'Preparing a Meta AI hint…':'Preparing your hint…'}</p>:message.error?<p role="alert">{message.error}</p>:message.reply&&<div className="hint-reply"><strong>GroundTruth</strong><p>{message.reply.feedback}</p><p>{message.reply.nextStep}</p>{message.reply.evidence?.map((e,i)=><details key={i}><summary>{e.path}</summary><pre>{e.quote}</pre></details>)}</div>}</article>)}
  </div>
  <form className="hint-composer" onSubmit={event=>{event.preventDefault();void send();}}>
   {paused&&<p role="status">Hints are paused during your independent attempt. Submit or end it to continue this session.</p>}
   <label className="sr-only" htmlFor="hint-query">Your hint question</label><textarea ref={input} id="hint-query" required minLength={3} maxLength={1000} disabled={paused||sending} value={session?.draft||''} onChange={event=>{const draft=event.target.value;setSessions(all=>all[project.id]?{...all,[project.id]:{...all[project.id],draft}}:all);}} placeholder="Ask about this workflow…"/>
   <div><HelpTip label="Hint session history">{runtime.modelProvider==='meta'?'Your query and selected source are sent to Meta to prepare a hint. ':''}Each sent query is recorded in this learning path’s activity. Closing clears this floating conversation, while saved activity remains subject to the path’s retention. Drag the header to move; resize from the bottom corner, or use the size buttons.</HelpTip><button type="button" className="hint-size" aria-label="Make hint window smaller" onClick={()=>{if(box.current){box.current.style.width=Math.max(280,box.current.offsetWidth-50)+'px';box.current.style.height=Math.max(280,box.current.offsetHeight-50)+'px';}}}>−</button><button type="button" className="hint-size" aria-label="Make hint window larger" onClick={()=>{if(box.current){box.current.style.width=Math.min(window.innerWidth-24,box.current.offsetWidth+50)+'px';box.current.style.height=Math.min(window.innerHeight-24,box.current.offsetHeight+50)+'px';move(0,0);}}}>+</button><button type="submit" className="button button-primary" disabled={paused||sending||!session?.draft.trim()}>Send</button></div>
  </form>
 </section>;
}
