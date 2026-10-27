import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Brand } from './brand';

export function SiteNav({ current }: { current: 'home' | 'learn' | 'workspace' }) {
  return <header className="learning-header"><Brand /><nav className="learning-nav" aria-label="Main navigation"><Link href="/" aria-current={current === 'home' ? 'page' : undefined}>Home</Link><a href="/learn" aria-current={current === 'learn' ? 'page' : undefined}>Learn</a><a href="/workspace" aria-current={current === 'workspace' ? 'page' : undefined}>Live playground <ArrowUpRight size={16} /></a></nav><span className="nav-note"><span className="status-dot" /> A little practice. A clearer picture.</span></header>;
}
