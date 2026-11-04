import { redirect } from 'next/navigation';
import { signedInProfile } from './platform-auth';
import { platformHome } from '@/lib/platform-routing';
export const dynamic = 'force-dynamic';
export default async function Home() {
 const profile = await signedInProfile();
 redirect(profile ? platformHome(profile.role) : '/login');
}
