'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client/api';
export function SignOutButton(){const router=useRouter();const [busy,setBusy]=useState(false),[error,setError]=useState('');return <><button disabled={busy} className="text-link" onClick={()=>{setBusy(true);void post('/api/local-auth/logout',{}).then(()=>{router.replace('/login');router.refresh();}).catch(()=>{setError('Sign-out failed. Retry.');setBusy(false);});}}>{busy?'Signing out…':'Sign out'}</button>{error&&<span role="alert">{error}</span>}</>;}

