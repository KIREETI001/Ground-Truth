import { redirect } from 'next/navigation';
import { signedInProfile } from '../platform-auth';
import { platformHome } from '@/lib/platform-routing';
import { Brand } from '../components/brand';
import { AnimatedJourney } from '../components/animated-journey';
import { AuthPanel } from '../components/auth-panel';
import { DemoEntry } from '../components/demo-entry';
import '../demo-entry.css';
export const dynamic='force-dynamic';
export default async function Login(){const profile=await signedInProfile();if(profile)redirect(platformHome(profile.role));return <div className="platform-page landing-page"><header className="platform-header"><Brand/><span className="platform-kicker">UNDERSTAND WHAT YOU BUILD</span></header><main className="platform-main"><DemoEntry/><div className="login-main"><div className="login-story"><section className="login-intro"><p className="platform-kicker">GROUNDTRUTH / FROM CODE TO SYSTEMS THINKING</p><h1>Understand your code.<br/><em>Think in systems.</em></h1><p className="platform-lead">Bring a GitHub project. See how its features, architecture and code fit together. Practise the next change yourself.</p><p>Build engineering judgement through focused practice. Give teachers evidence of your understanding alongside the project you submit. Share only the work you choose.</p></section><AnimatedJourney/></div><AuthPanel/></div><footer className="platform-foot">Meta-powered guidance · Public GitHub repositories · Explicit teacher sharing · Formative evidence, human judgement</footer></main></div>;}
