'use client';

import { useRef, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client/api';

export function DemoEntry() {
  const router = useRouter();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function start() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const result = await post<{ next: string }>('/api/demo/start', {});
      router.replace(result.next === '/user' ? result.next : '/user');
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The sample could not open. Please retry shortly.');
      submitting.current = false; setBusy(false);
    }
  }
  return <section className="demo-entry" aria-labelledby="demo-entry-title">
    <div className="demo-entry-copy">
      <span className="demo-eyebrow"><Sparkles size={16} aria-hidden="true"/> START EXPLORING</span>
      <h2 id="demo-entry-title">Try a sample learning path</h2>
      <p>Read the code, answer a fresh question, and try a small change in your own sandbox.</p>
      <p className="demo-entry-details">No sign-up · Private session · Expires after 2 hours</p>
    </div>
    <div className="demo-entry-action">
      <button type="button" className="button button-primary" disabled={busy} onClick={() => void start()}>
        {busy ? 'Opening your sample…' : 'Try sample learning path'}<ArrowRight size={18} aria-hidden="true"/>
      </button>
      <p>Meta-prepared overview and concepts.<br/>New questions use Meta live.</p>
    </div>
    {error && <p role="alert" className="demo-entry-error">{error}</p>}
  </section>;
}
