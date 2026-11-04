import { getRuntime } from '../../../lib/cloud/runtime';
import { localIdentity } from '../../../lib/server/local-auth';
import { handleApi } from '../../../lib/server/index';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

async function dispatch(request: Request): Promise<Response> {
  const config = getRuntime();
  try {
    const user = await localIdentity(request, config);
    return handleApi(request, config, user?.userId ?? null);
  } catch {
    return Response.json({error:{code:'SERVICE_UNAVAILABLE',message:'The service is temporarily unavailable. Please retry shortly.'}}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
