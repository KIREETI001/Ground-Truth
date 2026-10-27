import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import type { RuntimeConfig } from '../../../lib/contracts';
import { handleApi } from '../../../lib/server/index';

export const dynamic = 'force-dynamic';

async function dispatch(request: Request): Promise<Response> {
  const user = await getChatGPTUser();
  return handleApi(request, env as unknown as RuntimeConfig, user?.userId ?? null);
}

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
