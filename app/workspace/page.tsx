"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCheck, ChevronDown, Code2, Database, Download, ExternalLink, FileClock, FlaskConical, HelpCircle, History, Info, LoaderCircle, LockKeyhole, LogIn, Plus, Printer, RefreshCw, ScanLine, Settings2, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { Brand } from "../components/brand";
import { ErrorNotice, EvidencePanel, ExplanationForm, fixtureLabels, Journal, Loading, Modal, OutcomeSummary, phaseLabels, PredictionForm, RunProgress, SourcePanel, type ExplanationInput, type PredictionInput } from "../components/lab-ui";
import { api, ApiError, finishRequest, formatDate, post, requestId, shortId } from "@/lib/client/api";
import type { CoachResult, FixtureId, LearningSession, Me, RunPlan, SourceView } from "@/lib/contracts";
import { acknowledgePractice, completeRun, prepareRun, workspaceAccess } from "@/lib/client/workspace";

type SessionListItem = { id: string; phase: LearningSession["phase"]; createdAt: string; expiresAt: string };
type RunState = { plan: RunPlan; completedStepIds: string[]; status: string };
const enrollmentSecurityNotice = "An account-linked enrollment security counter limits code attempts for ten minutes. Deleting learning activity does not clear an active counter. Expired counters are removed during moderator cleanup or a later deletion request; cleanup is not automatic.";
const guidedFixtures: FixtureId[] = ["lost-success.v1", "concurrent-retry.v1", "fail-before-commit.v1"];

export default function Workspace() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [sources, setSources] = useState<Record<string, SourceView>>({});
  const [plans, setPlans] = useState<Record<string, RunPlan>>({});
  const [sourceError, setSourceError] = useState("");
  const [sourceRetry, setSourceRetry] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState("");
  const operation = useRef(false);
  const [modal, setModal] = useState<"history" | "account" | "activities" | "glossary" | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [runMessages, setRunMessages] = useState<string[]>([]);
  const [coach, setCoach] = useState<{ caseId: string; result: CoachResult } | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachError, setCoachError] = useState("");
  const coachAbort = useRef<AbortController | null>(null);
  const activityRef = useRef<HTMLElement>(null);

  const loadSession = useCallback(async (id: string) => {
    const data = await api<LearningSession>(`/api/sessions/${encodeURIComponent(id)}`);
    setSession(data);
    setCaseId(previous => {
      if (data.cases.some(item => item.id === previous && item.phase === data.phase)) return previous;
      const fixture = data.phase === "baseline" || data.phase === "repair" ? "lost-success.v1" : "intent-lifecycle.v1";
      return data.cases.find(item => item.phase === data.phase && item.fixtureId === fixture)?.id ?? data.cases.at(-1)?.id ?? null;
    });
    try { localStorage.setItem("gt:active-session", id); } catch { /* Server work does not depend on browser storage. */ }
    return data;
  }, []);

  const loadSessions = useCallback(async () => {
    const data = await api<{ sessions: SessionListItem[] }>("/api/sessions");
    const list = [...data.sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setSessions(list);
    let preferred: string | null = null;
    try { preferred = localStorage.getItem("gt:active-session"); } catch { /* Resume most recent if storage is unavailable. */ }
    const selected = list.find(item => item.id === preferred) ?? list.find(item => item.phase !== "complete") ?? list[0];
    if (selected) await loadSession(selected.id);
  }, [loadSession]);

  const bootstrap = useCallback(async () => {
    setLoading(true); setError("");
    try { const profile = await api<Me>("/api/me"); setMe(profile); if (profile.authenticated && profile.enrolled && profile.noticeAcknowledged) await loadSessions(); }
    catch (caught) { setError(message(caught)); }
    finally { setLoading(false); }
  }, [loadSessions]);
  useEffect(() => { let alive = true; Promise.resolve().then(() => { if (alive) void bootstrap(); }); return () => { alive = false; }; }, [bootstrap]);

  const unfinished = session?.cases.find(item => item.runId && !item.evidence);
  const active = session?.cases.find(item => item.id === caseId) ?? null;
  const source = active ? sources[active.id] : undefined;
  const independent = session?.phase === "transfer" || session?.phase === "transfer_repair";
  const required = session?.cases.find(item => item.phase === session.phase && item.fixtureId === (independent ? "intent-lifecycle.v1" : "lost-success.v1"));
  const previousPhase = session?.phase === "repair" ? "baseline" : session?.phase === "transfer_repair" ? "transfer" : null;
  const previousCase = previousPhase && active ? session?.cases.find(item => item.phase === previousPhase && item.fixtureId === active.fixtureId) : undefined;
  const previousSource = previousCase ? sources[previousCase.id] : undefined;
  const currentSessionId = session?.id;

  useEffect(() => {
    if (!currentSessionId || !active) return;
    let alive = true;
    const needed = [active, ...(previousCase ? [previousCase] : [])].filter(item => !sources[item.id]);
    if (needed.length) void Promise.all(needed.map(async item => ({ id: item.id, source: await api<SourceView>(`/api/sessions/${currentSessionId}/source?caseId=${encodeURIComponent(item.id)}`) }))).then(values => { if (alive) { setSources(current => ({ ...current, ...Object.fromEntries(values.map(item => [item.id, item.source])) })); setSourceError(""); } }).catch(caught => { if (alive) setSourceError(message(caught)); });
    return () => { alive = false; };
  }, [currentSessionId, active, previousCase, sources, sourceRetry]);

  useEffect(() => {
    if (!active?.runId || plans[active.runId]) return;
    let alive = true;
    void api<RunState>(`/api/runs/${encodeURIComponent(active.runId)}`).then(value => { if (alive) setPlans(current => ({ ...current, [value.plan.runId]: value.plan })); }).catch(() => { /* Resume reconciles unfinished runs; saved evidence remains visible. */ });
    return () => { alive = false; };
  }, [active?.runId, plans]);

  useEffect(() => {
    coachAbort.current?.abort();
    let alive = true;
    Promise.resolve().then(() => { if (alive) { setSourceOpen(false); setCoach(null); setCoachError(""); setCoachBusy(false); } });
    return () => { alive = false; coachAbort.current?.abort(); };
  }, [caseId, session?.phase]);

  async function perform(label: string, work: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true; setBusy(label); setError(""); setSuccess("");
    try { await work(); }
    catch (caught) {
      setError(message(caught));
      if (caught instanceof ApiError && caught.status === 401) setSuccess("Sign in again to continue with your saved activity.");
      if (caught instanceof ApiError && caught.code === "RUN_IN_PROGRESS" && session) {
        try {
          const refreshed = await loadSession(session.id);
          const pending = refreshed.cases.find(item => item.runId && !item.evidence);
          if (pending) setCaseId(pending.id);
        } catch { /* Keep the original error and allow a manual refresh. */ }
      }
    }
    finally { operation.current = false; setBusy(""); }
  }

  async function mutate(action: string, path: string, body: Record<string, unknown>) {
    if (!session) return;
    const key = `${session.id}:${action}`;
    await post(path, { ...body, requestId: requestId(key) });
    await loadSession(session.id);
    finishRequest(key);
  }

  async function createSession() {
    await perform("create", async () => {
      const key = "create-session";
      const data = await post<{ sessionId: string }>("/api/sessions", { requestId: requestId(key) });
      await loadSession(data.sessionId); finishRequest(key);
      const list = await api<{ sessions: SessionListItem[] }>("/api/sessions"); setSessions(list.sessions);
    });
  }

  async function executeRun() {
    if (!session || !active?.prediction) return;
    const currentSessionId = session.id, investigation = active;
    await perform("run", async () => {
      setRunMessages(["Checking the saved run state"]);
      const prepared = await prepareRun(currentSessionId, investigation);
      let state = await api<RunState>(`/api/runs/${prepared.runId}`);
      const plan = state.plan;
      setPlans(current => ({ ...current, [plan.runId]: plan }));
      if (state.status === "infra_error") throw new Error("Run incomplete — final database state not verified. The server marked an infrastructure error. Available receipts remain saved; ask your moderator to review the run.");
      if (new Date(plan.expiresAt).getTime() <= Date.now() && state.status !== "complete") throw new Error("This run has expired. Available receipts remain saved; it cannot be reported as a completed test.");
      setRunMessages(current => [...current, `Run prepared · ${state.completedStepIds.length} of ${plan.steps.length} request steps already recorded`]);
      const groups = [...new Set(plan.steps.map(item => item.group))].sort((a, b) => a - b);
      for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const steps = plan.steps.filter(item => item.group === groups[groupIndex] && !state.completedStepIds.includes(item.stepId));
        if (!steps.length) continue;
        setRunMessages(current => [...current, `Sending action group ${groupIndex + 1}${steps.length > 1 ? ` · ${steps.length} parallel HTTP requests` : " · one HTTP request"}`]);
        const attempts = await Promise.all(steps.map(async step => {
          try {
            const response = await fetch(`/api/lab/runs/${plan.runId}/registrations`, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", "X-GT-Step-Id": step.stepId, ...(step.idempotencyKey ? { "Idempotency-Key": step.idempotencyKey } : {}) }, body: JSON.stringify(step.payload) });
            const body = await response.json().catch(() => null);
            const detail = body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" ? body.error : null;
            const description = detail && "message" in detail && typeof detail.message === "string" ? detail.message : undefined;
            return { stepId: step.stepId, status: response.status, error: description };
          } catch { return { stepId: step.stepId, status: null, error: "The connection was interrupted before a response was received." }; }
        }));
        state = await api<RunState>(`/api/runs/${plan.runId}`);
        const missing = attempts.filter(attempt => !state.completedStepIds.includes(attempt.stepId));
        if (missing.length) throw new Error(`${missing[0].error ?? "A request has no confirmed server receipt."} Run incomplete — final database state not verified. Use Resume run to reconcile saved receipts; completed requests will not be executed again.`);
        setRunMessages(current => [...current, `Confirmed ${state.completedStepIds.length} of ${plan.steps.length} request receipts`]);
      }
      setRunMessages(current => [...current, "Reading persisted registrations and finalizing evidence"]);
      await completeRun(plan.runId, () => loadSession(currentSessionId));
      setSuccess("Run complete. The records below came from the executed HTTP fixture.");
      setRunMessages([]);
    });
  }

  async function savePrediction(input: PredictionInput) {
    if (!session || !active) return;
    await perform("prediction", async () => { await mutate(`prediction:${active.id}`, `/api/sessions/${session.id}/predictions`, { caseId: active.id, ...input }); setSuccess("Prediction saved. You can now run this test."); });
  }
  async function saveExplanation(body: ExplanationInput) {
    if (!session || !active?.runId) return;
    await perform("explanation", async () => { await mutate(`explanation:${active.id}`, `/api/sessions/${session.id}/explanations`, { caseId: active.id, runId: active.runId, body }); setSuccess("Your explanation has been saved as written."); });
  }
  async function applyPatch(reason: string) {
    if (!session) return;
    const transfer = session.phase === "transfer";
    await perform("patch", async () => { await mutate(`patch:${session.phase}`, `/api/sessions/${session.id}/patches`, { patchId: transfer ? "new-intent-new-key.v1" : "idempotent-intent.v1", reason }); setSuccess("The reviewed patch is applied. Inspect the actual sources and save a fresh prediction."); activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }
  async function advance() {
    if (!session) return;
    await perform("advance", async () => { await mutate(`advance:${session.phase}`, `/api/sessions/${session.id}/advance`, {}); activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }
  async function recordDecision(decision: "accepted" | "changed" | "rejected", reason: string) {
    if (!session || !active) return;
    await mutate(`suggestion:${active.id}:${decision}`, `/api/sessions/${session.id}/suggestion-decisions`, { caseId: active.id, decision, reason });
  }
  async function openProbe(fixtureId: FixtureId, reason: string, selectionSource: "student" | "coach" = "student", decision?: "accepted" | "changed") {
    if (!session) return;
    await perform("probe", async () => {
      if (decision) await recordDecision(decision, reason);
      const existing = session.cases.find(item => item.phase === session.phase && item.fixtureId === fixtureId);
      if (existing) { setCaseId(existing.id); return; }
      const key = `${session.id}:case:${session.phase}:${fixtureId}`;
      const data = await post<{ caseId: string }>(`/api/sessions/${session.id}/cases`, { fixtureId, selectionSource, selectionReason: reason, requestId: requestId(key) });
      await loadSession(session.id); setCaseId(data.caseId); finishRequest(key);
      setSuccess("New probe opened. Commit a new prediction before running it.");
    });
  }
  async function getCoach() {
    if (!session || !active || independent || coachBusy) return;
    const controller = new AbortController(); coachAbort.current = controller; setCoachBusy(true); setCoachError("");
    try { const result = await api<CoachResult>("/api/coach", { method: "POST", body: JSON.stringify({ sessionId: session.id, caseId: active.id }), signal: controller.signal }); if (!controller.signal.aborted) setCoach({ caseId: active.id, result }); }
    catch (caught) { if (!controller.signal.aborted) setCoachError(message(caught)); }
    finally { if (!controller.signal.aborted) setCoachBusy(false); }
  }

  const phase = session?.phase ?? "baseline";
  const stageIndex = phase === "complete" ? 5 : phase === "transfer" || phase === "transfer_repair" ? 4 : phase === "repair" ? 3 : active?.explanation ? 3 : active?.evidence ? 2 : active?.prediction ? 1 : 0;
  const currentPhaseCases = session?.cases.filter(item => item.phase === session.phase) ?? [];
  const lastSaved = session ? latestSaved(session) : null;

  return <div className="workbench-app"><a href="#activity-main" className="skip-link">Skip to activity</a><header className="workbench-header"><div className="workbench-identity"><Brand compact /><span className="header-divider" /><span className="lab-name"><FlaskConical size={15} /> Campus event signup</span></div><div className="workbench-header-actions">{session && <span className="save-status"><CheckCheck size={14} /><span>Saved activity</span></span>}{me?.instructor && <a href="/tutor" className="header-action">Tutor review <ExternalLink size={13} /></a>}{session && <button className="header-action" onClick={() => setModal("history")}><History size={16} /><span>Activity history</span></button>}<button className="icon-button account-button" disabled={!me} onClick={() => setModal("account")} aria-label="Account and data settings"><Settings2 size={18} /></button></div></header>
    {loading ? <main id="activity-main" className="access-main"><Loading /></main> : !me ? <main id="activity-main" className="access-main"><div className="access-card"><div className="access-icon"><FlaskConical size={26} /></div><h1>The lab is taking a moment.</h1>{error && <ErrorNotice message={error} onRetry={() => void bootstrap()} />}</div></main> : workspaceAccess(me) === "signin" ? <AccessShell eyebrow="WELCOME TO THE LAB" title={<>A place to test<br /><em>your thinking.</em></>}><p>Sign in with your ChatGPT account to keep your predictions, executed evidence, and explanations together.</p><a href="/signin-with-chatgpt?return_to=/workspace" className="button button-primary button-full"><LogIn size={17} />Continue with ChatGPT<ArrowRight size={16} /></a><p className="access-small">Native sign-in establishes ownership of your work. A moderator’s code is required for this pilot.</p></AccessShell> : workspaceAccess(me) === "enrollment" ? <AccessShell eyebrow="SMALL PILOT · REAL INVESTIGATION" title={<>Your seat<br /><em>at the workbench.</em></>}><p>Enter the pilot code shared by your moderator. Each participant’s activity is private to them and their authorized tutor.</p>{error && <ErrorNotice message={error} onDismiss={() => setError("")} />}{success && <div className="notice notice-success" role="status">{success}</div>}<EnrollmentForm busy={!!busy} pilotOpen={me.pilotOpen} onSubmit={code => perform("enroll", async () => { await post("/api/pilot/enroll", { code }); const profile = await api<Me>("/api/me"); setMe(profile); if (profile.noticeAcknowledged) await loadSessions(); })} /></AccessShell> : workspaceAccess(me) === "notice" ? <AccessShell eyebrow="BEFORE YOU START" title={<>Your practice.<br /><em>Your choice.</em></>} wide><ParticipationForm busy={!!busy} error={error} onSubmit={optIn => perform("notice", async () => { setMe(await acknowledgePractice(optIn, loadSessions)); })} /></AccessShell> : !session ? <AccessShell eyebrow="CAMPUS EVENT SIGNUP / LAB 001" title={<>Start with<br /><em>a question.</em></>}><p>One intended signup should save one registration. A genuinely new signup should still be possible. What happens when the response doesn’t reach the client?</p><div className="welcome-checklist"><span><ScanLine size={16} /> Predict before seeing results</span><span><Database size={16} /> Inspect actual persisted records</span><span><BookOpen size={16} /> Finish with an independent case</span></div>{error && <ErrorNotice message={error} onDismiss={() => setError("")} />}<button className="button button-primary button-full" onClick={() => void createSession()} disabled={!!busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}Start a new activity<ArrowRight size={16} /></button><p className="access-small">Ungraded · About 20–30 minutes · Synthetic data only</p></AccessShell> : <div className="workbench-shell"><aside className="stage-rail" aria-label="Activity stages"><div className="rail-lab"><span className="mono-label">YOUR INVESTIGATION</span><strong>Lab 001</strong><span>Campus event signup</span></div><ol className="stage-list">{["Predict", "Run & observe", "Explain", "Repair & retest", "Independent case"].map((label, index) => <li key={label} className={`${stageIndex === index ? "current" : ""}${stageIndex > index ? " completed" : ""}`} aria-current={stageIndex === index ? "step" : undefined}><span className="stage-number">{stageIndex > index ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span><span>{label}</span>{index > stageIndex && <LockKeyhole size={11} className="stage-lock" />}</li>)}</ol><div className="rail-foot"><button onClick={() => setModal("glossary")}><HelpCircle size={15} /> Lab glossary</button><button onClick={() => setModal("activities")}><FileClock size={15} /> My activities</button><div><span className="status-dot" /> Saved for practice,<br />reviewed by your tutor.</div></div></aside><main id="activity-main" className="activity-main" ref={activityRef}><div className="activity-breadcrumb"><span>Learning lab</span><span>/</span><strong>Campus event signup</strong><span className="tag tag-neutral">Synthetic data</span></div>{error && <ErrorNotice message={error} onDismiss={() => setError("")} onRetry={busy ? undefined : () => void perform("refresh", async () => { await loadSession(session.id); })} />}{success && <div className="notice notice-success" role="status"><CheckCheck size={17} /><span>{success}</span><button aria-label="Dismiss saved status" className="icon-button" onClick={() => setSuccess("")}><X size={15} /></button></div>}{session.phase === "complete" ? <Completion session={session} onHistory={() => setModal("history")} /> : <><div className="task-heading"><div><p className="eyebrow"><span className="status-dot" />{phaseLabels[session.phase]}{independent && " · AI PAUSED"}</p><h1>{phaseTitle(session.phase)}</h1><p>{phaseDescription(session.phase)}</p></div><span className="lab-badge"><FlaskConical size={19} /><span>LAB<strong>001</strong></span></span></div>{independent && <div className="independent-strip"><LockKeyhole size={16} /><div><strong>This case is yours to investigate.</strong><span>Source, evidence tools, and saved work remain available. AI coaching is paused.</span></div></div>}<div className="requirement-strip"><ShieldCheck size={18} /><div><strong>The signup requirement</strong><p>One intended signup should produce one registration. A genuinely new signup should remain possible.</p></div></div>{currentPhaseCases.length > 1 && <nav className="case-tabs" aria-label="Investigation cases">{currentPhaseCases.map(item => <button key={item.id} className={item.id === active?.id ? "active" : ""} onClick={() => setCaseId(item.id)} disabled={!!busy}>{item.fixtureId === "lost-success.v1" ? "Required case" : fixtureLabels[item.fixtureId]}{item.evidence && <CheckCheck size={13} />}</button>)}</nav>}{active && source ? <><div className="case-meta"><span><span className="status-dot" />{fixtureLabels[active.fixtureId]}</span><code>{shortId(active.id)}</code></div>{busy === "run" && <RunProgress messages={runMessages} />}{active.runId && !active.evidence && busy !== "run" && <div className="notice notice-neutral"><Info size={18} /><div><strong>An unfinished run is saved.</strong><p>Resume checks the server’s receipts and sends only missing planned steps. Existing writes will not be repeated.</p></div></div>}<div className="investigation-grid"><PredictionForm key={`prediction-${active.id}`} investigation={active} source={source} busy={!!busy} onSave={savePrediction} onRun={() => void executeRun()} runLabel={active.runId ? "Check & resume run" : session.phase === "repair" ? "Run verification" : independent ? "Run independent test" : "Run this test"} /><div className="evidence-column">{active.evidence && !sourceOpen ? <EvidencePanel key={`evidence-${active.id}`} investigation={active} plan={active.runId ? plans[active.runId] : undefined} onViewSource={() => setSourceOpen(true)} /> : <>{active.evidence && <button className="text-link back-to-evidence" onClick={() => setSourceOpen(false)}><ArrowLeft size={14} /> Back to executed evidence</button>}<SourcePanel key={`source-${active.id}`} source={source} investigation={active} previousSource={previousSource} /></>}</div></div>{active.evidence && <ExplanationForm key={`explanation-${active.id}`} investigation={active} busy={!!busy} onSave={saveExplanation} />}{!independent && active.prediction && <InvestigationSupport aiAvailable={me.aiAvailable} result={coach?.caseId === active.id ? coach.result : null} busy={!!busy} coachBusy={coachBusy} coachError={coachError} onCoach={() => void getCoach()} onCancelCoach={() => { coachAbort.current?.abort(); setCoachBusy(false); }} onProbe={openProbe} onSkip={reason => perform("suggestion", async () => { await recordDecision("rejected", reason); setCoach(null); setSuccess("Your decision and reason were saved."); })} />}{required && active.id !== required.id && <div className="return-required"><Info size={17} /><p>This is an additional probe. Continue the main journey from the required case.</p><button className="button button-outline button-small" disabled={!!busy} onClick={() => setCaseId(required.id)}>Return to required case <ArrowRight size={14} /></button></div>}{unfinished && active.id !== unfinished.id && <div className="notice notice-neutral"><Info size={18} /><div><strong>Finish your saved probe before continuing.</strong><p>Its run needs finalized evidence before the activity can move to the next phase.</p><button className="button button-outline button-small" disabled={!!busy} onClick={() => setCaseId(unfinished.id)}>Return to unfinished probe <ArrowRight size={14} /></button></div></div>}{required?.explanation && active.id === required.id && (session.phase === "baseline" || session.phase === "transfer") && <PatchReview key={session.phase} transfer={session.phase === "transfer"} busy={!!busy || !!unfinished} onApply={applyPatch} />}{required?.explanation && active.id === required.id && (session.phase === "repair" || session.phase === "transfer_repair") && <section className="next-stage-card"><span className="panel-icon"><CheckCheck size={19} /></span><div><p className="eyebrow">{session.phase === "repair" ? "READY FOR A FRESH CASE" : "YOUR RECORD IS READY"}</p><h2>{session.phase === "repair" ? "Take your explanation somewhere new." : "Submit your activity for tutor review."}</h2><p>{session.phase === "repair" ? "The independent case uses a new scenario. You’ll predict and explain it without AI prompts." : "Your original predictions, executed evidence, explanations, and reviewed changes will stay together."}</p></div><button className="button button-primary" disabled={!!busy || !!unfinished} onClick={() => void advance()}>{busy === "advance" ? <LoaderCircle className="spin" size={16} /> : null}{session.phase === "repair" ? "Start independent case" : "Finish activity"}<ArrowRight size={16} /></button></section>}</> : sourceError ? <ErrorNotice message={sourceError} onRetry={() => setSourceRetry(value => value + 1)} /> : <Loading>Loading the supplied source…</Loading>}</>}<footer className="activity-footer"><span><LockKeyhole size={12} /> Saved work available until {formatDate(session.expiresAt, false)}</span><span>{lastSaved ? `Last saved ${formatDate(lastSaved)}` : `Created ${formatDate(session.createdAt)}`}</span></footer></main></div>}
    {modal === "history" && session && <Modal title="Your activity history" onClose={() => setModal(null)} wide>{independent && !required?.explanation ? <div className="empty-state"><LockKeyhole size={24} /><h3>Your earlier work is safely saved.</h3><p>Complete this independent explanation before reopening the previous case’s reasoning. Your current prediction and evidence remain available in the workbench.</p></div> : <><div className="modal-toolbar"><a className="button button-outline button-small" href={`/api/sessions/${session.id}/proof.json`} download="groundtruth-record.json"><Download size={14} />Download record</a><button className="button button-outline button-small" onClick={() => window.print()}><Printer size={14} />Print record</button></div><Journal session={session} /></>}</Modal>}
    {modal === "account" && me && <Modal title="Account & your data" onClose={() => setModal(null)}><AccountSettings me={me} busy={!!busy} error={error} onConsent={optIn => perform("consent", async () => { await api("/api/me/research-consent", { method: "PATCH", body: JSON.stringify({ optIn }) }); setMe(await api<Me>("/api/me")); setSuccess("Your research choice has been saved."); })} onDelete={() => perform("delete", async () => { await api("/api/activity", { method: "DELETE" }); try { for (const storage of [localStorage, sessionStorage]) { for (const key of Object.keys(storage)) if (key.startsWith("gt:")) storage.removeItem(key); } } catch { /* The server deletion is complete even when browser storage is unavailable. */ } setSession(null); setCaseId(null); setSessions([]); setSources({}); setPlans({}); setMe(await api<Me>("/api/me")); setModal(null); setSuccess("Your saved activity and pilot membership were deleted. Any enrollment cooldown remains in effect for its ten-minute window. Expired security counters are removed during moderator cleanup or a later deletion request."); })} /></Modal>}
    {modal === "activities" && <Modal title="My saved activities" onClose={() => setModal(null)}><div className="activity-picker">{sessions.map(item => <button key={item.id} className={item.id === session?.id ? "selected" : ""} disabled={!!busy} onClick={() => void perform("resume", async () => { await loadSession(item.id); setModal(null); })}><span className="panel-icon"><FlaskConical size={18} /></span><span><strong>{phaseLabels[item.phase]}</strong><span>Started {formatDate(item.createdAt)}</span><code>{shortId(item.id)}</code></span><ArrowRight size={17} /></button>)}</div><button className="button button-outline button-full" disabled={!!busy} onClick={() => { setModal(null); void createSession(); }}><Plus size={15} /> Start another activity</button><p className="field-hint">Each activity has separate records and its own 30-day availability window.</p></Modal>}
    {modal === "glossary" && <Modal title="A few useful distinctions" onClose={() => setModal(null)}><dl className="glossary"><dt>Intended action</dt><dd>What the person means to do, such as sign up once for one event.</dd><dt>Request attempt</dt><dd>One HTTP request. The same intended action can have more than one attempt.</dd><dt>Client response</dt><dd>What the browser receives. Read it alongside the server’s commit records.</dd><dt>Persisted registration</dt><dd>A row saved by the supplied app in this run’s database namespace.</dd><dt>Idempotency key</dt><dd>A client-supplied value the handler can use to recognize related request attempts. Its behavior depends on the actual code.</dd><dt>Controlled fault</dt><dd>An intervention supplied by the lab, such as discarding a successful response. It is labelled in the final trace.</dd><dt>Evidence digest</dt><dd>A reproducibility checksum of a record. It is not a signature or a guarantee about untested behavior.</dd></dl></Modal>}
    {session && <div className="print-only"><h1>GroundTruth activity record</h1><p>{phaseLabels[session.phase]} · Created {formatDate(session.createdAt)} · Available until {formatDate(session.expiresAt)}</p><p>Activity {session.id} · Synthetic campus data · Real HTTP fixture evidence</p><OutcomeSummary session={session} /><Journal session={session} /></div>}
  </div>;
}

function message(caught: unknown) { return caught instanceof Error ? caught.message : "An unexpected error interrupted this step. Your previously saved work is retained."; }
function latestSaved(session: LearningSession) { const times = [session.createdAt, ...session.cases.flatMap(item => [item.prediction?.lockedAt, item.evidence?.finalizedAt, item.explanation?.lockedAt].filter((value): value is string => !!value)), ...session.patches.map(item => item.selectedAt)]; return times.sort().at(-1)!; }
function phaseTitle(phase: LearningSession["phase"]) { return ({ baseline: "What happens when a response goes missing?", repair: "Put the reviewed change to the test.", transfer: "A retry. And a genuinely new signup.", transfer_repair: "Test the boundary for a new intent.", complete: "Your investigation, on the record." })[phase]; }
function phaseDescription(phase: LearningSession["phase"]) { return ({ baseline: "Read the supplied app, commit your prediction, then let the records tell the story.", repair: "The code variant has changed. Start from a fresh prediction and zero registrations.", transfer: "Sign up for event A, retry A, then try event B. The supplied client keeps one key for the browser session.", transfer_repair: "Your independent explanation is locked. Predict and execute the reviewed client change in a fresh run.", complete: "Your original thinking and executed evidence are ready for review." })[phase]; }

function AccessShell({ eyebrow, title, children, wide = false }: { eyebrow: string; title: React.ReactNode; children: React.ReactNode; wide?: boolean }) { return <main id="activity-main" className="access-main"><div className={`access-card${wide ? " access-card-wide" : ""}`}><div className="access-icon"><FlaskConical size={24} /></div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}<Link href="/" className="access-back"><ArrowLeft size={13} /> About GroundTruth</Link></div><p className="access-bottom"><LockKeyhole size={12} /> A focused learning lab. Supplied code. Synthetic data.</p></main>; }
function EnrollmentForm({ busy, pilotOpen, onSubmit }: { busy: boolean; pilotOpen: boolean; onSubmit: (code: string) => Promise<void> }) { const [code, setCode] = useState(""); return <form onSubmit={event => { event.preventDefault(); void onSubmit(code.trim()); }}>{!pilotOpen && <div className="notice notice-neutral"><Info size={17} /><p>Enrollment is currently closed. Your moderator can confirm when the pilot opens.</p></div>}<label className="field-label" htmlFor="pilot-code">Pilot code<input id="pilot-code" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} value={code} onChange={event => setCode(event.target.value)} required maxLength={128} placeholder="Enter your moderator’s code" disabled={!pilotOpen || busy} /></label><button className="button button-primary button-full" type="submit" disabled={busy || !pilotOpen || !code.trim()}>{busy ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}Join the pilot</button></form>; }
function ParticipationForm({ busy, error, onSubmit }: { busy: boolean; error: string; onSubmit: (optIn: boolean) => Promise<void> }) { const [optIn, setOptIn] = useState(false); return <form onSubmit={event => { event.preventDefault(); void onSubmit(optIn); }}><div className="participation-copy"><p>Your answers and test history are saved for practice and read-only review by your authorized tutor. You can download or print your own record.</p><p>Your activity is available for 30 days from creation. You can delete retained activity and withdraw your optional research choice in account settings. Downloaded copies and provider-managed retention are outside that deletion.</p><p>{enrollmentSecurityNotice}</p><p>You may optionally allow de-identified counts, timings, and manually recorded rubric scores to be included in pilot analysis. Your written answers, quotations, and tutor notes are excluded from that analysis and its exports.</p></div><label className="research-choice"><input type="checkbox" checked={optIn} onChange={event => setOptIn(event.target.checked)} /><span><strong>Allow optional pilot research use</strong><span>Declining does not affect practice, tutor support, or your own export.</span></span><span className="tag tag-neutral">Optional</span></label>{error && <ErrorNotice message={error} />}<button className="button button-primary button-full" disabled={busy} type="submit">{busy ? <LoaderCircle className="spin" size={16} /> : null}Acknowledge & continue<ArrowRight size={16} /></button><p className="access-small">Both research choices enter the same lab with the same support.</p></form>; }

function PatchReview({ transfer, busy, onApply }: { transfer: boolean; busy: boolean; onApply: (reason: string) => Promise<void> }) { const [open, setOpen] = useState(false), [reason, setReason] = useState(""); return <section className="card patch-card"><div className="panel-header"><div className="panel-title"><span className="panel-icon"><Code2 size={19} /></span><div><span className="mono-label">INSTRUCTOR-REVIEWED CODE CHANGE</span><h2>{transfer ? "Review the client repair" : "Review the supplied patch"}</h2></div></div><span className="tag tag-neutral">One available patch</span></div><div className="panel-content"><p>This MVP supplies one executable, reviewed patch at this stage. It does not compare multiple student-authored fixes or run arbitrary code.</p>{!open ? <button className="button button-outline" onClick={() => setOpen(true)}>Review code change <ArrowRight size={15} /></button> : <form onSubmit={event => { event.preventDefault(); if (reason.trim()) void onApply(reason.trim()); }}><div className="reviewed-patch"><span className="tag tag-teal"><ShieldCheck size={13} /> Reviewed supplied variant</span><h3>{transfer ? "Create a fresh key for each new signup intent" : "Persist and replay the signup intent"}</h3><p>{transfer ? "The client creates a new key for a new intended signup and preserves that key for retries of the same action." : "The client keeps a key for the intended signup. The server persists the result atomically and replays that result when the same key and input are sent again."}</p><code>{transfer ? "new-intent-new-key.v1" : "idempotent-intent.v1"}</code><p className="field-hint">Applying selects the actual executable variant. Its client and server sources, with the previous version, are available in “Applied change” before you run verification.</p></div><label className="field-label" htmlFor="patch-reason">Why should this change address the evidence you observed?<textarea id="patch-reason" rows={4} maxLength={1000} value={reason} required onChange={event => setReason(event.target.value)} placeholder="This change addresses … because the evidence showed …" /></label><button className="button button-primary" disabled={busy || !reason.trim()} type="submit">{busy ? <LoaderCircle className="spin" size={16} /> : <Code2 size={16} />}Apply reviewed patch<ArrowRight size={16} /></button></form>}</div></section>; }

function InvestigationSupport({ aiAvailable, result, busy, coachBusy, coachError, onCoach, onCancelCoach, onProbe, onSkip }: { aiAvailable: boolean; result: CoachResult | null; busy: boolean; coachBusy: boolean; coachError: string; onCoach: () => void; onCancelCoach: () => void; onProbe: (fixtureId: FixtureId, reason: string, source?: "student" | "coach", decision?: "accepted" | "changed") => Promise<void>; onSkip: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [fixture, setFixture] = useState<FixtureId>("concurrent-retry.v1");
  const [change, setChange] = useState(false);
  const decision = result?.decision;
  return <section className="investigation-support"><div className="support-heading"><div><Sparkles size={19} /><h2>Another angle, if you need one.</h2><span className="tag tag-neutral">Optional</span></div><p>Choose your next investigation. Suggestions are separate from executed evidence.</p></div>{coachError && <ErrorNotice message={coachError} onRetry={onCoach} />}{coachBusy ? <div className="coach-loading" role="status"><LoaderCircle className="spin" size={17} /><span>Preparing investigation prompts…</span><button className="text-link" onClick={onCancelCoach}>Cancel</button></div> : result ? <div className="coach-card"><span className="mono-label"><Sparkles size={13} />{result.mode === "live-meta" ? "META MODEL SUGGESTION — NOT EXECUTED" : "INSTRUCTOR QUESTION — NOT A LIVE MODEL RESULT"}</span>{decision ? <><h3>{decision.question}</h3><p>{decision.rationale}</p>{decision.evidenceRefs.length > 0 && <p className="coach-references">References: {decision.evidenceRefs.join(", ")}</p>}{result.mode === "live-meta" && result.model && <p className="field-hint">Model: {result.model}{result.usage ? ` · ${result.usage.inputTokens} input / ${result.usage.outputTokens} output tokens` : ""}</p>}<label className="field-label" htmlFor="suggestion-reason">Your reason for using, changing, or skipping this prompt<input id="suggestion-reason" value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} placeholder="I want to test … / I’m skipping because …" /></label>{change && <label className="field-label" htmlFor="changed-probe">Choose an executable probe<select id="changed-probe" value={fixture} onChange={event => setFixture(event.target.value as FixtureId)}>{guidedFixtures.map(id => <option key={id} value={id}>{fixtureLabels[id]}</option>)}</select></label>}<div className="button-row">{decision.fixtureId && !change && <button className="button button-outline button-small" disabled={busy || !reason.trim()} onClick={() => void onProbe(decision.fixtureId!, reason, "coach", "accepted")}>Use this probe <ArrowRight size={14} /></button>}{change ? <button className="button button-outline button-small" disabled={busy || !reason.trim()} onClick={() => void onProbe(fixture, reason, "student", "changed")}>Open chosen probe <ArrowRight size={14} /></button> : <button className="button button-ghost button-small" disabled={busy} onClick={() => setChange(true)}>Change</button>}<button className="button button-ghost button-small" disabled={busy || !reason.trim()} onClick={() => void onSkip(reason)}>Skip & save reason</button></div></> : <><h3>Prompts aren’t available right now.</h3><p>You can continue the full lab with your own reasoning and the supported probes below.</p><button className="text-link" onClick={onCoach}>Try again <RefreshCw size={13} /></button></>}</div> : <div className="coach-intro"><div><p>{aiAvailable ? "Request a short question and a supported test suggestion. Your current explanation and synthetic lab context are sent to a Meta model service; your platform account identifier and unrelated work are excluded." : "A live Meta model is not currently available. You can request a clearly labelled instructor question, or continue with your own investigation."}</p><p className="field-hint">The service provider may retain request content under its own policy. Prompts never write observations, choose a patch, or grade your answer.</p></div><button className="button button-outline button-small" disabled={busy} onClick={onCoach}><Sparkles size={15} />{aiAvailable ? "Get investigation prompts" : "Get an instructor question"}</button></div>}<details className="additional-probes"><summary><FlaskConical size={16} /> Choose another supported probe <ChevronDown size={15} /></summary><p>Each probe needs its own saved prediction. Opening a completed probe returns to its existing record.</p><label className="field-label" htmlFor="manual-probe">Probe<select id="manual-probe" value={fixture} onChange={event => setFixture(event.target.value as FixtureId)}>{guidedFixtures.map(id => <option key={id} value={id}>{fixtureLabels[id]}</option>)}</select></label><label className="field-label" htmlFor="probe-reason">Why run this probe?<input id="probe-reason" value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} placeholder="This could challenge my explanation by …" /></label><button className="button button-outline button-small" disabled={busy || !reason.trim()} onClick={() => void onProbe(fixture, reason)}>Open probe <ArrowRight size={14} /></button></details></section>;
}

function Completion({ session, onHistory }: { session: LearningSession; onHistory: () => void }) { return <section className="completion"><div className="completion-icon"><CheckCheck size={31} /></div><p className="eyebrow">ACTIVITY SUBMITTED</p><h1>Your thinking.<br /><em>Backed by a record.</em></h1><p>Your original predictions, explanations, reviewed changes, and executed evidence are saved for your tutor’s review.</p><div className="completion-actions"><a className="button button-primary" href={`/api/sessions/${session.id}/proof.json`} download="groundtruth-record.json"><Download size={16} />Download my record</a><button className="button button-outline" onClick={() => window.print()}><Printer size={16} />Print</button><button className="text-link" onClick={onHistory}>Open full history <ArrowRight size={14} /></button></div><section className="card completion-results"><div className="panel-header"><h2>What you executed</h2><span className="tag tag-teal">Stored evidence</span></div><OutcomeSummary session={session} /><p className="boundary-note"><Info size={14} />These results describe the supplied cases you ran. They do not establish universal exactly-once delivery or production readiness.</p></section><p className="completion-note">No automated grade or mastery judgement is assigned. Your tutor reviews your own reasoning and its connection to the evidence.</p></section>; }

function AccountSettings({ me, busy, error, onConsent, onDelete }: { me: Me; busy: boolean; error: string; onConsent: (optIn: boolean) => Promise<void>; onDelete: () => Promise<void> }) { const [optIn, setOptIn] = useState(me.researchConsent), [deleting, setDeleting] = useState(false), [confirmation, setConfirmation] = useState(""); return <div className="account-settings"><div className="account-status"><ShieldCheck size={19} /><div><strong>{me.authenticated ? "Signed in with ChatGPT" : "Not signed in"}</strong><p>{me.enrolled ? "Pilot membership active" : "No active pilot membership"}</p></div></div>{error && <ErrorNotice message={error} />}<section><h3>Optional research use</h3><p>De-identified counts, timings, and manually recorded rubric scores may be included in pilot analysis. Your written answers, quotations, and tutor notes are excluded. Practice and tutor support are available either way.</p><label className="check-row"><input type="checkbox" checked={optIn} onChange={event => setOptIn(event.target.checked)} disabled={busy || !me.authenticated} /><span>Allow optional pilot research use</span></label><button className="button button-outline button-small" disabled={busy || optIn === me.researchConsent || !me.authenticated} onClick={() => void onConsent(optIn)}>Save research choice <Check size={14} /></button></section><section><h3>Availability & deletion</h3><p>Each saved activity is available for 30 days from creation. Deletion removes your retained activity and pilot membership. Native sign-in, copies you downloaded, and provider-managed retention are outside this operation.</p><p>{enrollmentSecurityNotice}</p>{!deleting ? <button className="text-link danger-link" disabled={busy || !me.authenticated} onClick={() => setDeleting(true)}><Trash2 size={14} />Delete my saved activity</button> : <div className="delete-confirm"><p><strong>This removes all of your saved activities and pilot membership.</strong> Type DELETE to confirm.</p><label className="field-label" htmlFor="delete-confirm">Confirmation<input id="delete-confirm" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" /></label><div className="button-row"><button className="button button-danger button-small" disabled={busy || confirmation !== "DELETE"} onClick={() => void onDelete()}>{busy ? <LoaderCircle className="spin" size={14} /> : <Trash2 size={14} />}Delete my activity</button><button className="button button-ghost button-small" disabled={busy} onClick={() => setDeleting(false)}>Cancel</button></div></div>}</section>{me.authenticated && <a className="text-link account-signout" href="/signout-with-chatgpt?return_to=/">Sign out of this site <ArrowRight size={13} /></a>}</div>; }
