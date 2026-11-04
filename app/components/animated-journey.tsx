'use client';
import { Pause,Play } from 'lucide-react';
import { useEffect,useState,useSyncExternalStore } from 'react';
const steps=[
 {label:'Import',title:'Start with the bigger picture',action:'Bring your own project or a public repository. Explore its features and learning areas.',screen:'Repository → features → learning areas',detail:'Start with what the project does, then explore how it is built.'},
 {label:'Focus',title:'Connect the pieces',action:'Choose a workflow and see how its selected code and concepts fit together.',screen:'Feature → workflow → source → concepts',detail:'Build a systems view one focused workflow at a time.'},
 {label:'Explore',title:'Understand the decisions',action:'Read a beginner-friendly overview, inspect the source and ask for focused guidance.',screen:'Overview → source evidence → understanding',detail:'Use the code to check an explanation and investigate its trade-offs.'},
 {label:'Practise',title:'Try the next step yourself',action:'Answer an MCQ or write a short code snippet with study assistance paused.',screen:'AI paused → independent attempt → saved evidence',detail:'Practise the judgement behind a change. Your first submission is preserved.'},
 {label:'Review',title:'Build evidence of your understanding',action:'Return to your concept tree and share the work you choose with a teacher.',screen:'Concepts + independent work → human review',detail:'A working project starts the conversation. Your attempts add evidence.'}
];
const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function subscribeMotion(changed:()=>void){const media=window.matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);}
export function AnimatedJourney(){
 const [step,setStep]=useState(0),[playOverride,setPlaying]=useState<boolean|null>(null);
 const reduceMotion=useSyncExternalStore(subscribeMotion,reducedMotion,()=>true),playing=playOverride??!reduceMotion;
 useEffect(()=>{if(!playing)return;const id=setInterval(()=>setStep(s=>(s+1)%steps.length),5000);return()=>clearInterval(id);},[playing]);
 return <section className="journey-animation" aria-label="How GroundTruth works"><div className="animation-heading"><p className="platform-kicker">Let AI cook. Know the recipe.</p><button type="button" onClick={()=>setPlaying(!playing)} className="animation-toggle" aria-label={playing?'Pause animation':'Play animation'} title={playing?'Pause animation':'Play animation'}><span className="animation-toggle-icons" aria-hidden="true"><Play className={playing?'toggle-icon':'toggle-icon visible'} size={20}/><Pause className={playing?'toggle-icon visible':'toggle-icon'} size={20}/></span></button></div><div className="journey-step-buttons">{steps.map((s,i)=><button key={s.title} aria-label={s.title} aria-pressed={step===i} onClick={()=>{setStep(i);setPlaying(false);}}><span className="journey-step-number">0{i+1}</span><span className="journey-step-label">{s.label}</span></button>)}</div><div key={step} className="journey-scene"><p className="animation-screen">{steps[step].screen}</p><h2>{steps[step].title}</h2><p>{steps[step].action}</p><small>{steps[step].detail}</small></div></section>;
}
