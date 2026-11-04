import { redirect } from 'next/navigation';
import { signedInProfile } from '../../platform-auth';
import { Brand } from '../../components/brand';
import { DemoTeacherPreview } from './preview';
import { isDemoUser } from '@/lib/demo/security';
import '../../demo-entry.css';

export const dynamic = 'force-dynamic';

export default async function DemoTeacherPage() {
  const profile = await signedInProfile();
  if (!profile) redirect('/login');
  if (!isDemoUser(profile.user.userId)) redirect('/user');
  return <div className="platform-page demo-teacher-page">
    <header className="platform-header"><Brand/><a href="/user" className="text-link">Back to my sample</a></header>
    <main className="platform-main"><DemoTeacherPreview/></main>
  </div>;
}
