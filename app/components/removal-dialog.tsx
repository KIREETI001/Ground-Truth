'use client';
import { useEffect,useRef } from 'react';
export function RemovalDialog({open,title,description,busy,error,onCancel,onConfirm,restoreFocus}:{open:boolean;title:string;description:string;busy:boolean;error:string;onCancel:()=>void;onConfirm:()=>void;restoreFocus:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null),restore=useRef(restoreFocus);
 useEffect(()=>{restore.current=restoreFocus;},[restoreFocus]);
 useEffect(()=>{if(!open)return;const node=dialog.current;if(!node)return;node.showModal();cancel.current?.focus();return()=>{node.close();restore.current();};},[open]);
 return <dialog ref={dialog} role="alertdialog" aria-modal="true" aria-labelledby="collection-removal-title" aria-describedby="collection-removal-description" className="collection-removal-dialog" onCancel={event=>{event.preventDefault();if(!busy)onCancel();}}>
  <h2 id="collection-removal-title">{title}</h2><p id="collection-removal-description">{description}</p>
  {error&&<p role="alert" className="removal-error">{error}</p>}{busy&&<p role="status">Removing saved records…</p>}
  <div className="button-row"><button ref={cancel} type="button" className="button button-outline" disabled={busy} autoFocus onClick={onCancel}>Cancel</button><button type="button" className="button removal-confirm" disabled={busy} onClick={onConfirm}>{busy?'Removing…':'Remove'}</button></div>
 </dialog>;
}
