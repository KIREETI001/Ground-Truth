'use client';
import { useEffect,useRef,useState } from 'react';
import type { StudyProject } from '@/lib/study/types';
import type { RepositoryMap } from '@/lib/study/repository-types';
import { ClassEnrollment } from './class-enrollment';
import { SignOutButton } from './sign-out-button';
import { HelpTip } from './help-tip';

type Group={repository:string;url:string;map?:RepositoryMap;paths:StudyProject[]};
type Menu={group:Group;project?:StudyProject;x:number;y:number;trigger:HTMLElement};
export function LearningLibrary({projects,maps,currentId,disabled,loading,onChoose,onExplore,onNew,onRemovePath,onRemoveRepository,displayName,workspaceName}:{displayName:string;workspaceName:string;projects:StudyProject[];maps:RepositoryMap[];currentId?:string;disabled:boolean;loading:boolean;onChoose:(project:StudyProject)=>void;onExplore:(group:{url:string;map?:RepositoryMap})=>void;onNew:()=>void;onRemovePath:(project:StudyProject)=>void;onRemoveRepository:(repository:string)=>void}){
 const [expanded,setExpanded]=useState(false),[filter,setFilter]=useState(''),[menu,setMenu]=useState<Menu|null>(null);
 const menuRef=useRef<HTMLDivElement>(null);
 const grouped=new Map<string,Group>();
 for(const map of maps)if(!grouped.has(map.repository))grouped.set(map.repository,{repository:map.repository,url:map.url,map,paths:[]});
 for(const project of projects){const name=project.snapshot.repository;const group=grouped.get(name)||{repository:name,url:project.snapshot.url,paths:[]};group.paths.push(project);grouped.set(name,group);}
 const groups=[...grouped.values()].filter(g=>(g.repository+' '+g.paths.map(p=>p.learningPath?.featureTitle||p.goal).join(' ')).toLowerCase().includes(filter.toLowerCase()));
 useEffect(()=>{
  if(!menu)return;
  const items=()=>Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')||[]);
  items()[0]?.focus();
  function outside(event:PointerEvent){if(!menuRef.current?.contains(event.target as Node))setMenu(null);}
  function keys(event:KeyboardEvent){const list=items(),index=list.indexOf(document.activeElement as HTMLElement);if(event.key==='Escape'){event.preventDefault();menu?.trigger.focus();setMenu(null);}if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();list[event.key==='Home'?0:event.key==='End'?list.length-1:(index+(event.key==='ArrowDown'?1:-1)+list.length)%list.length]?.focus();}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',keys);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keys);};
 },[menu]);
 if(disabled&&menu!==null)setMenu(null);
 function openMenu(event:React.MouseEvent<HTMLElement>,group:Group,project?:StudyProject){event.preventDefault();if(disabled)return;const rect=event.currentTarget.getBoundingClientRect();setMenu({group,project,x:Math.max(8,Math.min(event.type==='contextmenu'?event.clientX:rect.left,window.innerWidth-240)),y:Math.max(8,Math.min(event.type==='contextmenu'?event.clientY:rect.bottom+4,window.innerHeight-190)),trigger:event.currentTarget.matches('button')?event.currentTarget:event.currentTarget.querySelector<HTMLElement>('.library-repo,.library-path')||event.currentTarget});}
 function keyboardMenu(event:React.KeyboardEvent<HTMLElement>,group:Group,project?:StudyProject){if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();const rect=event.currentTarget.getBoundingClientRect();if(!disabled)setMenu({group,project,x:Math.max(8,Math.min(rect.left,window.innerWidth-240)),y:Math.max(8,Math.min(rect.bottom,window.innerHeight-190)),trigger:event.currentTarget.matches('button')?event.currentTarget:event.currentTarget.querySelector<HTMLElement>('.library-repo,.library-path')||event.currentTarget});}}
 function act(work:()=>void){setMenu(null);work();}
 return <aside className="learning-library" aria-label="Your learning collection">
  <button type="button" className="library-mobile-toggle" aria-expanded={expanded} aria-controls="learning-library-content" onClick={()=>setExpanded(v=>!v)}>Your collection <span>{projects.length} paths · {grouped.size} repos</span><span aria-hidden="true">{expanded?'−':'+'}</span></button>
  <div id="learning-library-content" className={expanded?'library-content expanded':'library-content'}>
   <div className="library-heading"><h2>Your collection</h2><HelpTip label="Your collection">Repositories you explored and your saved learning paths appear here. Right-click an item or use its three-dot button for actions. Repository maps stay available for 24 hours; saved paths for 30 days. Removing saved learning records does not delete GitHub repositories or separate local caches, working copies and backups.</HelpTip></div>
   <button type="button" className="library-new" disabled={disabled||loading} onClick={onNew}>＋ New learning path</button>
   <ClassEnrollment/>
   {grouped.size>0&&<label className="library-search"><span className="sr-only">Search your collection</span><input type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Find a repo or path"/></label>}
   {loading?<p className="library-empty" role="status">Opening collection…</p>:groups.length===0?<p className="library-empty">{filter?'No matching repositories or paths.':'Explore a repository to start your collection.'}</p>:<nav aria-label="Repositories and learning paths"><ul className="library-groups">{groups.map(group=><li key={group.repository}>
    <div className="library-repo-row" onContextMenu={e=>openMenu(e,group)}><button type="button" className="library-repo" disabled={disabled} title={group.repository} onKeyDown={e=>keyboardMenu(e,group)} onClick={()=>onExplore(group)}><span aria-hidden="true">▱</span><span><span className="library-repo-owner">{group.repository.split('/')[0]}/</span><span className="library-repo-name">{group.repository.split('/').slice(1).join('/')}</span></span></button><button type="button" className="library-more" data-library-repository-action={group.repository} disabled={disabled} aria-label={'Actions for repository '+group.repository} aria-haspopup="menu" aria-expanded={!!menu&&menu.group.repository===group.repository&&!menu.project} onClick={e=>openMenu(e,group)}>⋯</button></div>
    <ul className="library-paths">{group.paths.map(project=><li key={project.id} className={project.id===currentId?'selected':''} onContextMenu={e=>{e.stopPropagation();openMenu(e,group,project);}}><button type="button" className="library-path" disabled={disabled} aria-current={project.id===currentId?'page':undefined} onKeyDown={e=>keyboardMenu(e,group,project)} onClick={()=>{onChoose(project);setExpanded(false);}}><span>{project.learningPath?.featureTitle||'Project investigation'}</span><small>{project.exercises.some(e=>e.status==='independent')?'Attempt active':project.learningPath?.purpose==='transfer'?'Learn & apply':'Improve project'}</small></button><button type="button" className="library-more" data-library-path-action={project.id} disabled={disabled} aria-label={'Actions for learning path '+(project.learningPath?.featureTitle||project.snapshot.repository)} aria-haspopup="menu" aria-expanded={menu?.project?.id===project.id} onClick={e=>openMenu(e,group,project)}>⋯</button></li>)}</ul>
    {group.paths.length===0&&<span className="library-explored">Explored · choose a workflow</span>}
   </li>)}</ul></nav>}
  </div>
  <footer className="library-account"><div className="account-avatar" aria-hidden="true">{displayName.slice(0,1).toUpperCase()}</div><div><strong>{displayName}</strong><span>{workspaceName} workspace</span><SignOutButton/></div></footer>
  {menu&&<div ref={menuRef} className="library-context-menu" role="menu" aria-label={menu.project?'Learning path actions':'Repository actions'} style={{left:menu.x,top:menu.y}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setMenu(null);}}>
   <button type="button" role="menuitem" onClick={()=>act(()=>menu.project?onChoose(menu.project):onExplore(menu.group))}>{menu.project?'Open learning path':'Explore workflows'}</button>
   <a role="menuitem" href={menu.group.url} target="_blank" rel="noreferrer" onClick={()=>setMenu(null)}>View on GitHub ↗</a>
   <button type="button" role="menuitem" className="danger-text" onClick={()=>act(()=>menu.project?onRemovePath(menu.project):onRemoveRepository(menu.group.repository))}>{menu.project?'Remove learning path…':'Remove repository…'}</button>
  </div>}
 </aside>;
}
