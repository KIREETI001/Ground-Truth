'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, post } from '@/lib/client/api';
import type { StudyProject } from '@/lib/study/types';
import { TeacherEvidenceProject } from '../../components/teacher-projects';

type Preview = { mode: 'own-demo-preview'; readOnly: true; expiresAt: string; project: StudyProject };

export function DemoTeacherPreview() {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void api<Preview>('/api/demo/teacher').then(result => { if (active) setPreview(result); }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'The preview could not load.');
    });
    return () => { active = false; };
  }, []);
  async function leave() {
    try { await post('/api/local-auth/logout', {}); router.replace('/login'); router.refresh(); }
    catch { setError('Could not sign out. Please retry.'); }
  }
  return <>
    <section className="demo-preview-banner" aria-labelledby="demo-preview-title">
      <p className="platform-kicker">OWN SAMPLE · READ-ONLY PREVIEW</p>
      <h1 id="demo-preview-title">See the teacher perspective</h1>
      <p>This shows only your temporary sample activity. It demonstrates the evidence a teacher could review after a learner explicitly shares a project.</p>
      <p>Independent answers appear after submission. Review decisions require an approved teacher in a real classroom.</p>
      <div className="demo-preview-actions"><a className="button button-primary" href="/user">Continue my sample</a><button type="button" className="text-link" onClick={() => void leave()}>Leave sample and sign in</button></div>
    </section>
    {error ? <p role="alert" className="notice">{error}</p> : preview ? <TeacherEvidenceProject project={preview.project} readOnly/> : <p role="status" className="demo-preview-message">Loading your sample evidence…</p>}
  </>;
}
