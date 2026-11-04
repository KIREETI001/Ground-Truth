import { getRuntime } from '@/lib/cloud/runtime';
import { headers } from 'next/headers';
import { localIdentity } from '@/lib/server/local-auth';
import { redirect } from 'next/navigation';
import { platformRole } from '@/lib/server/access';
import { platformHome, type PlatformRole } from '@/lib/platform-routing';

export async function signedInProfile() {
 const runtime=getRuntime();
 const h=await headers();
 const user = await localIdentity(new Request('https://'+(h.get('host')||'127.0.0.1:5173')+'/',{headers:new Headers(h)}),runtime);
 if (!user) return null;
 return { user, role: await platformRole(runtime, user.userId) };
}
export async function requirePlatform(expected: PlatformRole) {
 const profile = await signedInProfile();
 if (!profile) redirect('/login');
 if (profile.role !== expected) redirect(platformHome(profile.role));
 return profile;
}

