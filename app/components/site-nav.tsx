'use client';

import Link from 'next/link';
import { BookOpen, CircleUserRound, Compass, House, Layers3 } from 'lucide-react';
import { Brand } from './brand';
import { useLearner } from './learner-context';

type Destination = 'home' | 'learn' | 'projects' | 'radar' | 'profile' | 'workspace';
const destinations = [
  { id: 'home', href: '/', label: 'Today', icon: House },
  { id: 'learn', href: '/learn', label: 'Learn', icon: BookOpen },
  { id: 'projects', href: '/projects', label: 'Projects', icon: Layers3 },
  { id: 'radar', href: '/radar', label: 'Radar', icon: Compass },
];
export function SiteNav({ current }: { current: Destination }) {
  const { phase, dirty } = useLearner();
  return <header className="learning-header journey-header"><Brand /><nav className="learning-nav" aria-label="Main navigation">{destinations.map(({ id, href, label, icon: Icon }) => <Link key={id} href={href} aria-current={current === id ? 'page' : undefined}><Icon size={17} />{label}</Link>)}</nav><Link className={`journey-avatar${dirty ? ' has-draft' : ''}`} href="/profile" aria-label={dirty ? 'Profile and unsaved changes' : 'Profile and your data'} aria-current={current === 'profile' ? 'page' : undefined}><CircleUserRound size={23} /><span>{phase === 'loading' ? 'Your path' : phase === 'account' ? 'My profile' : 'Device profile'}</span>{dirty && <i aria-hidden="true" />}</Link></header>;
}
