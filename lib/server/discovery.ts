import { analyseProject, projectTree } from '../discovery/github.ts';
import { readRadar } from '../discovery/radar.ts';
import type { DiscoveryFetcher } from '../discovery/types.ts';
import { ApiError, fields, json } from './http.ts';

// The main dispatcher supplies the same-origin, bounded JSON body for mutations.
// Public-source reads intentionally do not require a visitor GitHub or native Site account.
export async function handleDiscovery(request: Request, body: Record<string, unknown>, fetcher?: DiscoveryFetcher): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!['/api/projects/tree', '/api/projects/analyse', '/api/radar'].includes(path)) return null;
  const method = path === '/api/radar' ? 'GET' : 'POST';
  if (request.method !== method) throw new ApiError(405, 'METHOD_NOT_ALLOWED');
  if (path === '/api/radar') return json(await readRadar(fetcher));
  if (path === '/api/projects/tree') {
    fields(body, ['url']);
    return json(await projectTree({ url: body.url }, fetcher));
  }
  fields(body, ['url', 'commit', 'paths']);
  return json(await analyseProject({ url: body.url, commit: body.commit, paths: body.paths }, fetcher));
}
