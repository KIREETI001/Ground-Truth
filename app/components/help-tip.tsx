'use client';
import { useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';

export function HelpTip({label,children}:{label:string;children:ReactNode}){
 const id=useId(),anchor=useRef<HTMLButtonElement>(null),bubble=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [hover,setHover]=useState(false),[focus,setFocus]=useState(false),[pinned,setPinned]=useState(false),[dismissed,setDismissed]=useState(false),[position,setPosition]=useState<{left:number;top:number;width:number}|null>(null);
 const open=!dismissed&&(hover||focus||pinned);
 function enter(){if(timer.current)clearTimeout(timer.current);setDismissed(false);setHover(true);}
 function leave(){timer.current=setTimeout(()=>setHover(false),160);}
 function close(){setPinned(false);setDismissed(true);}
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 useEffect(()=>{if(!open)return;const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};const outside=(e:PointerEvent)=>{if(!anchor.current?.contains(e.target as Node)&&!bubble.current?.contains(e.target as Node))close();};document.addEventListener('keydown',escape);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside);};},[open]);
 useLayoutEffect(()=>{
  if(!open)return;
  function place(){const rect=anchor.current?.getBoundingClientRect();if(!rect)return;const viewportWidth=document.documentElement.clientWidth,viewportHeight=document.documentElement.clientHeight,width=Math.min(304,viewportWidth-24),height=bubble.current?.getBoundingClientRect().height||150;setPosition({width,left:Math.max(12,Math.min(rect.left,viewportWidth-width-12)),top:rect.bottom+height+10>viewportHeight?Math.max(12,rect.top-height-8):rect.bottom+8});}
  place();const frame=requestAnimationFrame(place);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open]);
 return <span className="help-tip"><button ref={anchor} type="button" className="help-trigger" aria-label={'Help: '+label} aria-expanded={open} aria-describedby={open?id:undefined} onPointerEnter={enter} onPointerLeave={leave} onFocus={()=>{setFocus(true);setDismissed(false);}} onBlur={()=>{setFocus(false);setPinned(false);}} onClick={()=>{setPinned(!pinned);setDismissed(pinned);}}><CircleHelp size={17} aria-hidden="true"/></button>{open&&position&&createPortal(<div ref={bubble} id={id} role="tooltip" className="help-bubble" style={position} onPointerEnter={enter} onPointerLeave={leave}><strong>{label}</strong><div>{children}</div></div>,document.body)}</span>;
}
