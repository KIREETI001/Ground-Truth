"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, FileClock, FlaskConical, LockKeyhole, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { Brand } from "../components/brand";
import { ErrorNotice, Journal, Loading, OutcomeSummary, phaseLabels } from "../components/lab-ui";
import type { LearningSession, Me } from "@/lib/contracts";
import { api, ApiError, formatDate, shortId } from "@/lib/client/api";

type PilotSession = { id: string; alias: string; phase: LearningSession["phase"]; createdAt: string };
type Proof = { schemaVersion: string; exportedAt: string; session: LearningSession };

export default function TutorReview() {
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [me, setMe] = useState<Me | null>(null), [sessions, setSessions] = useState<PilotSession[]>([]);
  const [authorized, setAuthorized] = useState(false), [selected, setSelected] = useState<PilotSession | null>(null), [proof, setProof] = useState<Proof | null>(null), [proofLoading, setProofLoading] = useState(false);
  async function load() {
    setLoading(true); setError("");
    try {
      const profile = await api<Me>("/api/me"); setMe(profile);
      if (!profile.authenticated) return;
      // The protected endpoint, rather than a client role flag, establishes access.
      const pilot = await api<{ sessions: PilotSession[] }>("/api/admin/pilot");
      setSessions([...pilot.sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))); setAuthorized(true);
    } catch (caught) { setAuthorized(false); setError(caught instanceof ApiError && caught.status === 403 ? "This account does not have authorized tutor access to this pilot." : caught instanceof Error ? caught.message : "The pilot records could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { let alive = true; Promise.resolve().then(() => { if (alive) void load(); }); return () => { alive = false; }; }, []);
  async function select(item: PilotSession) {
    setSelected(item); setProof(null); setProofLoading(true); setError("");
    try { setProof(await api<Proof>(`/api/admin/sessions/${encodeURIComponent(item.id)}/proof.json`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The retained record could not be loaded."); }
    finally { setProofLoading(false); }
  }
  return <div className="tutor-app"><a href="#tutor-main" className="skip-link">Skip to tutor review</a><header className="workbench-header"><div className="workbench-identity"><Brand compact /><span className="header-divider" /><span className="lab-name"><ShieldCheck size={16} /> Tutor review</span><nav className="learning-nav" aria-label="Main navigation"><Link href="/">Home</Link><a href="/learn">Learn</a><a href="/workspace">Live playground</a></nav></div><a className="header-action" href="/workspace"><ArrowLeft size={14} />My workbench</a></header><main id="tutor-main" className="tutor-main">{loading ? <Loading>Checking authorized pilot access…</Loading> : !me?.authenticated ? <section className="access-card"><div className="access-icon"><LockKeyhole size={25} /></div><p className="eyebrow">AUTHORIZED TUTOR ACCESS</p><h1>Review the<br /><em>original record.</em></h1><p>Native sign-in and server-granted tutor access are required.</p><a className="button button-primary" href="/signin-with-chatgpt?return_to=/tutor">Sign in with ChatGPT <ArrowRight size={16} /></a></section> : !authorized ? <section className="access-card"><LockKeyhole size={25} /><h1>Restricted to authorized tutors.</h1>{error && <ErrorNotice message={error} onRetry={() => void load()} />}<a className="text-link" href="/workspace">Return to my workbench <ArrowRight size={14} /></a></section> : <><div className="task-heading"><div><p className="eyebrow"><span className="status-dot" /> READ-ONLY PILOT REVIEW</p><h1>The thinking behind the result.</h1><p>Inspect original predictions and explanations alongside executed evidence. Human judgement stays with you.</p></div><button className="button button-outline button-small" onClick={() => void load()}><RefreshCw size={14} />Refresh pilot</button></div><div className="tutor-boundary"><ShieldCheck size={17} /><p>Pseudonymous participant records. No in-app grading, saved tutor notes, or automated mastery judgements. Use the separate pilot kit for manual review.</p></div>{error && <ErrorNotice message={error} onDismiss={() => setError("")} />}<div className="tutor-layout"><aside className="card tutor-roster"><div className="panel-header"><h2>Pilot activities</h2><span className="tag tag-neutral">{sessions.length}</span></div>{sessions.length ? <div className="roster-list">{sessions.map(item => <button className={selected?.id === item.id ? "selected" : ""} key={item.id} onClick={() => void select(item)} disabled={proofLoading}><span className="participant-avatar">{item.alias.slice(-2)}</span><span><strong>{item.alias}</strong><span>{phaseLabels[item.phase]}</span><small>{formatDate(item.createdAt, false)}</small></span><ArrowRight size={14} /></button>)}</div> : <div className="empty-state"><FileClock size={24} /><h3>No retained activities yet.</h3><p>Participant sessions appear here when the authorized API returns them.</p></div>}</aside><section className="tutor-record">{proofLoading ? <Loading>Loading the original activity record…</Loading> : proof && selected ? <><div className="review-heading"><div><span className="tag tag-neutral">{selected.alias}</span><h2>{phaseLabels[proof.session.phase]}</h2><p>Started {formatDate(proof.session.createdAt)} · {proof.session.cases.filter(item => item.evidence).length} finalized runs</p></div><div className="button-row"><a className="button button-outline button-small" href={`/api/admin/sessions/${selected.id}/proof.json`} download={`groundtruth-${selected.alias}.json`}><Download size={14} />Download</a><button className="button button-outline button-small" onClick={() => window.print()}><Printer size={14} />Print</button></div></div><section className="card"><div className="panel-header"><h3>Executed record</h3><span className="tag tag-teal">Server export</span></div><OutcomeSummary session={proof.session} /></section><Journal session={proof.session} /><details className="card tutor-raw"><summary>Inspect complete retained proof <ArrowRight size={14} /></summary><pre className="raw-json">{JSON.stringify(proof, null, 2)}</pre></details><p className="field-hint">Activity {shortId(proof.session.id)} · Exported {formatDate(proof.exportedAt)} · Digests are reproducibility checksums, not cryptographic signatures.</p></> : <div className="card tutor-empty"><FlaskConical size={30} /><p className="eyebrow">FOLLOW THE EVIDENCE</p><h2>Choose an activity<br /><em>to begin your review.</em></h2><p>Read the participant’s original prediction before examining their evidence and revised explanation.</p></div>}</section></div></>}</main></div>;
}
