import type { RuntimeConfig } from '../contracts.ts';

/** Cache public, credential-free GitHub GETs in Next's shared Data Cache. */
export function cachedPublicGitHubFetch(network:typeof fetch):typeof fetch{
 return (input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  const headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));
  const method=init?.method||(input instanceof Request?input.method:'GET');
  if(url.origin!=='https://api.github.com'||url.username||url.password||method!=='GET'||headers.has('authorization')||headers.has('cookie'))return network(input,init);
  // Source URLs are commit/blob pinned. Repository visibility/ref lookups are
  // revalidated after five minutes; cached data is still treated as untrusted.
  return network(input,{...init,cache:'force-cache',next:{revalidate:300}} as RequestInit&{next:{revalidate:number}});
 };
}
export function cloudGitHubFetcher(config:Pick<RuntimeConfig,'CLOUD_ENABLED'>,injected?:typeof fetch):typeof fetch|undefined{
 if(injected)return injected;
 return config.CLOUD_ENABLED==='true'&&process.env.NODE_ENV==='production'?cachedPublicGitHubFetch(fetch):undefined;
}
