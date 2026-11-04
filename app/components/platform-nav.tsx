import type { ReactNode } from 'react';
import { SignOutButton } from './sign-out-button';
import { Brand } from './brand';
export function PlatformNav({current,children,accountInSidebar=false}: {current?: string;children?:ReactNode;accountInSidebar?:boolean}) { return <header className={accountInSidebar?"platform-header workspace-header":"platform-header"}><Brand/>{children}{!accountInSidebar&&<nav aria-label="Your workspace"><span className="platform-kicker">{current ? current+' workspace' : 'GroundTruth'}</span><SignOutButton/></nav>}</header>; }
