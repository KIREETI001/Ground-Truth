'use client';
import { useState } from 'react';
import { post } from '@/lib/client/api';
export function ManualReview({exerciseId,onSaved}:{exerciseId:string;onSaved:()=>Promise<void>}){
 const [level,setLevel]=useState('insufficient'),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await post('/api/study/reviews',{exerciseId,level,note});await onSaved();}catch(e){setError(e instanceof Error?e.message:'Review could not be saved.');}finally{setBusy(false);}}
 return <form onSubmit={save} className="manual-review"><h4>Your assessment of this attempt</h4><p className="pitch-caption">Teacher judgement on this task only. The model does not select the assessment.</p><label>Evidence level<select value={level} onChange={e=>setLevel(e.target.value)}><option value="insufficient">Evidence is insufficient</option><option value="supported">Needs guided support</option><option value="explained">Explains the reasoning in this task</option><option value="transferred">Demonstrates transfer on this task</option></select></label><label>Evidence and next step<textarea required minLength={10} maxLength={1500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Identify what the answer and source support, what remains uncertain, and a fresh task to try."/></label><button className="button button-outline" disabled={busy}>{busy?'Saving…':'Save human review'}</button>{error&&<p role="alert">{error}</p>}</form>;
}

