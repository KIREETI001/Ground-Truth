export type PlatformRole = 'user' | 'teacher' | 'developer';
export function platformHome(role: PlatformRole): string { return role === 'developer' ? '/developer' : role === 'teacher' ? '/teacher' : '/user'; }

