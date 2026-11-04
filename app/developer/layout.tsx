import { requirePlatform } from '../platform-auth';
export const dynamic = 'force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}) { await requirePlatform('developer'); return <>{children}</>; }
