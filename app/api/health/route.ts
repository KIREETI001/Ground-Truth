import { getRuntime } from '@/lib/cloud/runtime';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET() {
  try {
    const config=getRuntime();
    await config.DB.prepare('SELECT 1 AS ready').first();
    return Response.json({status:'ok',database:'connected',inference:config.MODEL_API_KEY?'meta-configured':'not-configured',model:'muse-spark-1.3'}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({status:'unavailable'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
