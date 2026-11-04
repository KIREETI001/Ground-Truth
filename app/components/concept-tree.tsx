'use client';
import type { StudyProject } from '@/lib/study/types';
import { HelpTip } from './help-tip';
import { reviewLevelLabel,summarizeReviewEvidence } from '@/lib/study/teacher-evidence';
import '../teacher-evidence.css';
export function ConceptTree({project,selected,onSelect,onGenerate,busy,readOnly=false}:{project:StudyProject;selected:string;onSelect:(id:string)=>void;onGenerate:()=>Promise<void>;busy:boolean;readOnly?:boolean}){
 const summary=project.reviewSummary||summarizeReviewEvidence(project);
 return <section className="study-panel concept-panel"><div className="concept-heading"><div className="section-heading"><h2>Concepts to strengthen</h2><HelpTip label="Your concept tree">Choose a concept to focus practice. Concepts and suggested prerequisites come from the selected workflow. They may be incomplete; check them against the source. Saved attempts and human reviews describe particular tasks and do not establish mastery.</HelpTip></div><div className="concept-evidence-overview"><strong>{summary.reviewed} human-reviewed {summary.reviewed===1?'answer':'answers'}</strong><span>{summary.needsReview} awaiting review</span><small>{summary.lastSubmittedAt?'Latest commitment: '+new Date(summary.lastSubmittedAt).toLocaleDateString('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium'}):'No committed answer yet'}</small></div></div>
  {!project.concepts.length?<div className="empty-stage">{readOnly?<p>No concept map yet.</p>:<button className="button button-primary" disabled={busy} onClick={()=>void onGenerate()}>Build concept tree</button>}</div>:<div className="concept-tree">{[['behavior','Behavior'],['architecture','Structure'],['testing','Validation']].map(([category,label])=>{const nodes=project.concepts.filter(node=>node.category===category);return nodes.length?<section key={category}><h3>{label}</h3>{nodes.map(node=>{
   const attempts=project.exercises.filter(ex=>ex.conceptId===node.id&&ex.status==='submitted');
   const reviews=attempts.flatMap(ex=>ex.reviews).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
   const oldLevel=node.state.startsWith('Human review: ')?node.state.slice('Human review: '.length) as keyof typeof reviewLevelLabel:null;
   const level=reviews[0]?.level||oldLevel;
   const state=level&&reviewLevelLabel[level]?reviewLevelLabel[level]:node.attempts?'Committed · awaiting human review':'No committed evidence yet';
   const lastDate=node.lastReviewedAt||reviews[0]?.createdAt||node.lastSubmittedAt||attempts.map(ex=>ex.submittedAt).filter((date):date is string=>!!date).sort().at(-1);
   const evidence=<><strong>{node.title}</strong><span className="evidence-count-state">{state}</span><small className="concept-evidence-meta">{node.attempts} committed {node.attempts===1?'attempt':'attempts'}{lastDate?' · '+new Date(lastDate).toLocaleDateString('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium'}):''}</small></>;
   return <article className={'concept-card'+(selected===node.id?' selected':'')} key={node.id}>{readOnly?<div className="concept-card-static">{evidence}</div>:<button type="button" className="concept-card-action" aria-pressed={selected===node.id} onClick={()=>onSelect(node.id)}>{evidence}<span className="concept-next">Practise →</span></button>}<HelpTip label={node.title}>{node.description}{node.prerequisites.length>0&&<p>Builds on: {node.prerequisites.map(id=>project.concepts.find(concept=>concept.id===id)?.title||id).join(', ')}.</p>}<p>Source: {node.filePaths.join(', ')}.</p></HelpTip></article>;
  })}</section>:null;})}</div>}
 </section>;
}
