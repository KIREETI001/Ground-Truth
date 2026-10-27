'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Compass, LocateFixed } from 'lucide-react';
import { Modal } from './lab-ui';
import type { GuideStep } from '@/lib/learning/guide';

export function focusArea(targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
}

export function AreaTour({ steps, label = 'Quick tour', floating = false }: { steps: GuideStep[]; label?: string; floating?: boolean }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const launcher = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<{ targetId?: string } | null>(null);
  function closeTour(targetId?: string) {
    pendingFocus.current = { targetId };
    setOpen(false);
  }
  useEffect(() => {
    if (open || !pendingFocus.current) return;
    const destination = pendingFocus.current;
    pendingFocus.current = null;
    // Run after the dialog's close/unmount cleanup, which can otherwise move focus to body.
    const frame = requestAnimationFrame(() => {
      if (destination.targetId) focusArea(destination.targetId);
      else launcher.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    if (!floating) return;
    function keepFocusedControlVisible(event: FocusEvent) {
      const control = event.target;
      if (!(control instanceof HTMLElement) || control === launcher.current || control.closest('dialog') || !control.matches('input, textarea, select, button, a, [contenteditable="true"]')) return;
      const guide = launcher.current?.getBoundingClientRect();
      const bounds = control.getBoundingClientRect();
      if (guide && bounds.right > guide.left - 12 && bounds.left < guide.right + 12 && bounds.bottom > guide.top - 12 && bounds.top < guide.bottom + 12) {
        control.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
      }
    }
    document.addEventListener('focusin', keepFocusedControlVisible);
    return () => document.removeEventListener('focusin', keepFocusedControlVisible);
  }, [floating]);
  const step = steps[index];
  return <><button ref={launcher} className={`button button-outline tour-launch${floating ? ' tour-floating' : ''}`} aria-haspopup="dialog" aria-label="Open quick guide and replay the navigation tour" onClick={() => { setIndex(0); setOpen(true); }}><Compass size={18} />{label}</button>{open && step && <Modal title="A quick look around" onClose={() => closeTour()}><div className="tour-content"><span className="section-kicker">{index + 1} of {steps.length} · Navigation guide</span><span className="tour-symbol"><Compass size={28} /></span><h3>{step.title}</h3><p>{step.detail}</p><button className="text-link" onClick={() => closeTour(step.targetId)}><LocateFixed size={17} />Show me this area</button><div className="tour-controls"><button className="button button-ghost" onClick={() => closeTour()}>Skip tour</button><button className="button button-primary" onClick={() => index + 1 < steps.length ? setIndex(index + 1) : closeTour()}>{index + 1 < steps.length ? 'Next' : 'Finish tour'}<ArrowRight size={16} /></button></div></div></Modal>}</>;
}
