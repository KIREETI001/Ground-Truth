'use client';
import { useEffect,useState } from 'react';
import type { StudyExercise,StudyProject } from '@/lib/study/types';
import { exercisesForReview,projectsForReview,reviewLevelLabel,summarizeReviewEvidence,type ReviewFilter } from '@/lib/study/teacher-evidence';
import { api } from '@/lib/client/api';
import { HelpTip } from './help-tip';
import { TeacherClasses } from './class-enrollment';
import { ConceptTree } from './concept-tree';
import { ManualReview } from './manual-review';
import { PlatformNav } from './platform-nav';
import '../teacher-evidence.css';

const dateLabel=(value:string|null|undefined)=>value?new Date(value).toLocaleString('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'})+' SGT':'Not recorded';
const filterLabels:Record<ReviewFilter,string>={'needs-review':'Needs review',reviewed:'Reviewed',all:'All shared paths'};

export default function Teacher(){
 const [teacherId,setTeacherId]=useState(''),[filter,setFilter]=useState<ReviewFilter>('needs-review');
 const [projects,setProjects]=useState<StudyProject[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 async function load(){try{const data=await api<{teacherId:string;projects:StudyProject[]}>('/api/study/teacher');setTeacherId(data.teacherId);setProjects(data.projects);setError('');}catch(e){setError(e instanceof Error?e.message:'Could not load shared records.');}finally{setLoading(false);}}
 useEffect(()=>{let active=true;void api<{teacherId:string;projects:StudyProject[]}>('/api/study/teacher').then(data=>{if(active){setTeacherId(data.teacherId);setProjects(data.projects);setError('');}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Could not load shared records.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const visible=projectsForReview(projects,filter),pending=projects.reduce((sum,project)=>sum+(project.reviewSummary||summarizeReviewEvidence(project)).needsReview,0),reviewed=projects.reduce((sum,project)=>sum+(project.reviewSummary||summarizeReviewEvidence(project)).reviewed,0);
 return <div className="platform-page"><PlatformNav current="Teacher"/><main className="platform-main teacher-evidence-main">
  <p className="platform-kicker">TEACHER / SHARED LEARNING EVIDENCE</p><h1>See the reasoning.<br/><em>Guide the next step.</em></h1>
  <p className="platform-lead">Review the answers learners choose to share, with the question, source and in-app assistance in one place.</p>
  <p className="teacher-evidence-limit">Your judgement stays central. These records do not establish mastery, prove authorship or detect external AI use. Use a fresh conversation or supervised task to investigate gaps.</p>
  <TeacherClasses/>
  <details className="teacher-share-fallback"><summary>Sharing with a learner outside a class</summary><p>A learner can use your account ID in the additional sharing options. Every path still requires their explicit sharing consent.</p><code>{teacherId||'Checking account…'}</code></details>
  <section className="teacher-queue" aria-labelledby="teacher-queue-title"><div className="section-heading"><div><h2 id="teacher-queue-title">Review queue</h2><p>{pending} committed {pending===1?'answer needs':'answers need'} review · {reviewed} reviewed</p></div><button className="button button-outline" onClick={()=>{setLoading(true);setError('');void load();}} disabled={loading}>Refresh evidence</button></div>
   <div className="review-filter" role="group" aria-label="Filter shared evidence">{(['needs-review','reviewed','all'] as const).map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{filterLabels[value]} <span>{value==='all'?projects.length:value==='needs-review'?pending:reviewed}</span></button>)}</div>
   {projects.length>0&&<p className="pitch-caption">Showing up to 100 questions per path, with answers awaiting review first. Counts cover all saved answers.</p>}
   {loading&&<p role="status">Loading shared evidence…</p>}{error&&<p role="alert">{error}</p>}
   {!loading&&!error&&!projects.length&&<section className="study-panel"><h3>No learning paths shared yet</h3><p>Create a class and give learners its code. After enrolling, they can select you by name and explicitly share a learning path. Enrollment alone does not grant access to their work.</p></section>}
   {!loading&&!error&&projects.length>0&&!visible.length&&<section className="study-panel"><h3>{filter==='needs-review'?'No answers awaiting review':'No reviewed answers yet'}</h3><p>{filter==='needs-review'?'Shared paths may still have open questions or no submitted answers.':'Saved human reviews will appear here.'}</p><button className="button button-outline" onClick={()=>setFilter('all')}>View all shared paths</button></section>}
   {visible.map(project=><TeacherEvidenceProject key={project.id} project={project} filter={filter} onReviewSaved={load}/>)}
  </section>
 </main></div>;
}

/** Reusable for a clearly labelled, read-only preview of the visitor's own demo records. */
export function TeacherEvidenceProject({project,readOnly=false,filter='all',onReviewSaved}:{project:StudyProject;readOnly?:boolean;filter?:ReviewFilter;onReviewSaved?:()=>Promise<void>}){
 const summary=project.reviewSummary||summarizeReviewEvidence(project),exercises=exercisesForReview(project,filter);
 const learner=project.learner?.displayName||'Shared learner';
 return <section className="study-panel teacher-evidence-project" aria-label={learner+' · '+project.snapshot.repository}>
  <header className="teacher-project-heading"><div><p className="platform-kicker">{readOnly?'READ-ONLY EVIDENCE PREVIEW':'EXPLICITLY SHARED LEARNING PATH'}</p><h2>{learner}</h2><p className="teacher-repository">{project.snapshot.repository}</p></div><span className={'review-state '+(summary.needsReview?'review-state-pending':'')}>{summary.needsReview?summary.needsReview+' awaiting review':summary.reviewed?'Human review saved':'No committed answer yet'}</span></header>
  <div className="teacher-class-labels">{project.learner?.classNames.length?project.learner.classNames.map(name=><span key={name}>{name}</span>):<span>{readOnly?'Visitor’s own record':'Shared directly · no current class with you'}</span>}</div>
  <p><strong>Learner’s goal:</strong> {project.goal}</p>
  {project.learningPath&&<p><strong>{project.learningPath.purpose==='transfer'?'Reference → own project':'Project improvement'}:</strong> {project.learningPath.featureTitle}{project.learningPath.transferGoal?' · Target: '+project.learningPath.transferGoal:''}</p>}
  <dl className="teacher-evidence-counts"><div><dt>Committed answers</dt><dd>{summary.submitted}</dd></div><div><dt>Awaiting human review</dt><dd>{summary.needsReview}</dd></div><div><dt>Reviewed answers</dt><dd>{summary.reviewed}</dd></div><div><dt>Last submission</dt><dd className="teacher-date">{dateLabel(summary.lastSubmittedAt)}</dd></div></dl>
  <details className="teacher-activity"><summary>In-app activity for this path</summary><dl className="teacher-evidence-counts"><div><dt>Guidance requests</dt><dd>{project.stats.guidanceRequests}</dd></div><div><dt>Applied AI changes</dt><dd>{project.stats.aiChanges}</dd></div><div><dt>Declared manual changes</dt><dd>{project.stats.manualChanges}</dd></div><div><dt>Source excerpts</dt><dd>{project.snapshot.files.length}</dd></div></dl><p className="pitch-caption">Counts cover GroundTruth activity only. Manual declarations do not establish the absence of external help.</p><details><summary>Recent activity · up to 60 recorded events</summary><ol className="teacher-event-list">{project.events.map((event,index)=><li key={index}><span>{event.kind.replaceAll('-',' ')}</span><time dateTime={event.createdAt}>{dateLabel(event.createdAt)}</time></li>)}</ol></details></details>
  {exercises.length?<div className="teacher-attempt-list">{exercises.map(exercise=><TeacherAttempt key={exercise.id} exercise={exercise} project={project} readOnly={readOnly} open={false} onReviewSaved={onReviewSaved}/>)}</div>:<p>{filter!=='all'&&(filter==='needs-review'?summary.needsReview:summary.reviewed)>0?'Answers in this filter fall outside the loaded questions. Answers awaiting review are loaded first.':'No '+(filter==='all'?'questions saved':'answers in this filter')+' for this path.'}</p>}
  <details className="teacher-concept-disclosure"><summary>Concept evidence states</summary><ConceptTree project={project} selected="" onSelect={()=>{}} onGenerate={async()=>{}} busy={false} readOnly/></details>
 </section>;
}

function TeacherAttempt({exercise,project,readOnly,open,onReviewSaved}:{exercise:StudyExercise;project:StudyProject;readOnly:boolean;open:boolean;onReviewSaved?:()=>Promise<void>}){
 const committed=exercise.status==='submitted',reviews=exercise.reviews||[];
 const privateEvidence=committed?exercise.reviewEvidence:null;
 const suggestedOption=privateEvidence?.suggestedOption||(committed?exercise.mcqResult?.suggestedOption:undefined);
 const rationale=privateEvidence?.suggestedRationale||(committed?exercise.mcqResult?.explanation:undefined);
 const selected=committed?exercise.mcqResult?.selectedOption||exercise.answer?.match(/^([A-D])\./)?.[1]:undefined;
 const source=exercise.prompt.sourceContext;
 const files=source?[{path:source.path,excerpt:source.source}]:project.snapshot.files.filter(file=>exercise.prompt.filePaths.includes(file.path));
 return <article className="teacher-attempt"><details open={open}>
  <summary><span><strong>{exercise.prompt.title}</strong><small>{exercise.prompt.phase?exercise.prompt.phase+' · ':''}{exercise.prompt.format==='mcq'?'Multiple choice':exercise.prompt.format==='coding'?'Coding task':'Practice task'} · {committed?'Committed '+dateLabel(exercise.submittedAt):exercise.status==='ended'?'Ended without submission':'Answer not committed'}</small></span><span className={'review-state '+(committed&&!reviews.length?'review-state-pending':'')}>{committed?(reviews.length?'Reviewed':'Needs review'):'No review yet'}</span></summary>
  <div className="teacher-attempt-body"><h3>Question</h3><p className="study-prose">{exercise.prompt.prompt}</p>
   {exercise.prompt.options?.length&&<ol className="teacher-answer-options">{exercise.prompt.options.map(option=><li key={option.id} className={selected===option.id?'learner-selected':''}><strong>{option.id}</strong><span>{option.text}</span>{selected===option.id&&<small>Learner selected</small>}</li>)}</ol>}
   <section className="teacher-committed-answer"><h3>Original committed answer</h3><pre className="study-prose">{committed?exercise.answer||'No answer text saved.':'No answer has been committed.'}</pre><p className="pitch-caption">Independent start: {dateLabel(exercise.startedAt)} · Submitted: {dateLabel(exercise.submittedAt)}</p></section>
   {committed&&<section className="teacher-suggested-rubric"><div className="section-heading"><h3>AI-suggested review guidance</h3><HelpTip label="Human judgement required">The key, rationale and review points were generated by AI and may be wrong. Compare them with the source and learner’s answer before making your own assessment. A key match is not mastery.</HelpTip></div>{suggestedOption&&<p><strong>Suggested answer: {suggestedOption}</strong>{exercise.prompt.options?.find(option=>option.id===suggestedOption)?' · '+exercise.prompt.options.find(option=>option.id===suggestedOption)!.text:''}</p>}{rationale&&<p>{rationale}</p>}{privateEvidence?.reviewPoints.length?<ul>{privateEvidence.reviewPoints.map((point,index)=><li key={index}>{point}</li>)}</ul>:!rationale&&<p>Suggested review guidance is unavailable for this record. Use the question, committed answer and source.</p>}<p className="pitch-caption">{privateEvidence?privateEvidence.guidanceRequests+' in-app guidance requests recorded between question creation and commitment.':'Per-question guidance count is unavailable. Path totals are above.'} These counts cannot detect help outside GroundTruth.</p></section>}
   <details className="teacher-attempt-source"><summary>Source used for this question · {files.length} {files.length===1?'file':'files'}</summary><p className="pitch-caption">{source?source.label:'Selected excerpts at repository commit '+project.snapshot.commit+'. Excerpts may omit other relevant code.'}</p>{source&&<p className="pitch-caption">Saved source hash: <code>{source.hash}</code></p>}{files.map(file=><article key={file.path}><h4>{file.path}</h4><pre>{file.excerpt}</pre></article>)}{source?.diff&&<details><summary>Change captured with this question</summary><pre>{source.diff}</pre></details>}</details>
   {reviews.length>0&&<section className="teacher-saved-reviews"><h3>Recent human reviews · {reviews.length}</h3><p className="pitch-caption">Up to five latest reviews for this answer.</p>{reviews.map((review,index)=><article key={index}><h4>{reviewLevelLabel[review.level]}</h4><p className="study-prose">{review.note}</p><time dateTime={review.createdAt}>{dateLabel(review.createdAt)}</time></article>)}</section>}
   {committed&&!readOnly&&onReviewSaved&&<ManualReview exerciseId={exercise.id} onSaved={onReviewSaved}/>}
   {readOnly&&<p className="teacher-preview-note">Read-only preview. No teacher assessment can be saved here.</p>}
   {exercise.feedback&&<details><summary>Model’s follow-up question</summary><p>{exercise.feedback.feedback}</p><p>{exercise.feedback.nextStep}</p></details>}
  </div>
 </details></article>;
}
