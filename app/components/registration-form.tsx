'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client/api';
export function RegistrationForm({role}:{role:'user'|'teacher'}){
 const router=useRouter();
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);try{await post('/api/account/profile',{displayName:name,requestedRole:role});router.replace('/');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Registration failed.');setBusy(false);}}
 return <form className="login-card" onSubmit={submit}><h1>Finish your profile</h1><p>{role==='teacher'?'Your teacher request will be reviewed by an administrator.':'Start investigating your own projects.'}</p><label>Display name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><button className="button button-primary" disabled={busy}>{busy?'Saving…':'Create '+role+' profile'}</button>{error&&<p role="alert">{error}</p>}</form>;
}
