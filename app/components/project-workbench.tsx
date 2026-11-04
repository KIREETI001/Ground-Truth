'use client';
import { useEffect,useRef,useState } from 'react';
import { api,post } from '@/lib/client/api';
import { RuntimeProfileProvider,type RuntimeProfile } from './runtime-profile';
import { HintWindow } from './hint-window';
import { RemovalDialog } from './removal-dialog';
import { LearningLibrary } from './learning-library';
import type { RepositoryMap } from '@/lib/study/repository-types';
import { RepositoryImport } from './repository-import';
import { ApplySkills } from './apply-skills';
import { areaNames } from '@/lib/study/repository-types';
import type { StudyProject } from '@/lib/study/types';
import { ControlledChanges } from './controlled-changes';
import { ConceptTree } from './concept-tree';
import { PlatformNav } from './platform-nav';
import { HelpTip } from './help-tip';
import { SourcePanel,SourceDetails,PracticePanel,ActivityPanel,ProgressPanel } from './study-panels';
type Step='map'|'concepts'|'practice'|'changes'|'progress';
const fetchWorkspace=()=>Promise.allSettled([api<{projects:StudyProject[]}>('/api/study/projects'),api<{profile:{applicationStatus:string;displayName:string}|null;role:string}>('/api/account/profile'),api<{maps:RepositoryMap[]}>('/api/study/repository-maps'),api<RuntimeProfile>('/api/me')]);

export function ProjectWorkbench({preview=false}:{preview?:boolean}){
 const [runtime,setRuntime]=useState<RuntimeProfile>({cloudDeployment:true,modelProvider:'meta'});
 const [step,setStep]=useState<Step>('map'),[conceptId,setConceptId]=useState('');
 const [maps,setMaps]=useState<RepositoryMap[]>([]),[importStart,setImportStart]=useState<{key:number;url:string;map?:RepositoryMap}>({key:0,url:''});
 const [projects,setProjects]=useState<StudyProject[]>([]),[project,setProject]=useState<StudyProject|null>(null);
 const [loading,setLoading]=useState(true),[showImport,setShowImport]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false),[notice,setNotice]=useState('');
 const [removal,setRemoval]=useState<{kind:'path';project:StudyProject}|{kind:'repository';repository:string}|null>(null);
 const removalTrigger=useRef<HTMLElement|null>(null);
 const [introRead,setIntroRead]=useState<Record<string,boolean>>({});
 const [displayName,setDisplayName]=useState(preview?'Developer':'Learner'),[hintWindows,setHintWindows]=useState<Record<string,boolean>>({}),[drafts,setDrafts]=useState<Record<string,string>>({});
 const lock=useRef(false),pendingExercise=useRef<{projectId:string;body:unknown}|null>(null),panel=useRef<HTMLDivElement>(null);
 const exercise=project?.exercises[0];
 const activeAttempts=projects.flatMap(p=>p.exercises.filter(e=>e.status==='independent').map(e=>({project:p,exercise:e})));
 const independent=activeAttempts.length>0;
 function acceptWorkspace([saved,account,library,runtimeResult]:Awaited<ReturnType<typeof fetchWorkspace>>){
   if(saved.status==='rejected')throw saved.reason;
   if(runtimeResult.status==='rejected')throw runtimeResult.reason;
   setRuntime({cloudDeployment:runtimeResult.value.cloudDeployment===true,modelProvider:runtimeResult.value.modelProvider||'disabled'});
   if(library.status==='fulfilled')setMaps(library.value.maps);
   setProjects(saved.value.projects);setProject(saved.value.projects[0]||null);setError('');
   if(account.status==='fulfilled'){setPending(account.value.profile?.applicationStatus==='pending'&&account.value.role==='user');setDisplayName(account.value.profile?.displayName||(account.value.role==='developer'?'Developer':'Learner'));}
 }
 async function load(){try{acceptWorkspace(await fetchWorkspace());}catch(e){setError(e instanceof Error?e.message:'Could not open your saved paths.');}finally{setLoading(false);}}
 useEffect(()=>{let active=true;void fetchWorkspace().then(result=>{if(active)acceptWorkspace(result);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Could not open your saved paths.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 function navigate(next:Step){setStep(next);requestAnimationFrame(()=>{panel.current?.focus({preventScroll:true});panel.current?.previousElementSibling?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});}
 function update(data:StudyProject){setProject(current=>current?.id===data.id?data:current);setProjects(list=>list.map(p=>p.id===data.id?data:p));}
 async function run(label:string,work:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(label);setError('');setNotice('');try{await work();}catch(e){setError(e instanceof Error?e.message:'The action failed. Your saved work is retained.');}finally{lock.current=false;setBusy('');}}
 async function action(name:string,body:unknown={},overviewConfirmed=false){
  if(!project)return;
  if(name==='exercise'&&!introRead[project.id]&&!overviewConfirmed){pendingExercise.current={projectId:project.id,body};navigate('practice');return;}
  const labels:Record<string,string>={analyse:'Explaining the workflow',concepts:'Building your concept tree',exercise:'Generating your exercise',feedback:'Preparing a reflection question',independent:'Starting independent practice',submit:'Saving your answer','end-attempt':'Ending your attempt'};
  await run(labels[name]||'Saving changes',async()=>{const data=await post<StudyProject>('/api/study/projects/'+project.id+'/'+name,name==='exercise'?{...(body as Record<string,unknown>),...(conceptId?{conceptId}:{})}:body);update(data);if(name==='exercise')navigate('practice');if(name==='concepts')navigate('concepts');});
 }
 async function endActive(){await run('Ending your active attempt',async()=>{const out=await post<{projects:StudyProject[]}>('/api/study/attempts/end',{});setProjects(out.projects);setProject(current=>out.projects.find(p=>p.id===current?.id)||out.projects[0]||null);setNotice('Attempt ended. You can start another path.');});}
 function continueActive(){const active=activeAttempts[0];if(active){setProject(active.project);setShowImport(false);navigate('practice');}}
 function choose(p:StudyProject){setShowImport(false);pendingExercise.current=null;setProject(p);setStep('map');setConceptId('');setError('');setNotice('');}
 function concepts(){if(project?.analysis?.flow?.length)setIntroRead(seen=>({...seen,[project.id]:true}));if(project?.concepts.length)navigate('concepts');else void action('concepts');}
 function newPath(start:{url:string;map?:RepositoryMap}={url:''}){pendingExercise.current=null;setImportStart(v=>({key:v.key+1,...start}));setShowImport(true);setError('');setNotice('');}
 function removePath(target:StudyProject){removalTrigger.current=document.querySelector<HTMLElement>('[data-library-path-action="'+CSS.escape(target.id)+'"]')||(document.activeElement as HTMLElement);setError('');setRemoval({kind:'path',project:target});}
 function removeRepository(repository:string){removalTrigger.current=document.querySelector<HTMLElement>('[data-library-repository-action="'+CSS.escape(repository)+'"]')||(document.activeElement as HTMLElement);setError('');setRemoval({kind:'repository',repository});}
 async function confirmRemoval(){if(!removal||lock.current||busy)return;const target=removal;await run('Removing saved records',async()=>{
  if(target.kind==='path'){await api('/api/study/projects/'+target.project.id,{method:'DELETE'});const remaining=projects.filter(p=>p.id!==target.project.id);setProjects(remaining);if(project?.id===target.project.id){setProject(remaining[0]||null);setStep('map');}setNotice('Learning path removed.');}
  else{const repository=target.repository;await post('/api/study/collection/remove-repository',{repository});const remaining=projects.filter(p=>p.snapshot.repository!==repository);setProjects(remaining);setMaps(list=>list.filter(m=>m.repository!==repository));if(project?.snapshot.repository===repository){setProject(remaining[0]||null);setStep('map');}setImportStart(v=>({key:v.key+1,url:''}));setShowImport(false);setNotice('Repository removed from your collection.');}
  setRemoval(null);
 });}
 const removalCount=removal?.kind==='repository'?projects.filter(p=>p.snapshot.repository===removal.repository).length:0;
 const removedDrafts=runtime.cloudDeployment?'Saved cloud drafts, proposals and backups for removed paths are also deleted. The GitHub repository is unchanged.':'Separate local caches, working copies and backups remain. The GitHub repository is unchanged.';
 const removalDescription=removal?.kind==='path'?'Permanently remove “'+(removal.project.learningPath?.featureTitle||removal.project.snapshot.repository)+'” and its saved learning evidence? This cannot be undone. '+removedDrafts:removal?.kind==='repository'?'Remove '+removal.repository+' from your collection'+(removalCount?' and permanently delete its '+removalCount+' saved learning path'+(removalCount===1?'':'s')+' and learning evidence':'')+'? This cannot be undone. '+removedDrafts:'';
 const stageNavigation=project&&!showImport?<nav className="workflow-tabs" aria-label="Learning stages">{([['map','Workflow'],['concepts','Concepts'],['practice','Practice'],['changes',project.learningPath?.purpose==='transfer'?'Apply skills':'Changes'],['progress','Progress']] as [Step,string][]).map(([id,label],i)=><button type="button" key={id} aria-pressed={step===id} onClick={()=>navigate(id)}><span className="stage-index">{i+1}</span>{label}</button>)}</nav>:<span className="workspace-nav-title">Your workspace</span>;
 const importing=!loading&&(showImport||!project);
 return <RuntimeProfileProvider profile={runtime}><div className="platform-page workspace-page"><RemovalDialog open={!!removal} title={removal?.kind==='path'?'Remove learning path?':'Remove repository?'} description={removalDescription} busy={!!busy} error={error} onCancel={()=>{if(!busy)setRemoval(null);}} onConfirm={()=>void confirmRemoval()} restoreFocus={()=>requestAnimationFrame(()=>{if(removalTrigger.current?.isConnected)removalTrigger.current.focus();else document.querySelector<HTMLElement>('.library-new')?.focus();})}/><PlatformNav accountInSidebar current={preview?'Developer preview':'User'}>{stageNavigation}</PlatformNav><div className="workspace-layout"><LearningLibrary displayName={displayName} workspaceName={preview?'Developer preview':'User'} projects={projects} maps={maps} currentId={showImport?undefined:project?.id} disabled={!!busy} loading={loading} onChoose={choose} onExplore={newPath} onNew={()=>newPath()} onRemovePath={p=>void removePath(p)} onRemoveRepository={repo=>void removeRepository(repo)}/><main className="platform-main study-main calm-workspace">
  <header className="workspace-toolbar"><h1 className="sr-only">Your learning workspace</h1>{showImport&&project&&<button type="button" className="text-link" disabled={!!busy} onClick={()=>setShowImport(false)}>← Back to learning</button>}</header>
  {pending&&<p className="notice" role="status">Teacher approval pending. You can explore your own paths.</p>}
  {error&&<div className="notice" role="alert"><p>{error}</p><div className="button-row"><button className="text-link" onClick={()=>setError('')}>Dismiss</button>{!project&&<button className="button button-outline" onClick={()=>{setLoading(true);setError('');void load();}}>Retry opening saved paths</button>}</div></div>}
  {notice&&<p className="notice notice-success" role="status">{notice}</p>}
  {independent&&!loading&&<div className="attempt-exit-banner" role="status"><div><strong>Independent attempt active</strong><span>Continue it, or end it to start something else.</span></div><div className="button-row"><button className="button button-outline" disabled={!!busy} onClick={continueActive}>Continue attempt</button><button className="button button-primary" disabled={!!busy} onClick={()=>void endActive()}>{activeAttempts.length>1?'End active attempts':'End attempt'}</button><HelpTip label="Ending an attempt">Ends the current independent activity and restores AI access. It is recorded as ended, not completed, and earns no mastery credit. Existing saved records are retained. An unsubmitted draft is not a committed answer.</HelpTip></div></div>}
  {loading?<div className="workspace-loading" role="status">Opening your workspace…</div>:importing?<RepositoryImport onBusyChange={setBusy} key={importStart.key} initialMap={importStart.map} initialUrl={importStart.url} onMapCreated={map=>setMaps(list=>[map,...list.filter(m=>m.id!==map.id)])} disabled={!!busy||!!independent} independent={!!independent} onImported={data=>{setProjects(list=>[data,...list]);choose(data);setShowImport(false);}}/>:project&&<>

   <section className="study-context compact-context"><div><p className="platform-kicker">{project.snapshot.repository}{project.learningPath?' / '+(areaNames[project.learningPath.area as keyof typeof areaNames]||project.learningPath.area):''}</p><div className="section-heading"><h2>{project.learningPath?.featureTitle||'Project investigation'}</h2><HelpTip label="Project context"><p>{project.goal}</p>{project.learningPath?.transferGoal&&<p>Apply to: {project.learningPath.transferGoal}</p>}<p>Pinned commit: {project.snapshot.commit}. Guidance uses bounded selected excerpts.</p></HelpTip></div></div><span className="path-mode">{project.learningPath?.purpose==='transfer'?'Learn & apply':'Project improvement'}</span></section>

   {busy&&<p className="study-progress" role="status">{busy}…</p>}

   <div className="workspace-source-top"><SourceDetails project={project}/></div>
   <div ref={panel} className="stage-content" tabIndex={-1} data-stage={step}>
    {step==='map'&&<SourcePanel project={project} busy={!!busy} independent={!!independent} onExplain={()=>void action('analyse')} onConcepts={concepts}/>}
    {step==='concepts'&&<ConceptTree project={project} selected={conceptId} onSelect={id=>{setConceptId(id);navigate('practice');}} onGenerate={()=>action('concepts')} busy={!!busy||!!independent}/>}
    {step==='practice'&&<PracticePanel key={project.id} project={project} introRead={!!introRead[project.id]} onIntroRead={()=>{setIntroRead(seen=>({...seen,[project.id]:true}));const next=pendingExercise.current;pendingExercise.current=null;if(next?.projectId===project.id)void action('exercise',next.body,true);}} conceptId={conceptId} busy={!!busy} answer={drafts[exercise?.id||'']||''} onAnswer={value=>setDrafts(d=>({...d,[exercise?.id||'']:value}))} action={action} onOpenHint={()=>setHintWindows(all=>({...all,[project.id]:true}))}/>}
    <div hidden={step!=='changes'}>{(project.learningPath?.purpose==='transfer'?<ApplySkills project={project} busy={!!busy||!!independent} onGenerate={()=>action('exercise',{transferChallenge:true})} onEnd={()=>action('end-attempt',{exerciseId:project.exercises.find(e=>e.status==='guided'||e.status==='independent')?.id})} onContinue={()=>navigate('practice')}/>:<ControlledChanges key={project.id} project={project} independent={!!independent} externalBusy={!!busy} conceptId={conceptId} onUpdated={update} onEnd={()=>action('end-attempt',{exerciseId:project.exercises.find(e=>e.status==='guided'||e.status==='independent')?.id})} onContinue={()=>navigate('practice')} onCheck={path=>action('exercise',{workingPath:path})}/>)}</div>
    {step==='progress'&&<><ActivityPanel project={project}/><ConceptTree project={project} selected={conceptId} onSelect={id=>{setConceptId(id);navigate('practice');}} onGenerate={()=>action('concepts')} busy={!!busy||!!independent}/><ProgressPanel project={project} busy={!!busy} action={action} onDelete={()=>void removePath(project)}/></>}
   </div>
  </>}
 </main></div>{project&&<HintWindow project={project} open={!!hintWindows[project.id]} paused={independent} onClose={()=>setHintWindows(all=>({...all,[project.id]:false}))} onUpdated={update} onBusyChange={value=>setBusy(value?'Preparing a hint':'')}/>}</div></RuntimeProfileProvider>;
}
