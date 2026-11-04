import { redirect } from 'next/navigation';
import { signedInProfile } from '../platform-auth';
import { RegistrationForm } from '../components/registration-form';
import { getRuntime } from '@/lib/cloud/runtime';
export const dynamic='force-dynamic';
export default async function Onboarding({searchParams}:{searchParams:Promise<{role?:string}>}){
 const profile=await signedInProfile();if(!profile)redirect('/login');
 if(profile.role!=='user')redirect('/');
 const existing=await getRuntime().DB.prepare('SELECT user_id FROM account_profiles WHERE user_id=?').bind(profile.user.userId).first();if(existing)redirect('/');
 const params=await searchParams;if(params.role&&params.role!=='user'&&params.role!=='teacher')redirect('/login');
 return <main className="platform-main"><RegistrationForm role={params.role==='teacher'?'teacher':'user'}/></main>;
}
