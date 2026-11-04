'use client';
import { useRef,useState } from 'react';
import { post } from '@/lib/client/api';
import { areaNames,type RepositoryMap,type RepositoryFeature } from '@/lib/study/repository-types';
import type { StudyProject } from '@/lib/study/types';
import { useRuntimeProfile } from './runtime-profile';
import { HelpTip } from './help-tip';

export function RepositoryImport({onImported,disabled,independent=false,initialMap,initialUrl='',onMapCreated,onBusyChange}:{onImported:(project:StudyProject)=>void;disabled:boolean;independent?:boolean;initialMap?:RepositoryMap;initialUrl?:string;onMapCreated?:(map:RepositoryMap)=>void;onBusyChange?:(label:string)=>void}){
 const runtime=useRuntimeProfile(),meta=runtime.modelProvider==='meta';
 const [url,setUrl]=useState(initialUrl),[branch,setBranch]=useState(''),[purpose,setPurpose]=useState<'improve'|'transfer'>('improve');
 const [consent,setConsent]=useState(false),[saveConsent,setSaveConsent]=useState(false),[map,setMap]=useState<RepositoryMap|null>(initialMap||null),[area,setArea]=useState('all'),[feature,setFeature]=useState<RepositoryFeature|null>(null);
 const [goal,setGoal]=useState(''),[target,setTarget]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const lock=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 function focusStage(){requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'nearest'});});}
 async function run(label:string,work:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(label);onBusyChange?.(label);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:'Could not open this repository. Try again.');}finally{lock.current=false;setBusy('');onBusyChange?.('');}}
 function chooseMap(value:RepositoryMap){setMap(value);setFeature(null);setArea('all');setUrl(value.url);setSaveConsent(false);setError('');focusStage();}
 const unavailable=disabled||!!busy;
 return <section className="repository-import import-wizard" aria-label="Choose a repository learning path">
  <div className="section-heading"><h2 ref={heading} tabIndex={-1}>{feature?'Set your learning goal':map?'Choose a workflow':'Start a learning path'}</h2><HelpTip label={map?'About this repository map':'Learning paths'}>{map?<>{map.catalogueCount} file paths and {map.sampledPaths.length} source excerpts informed this partial map. {map.warnings.join(' ')} Pinned commit: {map.commit}. Suggested features may be incomplete or incorrect.</>:<>Improve a repository you own, or study a public reference and practise applying its patterns to your own project. Source code is selected automatically.</>}</HelpTip></div>
  <fieldset className="purpose-options" disabled={unavailable}><legend>Your purpose</legend><label className={purpose==='improve'?'selected':''}><input type="radio" name="repository-purpose" checked={purpose==='improve'} onChange={()=>setPurpose('improve')}/><span><strong>Improve my project</strong></span></label><label className={purpose==='transfer'?'selected':''}><input type="radio" name="repository-purpose" checked={purpose==='transfer'} onChange={()=>setPurpose('transfer')}/><span><strong>Learn from a public repo</strong></span></label></fieldset>
  {independent&&<p className="notice" role="status">Use “End attempt” above to leave the current activity and unlock this form.</p>}
  {busy&&<p role="status" className="study-progress">{busy}…</p>}{error&&<p className="notice" role="alert">{error}</p>}
  {!map?<>
   <form onSubmit={e=>{e.preventDefault();void run('Building the repository map',async()=>{const result=await post<RepositoryMap>('/api/study/repository-maps',{url,...(branch.trim()?{ref:branch.trim()}:{}),acknowledged:consent});chooseMap(result);onMapCreated?.(result);});}}>
    <label>GitHub repository<input type="url" required disabled={unavailable} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://github.com/owner/repository"/></label>
    <details className="advanced-options"><summary>Choose a branch</summary><label>Branch name<input maxLength={120} disabled={unavailable} value={branch} onChange={e=>setBranch(e.target.value)} placeholder="Default branch"/></label></details>
    <div className="consent-with-help"><label className="study-consent"><input type="checkbox" required checked={consent} disabled={unavailable} onChange={e=>setConsent(e.target.checked)}/>{meta?'Allow selected public source to be sent to Meta AI.':'Use this public repository for AI-guided study.'}</label><HelpTip label="Source processing">{meta?'Selected public source, your goals and AI requests are sent to Meta Model API to generate maps, guidance and exercises. ':runtime.modelProvider==='local'?'AI generation runs on the configured local model. ':''}{runtime.cloudDeployment?'Repository maps and selected source are stored in your GroundTruth account.':'A public Git snapshot is cached separately on this device.'} Maps are available for 24 hours. Check for sensitive content first; imported code is never executed.</HelpTip></div>
    <button className="button button-primary" disabled={unavailable}>Explore repository</button>
   </form>

  </>:<>
   <div className="repository-choice-heading"><span>{map.repository}</span><button type="button" className="text-link" disabled={unavailable} onClick={()=>{setMap(null);setFeature(null);setError('');focusStage();}}>Change repository</button></div>
   {!feature?<><nav className="area-filter" aria-label="Areas to strengthen"><button type="button" aria-pressed={area==='all'} disabled={unavailable} onClick={()=>setArea('all')}>All areas</button>{Object.entries(areaNames).filter(([id])=>map.features.some(f=>f.area===id)).map(([id,name])=><button type="button" key={id} aria-pressed={area===id} disabled={unavailable} onClick={()=>setArea(id)}>{name}</button>)}</nav>
    <div className="feature-grid">{map.features.filter(f=>area==='all'||f.area===area).map(f=><article className="feature-card" key={f.id}><button type="button" className="feature-card-action" disabled={unavailable} onClick={()=>{setFeature(f);setError('');focusStage();}}><small>{areaNames[f.area]}</small><strong>{f.title}</strong><span>{f.concepts.join(' · ')}</span><span className="feature-next">Choose workflow →</span></button><HelpTip label={f.title}>{f.summary} The source will be selected automatically for this workflow.</HelpTip></article>)}</div>
   </>:<><button type="button" className="text-link" disabled={unavailable} onClick={()=>{setFeature(null);setError('');focusStage();}}>← Choose another workflow</button><div className="selected-workflow"><span>{areaNames[feature.area]}</span><h3>{feature.title}</h3></div>
    <form className="learning-path-start" onSubmit={e=>{e.preventDefault();void run('Opening your learning path',async()=>{const project=await post<StudyProject>('/api/study/projects',{mapId:map.id,featureId:feature.id,purpose,goal,transferGoal:target,acknowledged:saveConsent});onImported(project);});}}>
     <div className="field-with-help"><label>Your goal (optional)<textarea minLength={8} maxLength={600} disabled={unavailable} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="What would you like to understand or improve?"/></label><HelpTip label="Your learning goal">Leave this blank to use the selected workflow as your focus, or describe a specific goal in at least eight characters.</HelpTip></div>
     {purpose==='transfer'&&<div className="field-with-help"><label>Where will you use these skills?<textarea required minLength={8} maxLength={600} disabled={unavailable} value={target} onChange={e=>setTarget(e.target.value)} placeholder="For example: add ownership checks to my study-planner API."/></label><HelpTip label="Learning from a reference">The reference remains read-only. GroundTruth generates adaptation challenges for your target project; it does not copy code into or edit that project.</HelpTip></div>}
     <div className="consent-with-help"><label className="study-consent"><input type="checkbox" required checked={saveConsent} disabled={unavailable} onChange={e=>setSaveConsent(e.target.checked)}/>Save this learning path to my account.</label><HelpTip label="Saved learning records">{runtime.cloudDeployment?'Selected source, drafts, questions, answers and activity are stored in the GroundTruth backend.':'Selected source, questions, answers and activity are saved on the configured local backend.'} Paths are available for 30 days. {meta?'Selected source, goals and AI requests are sent to Meta for guidance. ':''}Your path is private unless you explicitly share it with an approved teacher. You can remove it from your collection.</HelpTip></div>
     <button className="button button-primary" disabled={unavailable}>Start learning</button>
    </form>
   </>}
  </>}
 </section>;
}
