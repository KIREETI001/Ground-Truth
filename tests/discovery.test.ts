import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseProject, projectTree } from '../lib/discovery/github.ts';
import { readRadar } from '../lib/discovery/radar.ts';
import { handleDiscovery } from '../lib/server/discovery.ts';
import { ApiError } from '../lib/server/http.ts';
import type { DiscoveryFetcher } from '../lib/discovery/types.ts';

const COMMIT = 'a'.repeat(40), TREE = 'b'.repeat(40), BLOB = 'c'.repeat(40);
const REPO = 'https://github.com/student/web-app';
const API = 'https://api.github.com/repos/student/web-app';
const MAIN = 'export async function load() { return await fetch("/api/items"); }';
type Entry = { path: string; mode: string; type: string; size: number; sha: string; url: string };
function entry(path: string, text = MAIN, overrides: Partial<Entry> = {}): Entry {
  return { path, mode: '100644', type: 'blob', size: new TextEncoder().encode(text).length, sha: BLOB,
    url: `${API}/git/blobs/${BLOB}`, ...overrides };
}
function githubFixture(entries = [entry('src/main.ts')], sources: Record<string, string | Response> = { [BLOB]: MAIN }, truncated = false) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); calls.push({ url, init });
    if (url === API) return Response.json({ full_name: 'student/web-app', private: false, default_branch: 'main' });
    if (url === `${API}/git/ref/heads/main`) return Response.json({ ref: 'refs/heads/main', object: { type: 'commit', sha: COMMIT, url: `${API}/git/commits/${COMMIT}` } });
    if (url === `${API}/git/commits/${COMMIT}`) return Response.json({ sha: COMMIT, tree: { sha: TREE, url: `${API}/git/trees/${TREE}` }, parents: [], message: 'fixture' });
    if (url === `${API}/git/trees/${TREE}?recursive=1`) return Response.json({ sha: TREE, url: `${API}/git/trees/${TREE}`, tree: entries, truncated });
    const source = sources[url.slice(`${API}/git/blobs/`.length)];
    if (url.startsWith(`${API}/git/blobs/`) && source !== undefined) return typeof source === 'string' ? new Response(source, { headers: { 'content-type': 'text/plain' } }) : source;
    throw new Error(`Unexpected network read ${url}`);
  }) as DiscoveryFetcher;
  return { calls, fetcher };
}
async function rejectsCode(action: () => Promise<unknown>, code: string, status?: number) {
  await assert.rejects(action, (error: unknown) => error instanceof ApiError && error.code === code && (status === undefined || error.status === status));
}

// Catches an SSRF bypass or a hidden builder-credential dependency before any network read.
test('repository URLs reject hosts, credentials, ports, encoded paths and extra URL components before fetch', async () => {
  let reads = 0;
  const fetcher = (async () => { reads++; throw new Error('No network allowed'); }) as DiscoveryFetcher;
  for (const url of ['http://github.com/student/web-app', 'https://github.com.evil.test/student/web-app',
    'https://api.github.com/student/web-app', 'https://user:password@github.com/student/web-app',
    'https://github.com:443/student/web-app', 'https://github.com/student/web-app?ref=main',
    'https://github.com/student/web-app#readme', 'https://github.com/student/web-app?',
    'https://github.com/student/web-app#', 'https://github.com/student/web-app/tree/main',
    'https://github.com/student/%2e%2e', 'https://github.com/student/../repo',
    'https://github.com/student/repo%2fsecret', 'https://github.com\\@evil.test/student/web-app',
    ' https://github.com/student/web-app', 'file:///etc/passwd', '', null]) {
    await rejectsCode(() => projectTree({ url }, fetcher), 'PROJECT_URL_INVALID', 400);
  }
  assert.equal(reads, 0);
});

test('tree inspection pins one public commit and reads only fixed API URLs without credentials or redirects', async () => {
  const fixture = githubFixture();
  const tree = await projectTree({ url: REPO }, fixture.fetcher);
  assert.equal(tree.repository, 'student/web-app'); assert.equal(tree.url, REPO); assert.equal(tree.commit, COMMIT);
  assert.deepEqual(tree.files, [{ path: 'src/main.ts', language: 'TypeScript', size: 66 }]);
  assert.equal(tree.truncated, false);
  assert.deepEqual(fixture.calls.map(call => call.url), [API, `${API}/git/ref/heads/main`, `${API}/git/commits/${COMMIT}`, `${API}/git/trees/${TREE}?recursive=1`]);
  for (const call of fixture.calls) {
    const headers = new Headers(call.init?.headers);
    assert.equal(call.init?.redirect, 'manual'); assert.equal(call.init?.credentials, 'omit');
    assert.equal(headers.has('authorization'), false); assert.ok(call.init?.signal instanceof AbortSignal);
  }
});

test('tree excludes credentials, dependencies, generated code, binary names, symlinks and unbounded files', async () => {
  const fixture = githubFixture([entry('src/main.ts'), ...['.env', '.env.ts', 'src/credentials.ts', 'src/secrets.js',
    'src/api-key.ts', 'src/generated/client.ts', 'vendor/lib.js', 'node_modules/pkg/index.ts', 'dist/app.js',
    '.git/hooks/run.py', 'package-lock.json', 'yarn.lock', 'src/app.min.js', 'src/auto.generated.ts',
    'photo.png', '../outside.ts', 'src/%2e%2e.ts', 'src/back\\slash.ts'].map(path => entry(path)),
  entry('src/link.ts', '', { mode: '120000' }), entry('src/submodule.ts', '', { type: 'commit', mode: '160000' }),
  entry('src/huge.ts', '', { size: 12_289 }), entry('src/empty.ts', '', { size: 0 })]);
  const tree = await projectTree({ url: REPO }, fixture.fetcher);
  assert.deepEqual(tree.files.map(file => file.path), ['src/main.ts']);
  assert.ok(tree.warnings.length > 0);
});

test('tree truncation is disclosed without silently fetching another repository or unlimited subtrees', async () => {
  const fixture = githubFixture([entry('src/main.ts')], undefined, true);
  const tree = await projectTree({ url: REPO }, fixture.fetcher);
  assert.equal(tree.truncated, true); assert.match(tree.warnings.join(' '), /truncat|partial/i); assert.equal(fixture.calls.length, 4);
});

test('private repository metadata, changed commit identity and mismatched trees fail closed', async () => {
  const base = githubFixture();
  const privateRepo = (async () => Response.json({ full_name: 'student/web-app', private: true, default_branch: 'main' })) as DiscoveryFetcher;
  await rejectsCode(() => projectTree({ url: REPO }, privateRepo), 'PROJECT_PUBLIC_REQUIRED', 400);
  const wrongCommit = (async (url: RequestInfo | URL, init?: RequestInit) => String(url).includes('/git/commits/')
    ? Response.json({ sha: 'd'.repeat(40), tree: { sha: TREE } }) : base.fetcher(url, init)) as DiscoveryFetcher;
  await rejectsCode(() => analyseProject({ url: REPO, commit: COMMIT, paths: ['src/main.ts'] }, wrongCommit), 'PROJECT_RESPONSE_INVALID', 502);
  const wrongTree = (async (url: RequestInfo | URL, init?: RequestInit) => String(url).includes('/git/trees/')
    ? Response.json({ sha: 'd'.repeat(40), tree: [entry('src/main.ts')], truncated: false }) : base.fetcher(url, init)) as DiscoveryFetcher;
  await rejectsCode(() => analyseProject({ url: REPO, commit: COMMIT, paths: ['src/main.ts'] }, wrongTree), 'PROJECT_RESPONSE_INVALID', 502);
});

test('selection validates full commit SHA, one to five unique source paths and aggregate size', async () => {
  const fixture = githubFixture();
  for (const commit of ['main', 'a'.repeat(39), 'a'.repeat(41), 'g'.repeat(40), null]) {
    await rejectsCode(() => analyseProject({ url: REPO, commit, paths: ['src/main.ts'] }, fixture.fetcher), 'PROJECT_COMMIT_INVALID', 400);
  }
  for (const paths of [[], Array(6).fill('src/main.ts'), ['src/main.ts', 'src/main.ts'], ['../outside.ts'], ['.env.ts'], ['src/a%2fb.ts'], ['src/main.ts?x'], null]) {
    await rejectsCode(() => analyseProject({ url: REPO, commit: COMMIT, paths }, fixture.fetcher), 'PROJECT_PATHS_INVALID', 400);
  }
  assert.equal(fixture.calls.length, 0);
  const large = githubFixture(['one.ts', 'two.ts', 'three.ts'].map((path, index) => entry(path, '', { size: 12_000, sha: String(index + 1).repeat(40) })));
  await rejectsCode(() => analyseProject({ url: REPO, commit: COMMIT, paths: ['one.ts', 'two.ts', 'three.ts'] }, large.fetcher), 'PROJECT_SELECTION_TOO_LARGE', 400);
  assert.equal(large.calls.some(call => call.url.includes('/git/blobs/')), false);
});

test('analysis confirms paths against the pinned tree and never reads an unselected blob or a branch head', async () => {
  const fixture = githubFixture([entry('src/main.ts'), entry('src/other.ts', 'const hidden = 1;', { sha: 'd'.repeat(40) })]);
  await rejectsCode(() => analyseProject({ url: REPO, commit: COMMIT, paths: ['src/missing.ts'] }, fixture.fetcher), 'PROJECT_PATH_NOT_IN_TREE', 400);
  assert.equal(fixture.calls.some(call => call.url.includes('/git/blobs/')), false);
  fixture.calls.length = 0;
  const snapshot = await analyseProject({ url: REPO, commit: COMMIT, paths: ['src/main.ts'] }, fixture.fetcher);
  assert.equal(snapshot.commit, COMMIT); assert.equal(snapshot.repository, 'student/web-app');
  assert.equal(snapshot.files[0].path, 'src/main.ts'); assert.equal(snapshot.files[0].excerpt, MAIN);
  assert.equal(snapshot.suggestedMissionId, 'async-in-order');
  assert.ok(snapshot.signals.some(signal => signal.skillId === 'async' && signal.path === 'src/main.ts'));
  assert.match(snapshot.warnings.join(' '), /understanding.*not|not.*understanding/i);
  assert.deepEqual(fixture.calls.map(call => call.url), [API, `${API}/git/commits/${COMMIT}`, `${API}/git/trees/${TREE}?recursive=1`, `${API}/git/blobs/${BLOB}`]);
});

test('content signals come from selected source text, carry provenance and cannot become unlimited output', async () => {
  const code = 'const values = new Map(); async function load(userId) { await fetch("/api"); }\ntest("works", () => assert(values));\n' + 'x'.repeat(4_000);
  const sql = 'SELECT id FROM items WHERE owner_id = ?;';
  const fixture = githubFixture([entry('src/main.ts', code), entry('db/query.sql', sql, { sha: 'd'.repeat(40) })], { [BLOB]: code, ['d'.repeat(40)]: sql });
  const snapshot = await analyseProject({ url: REPO, commit: COMMIT, paths: ['src/main.ts', 'db/query.sql'] }, fixture.fetcher);
  assert.equal(snapshot.suggestedMissionId, 'check-the-owner');
  assert.ok(snapshot.files.every(file => file.excerpt.length <= 1_500));
  assert.ok(snapshot.signals.length <= 20); assert.ok(snapshot.signals.every(signal => signal.note.length <= 200));
  assert.ok(snapshot.signals.every(signal => ['src/main.ts', 'db/query.sql'].includes(signal.path)));
  assert.ok(snapshot.signals.some(signal => signal.skillId === 'sql' && signal.path === 'db/query.sql'));
  assert.ok(snapshot.signals.some(signal => signal.skillId === 'testing'));
  assert.ok(new TextEncoder().encode(JSON.stringify(snapshot)).length <= 20_480);
  assert.match(snapshot.warnings.join(' '), /excerpt/i);
});

test('source that only names an async file does not invent an async signal', async () => {
  const source = 'export const greeting = "hello";';
  const fixture = githubFixture([entry('src/async.ts', source)], { [BLOB]: source });
  const snapshot = await analyseProject({ url: REPO, commit: COMMIT, paths: ['src/async.ts'] }, fixture.fetcher);
  assert.equal(snapshot.signals.some(signal => signal.skillId === 'async'), false);
  assert.equal(snapshot.suggestedMissionId, 'scan-the-queue');
});

test('redirects and upstream rate limits are explicit errors with no follow-up network read', async () => {
  for (const [status, code] of [[302, 'PROJECT_REDIRECT_REFUSED'], [403, 'PROJECT_RATE_LIMITED'], [429, 'PROJECT_RATE_LIMITED'], [404, 'PROJECT_NOT_FOUND']] as const) {
    let calls = 0;
    const fetcher = (async () => { calls++; return new Response('', { status, headers: { location: 'https://evil.test/', 'x-ratelimit-remaining': '0' } }); }) as DiscoveryFetcher;
    await rejectsCode(() => projectTree({ url: REPO }, fetcher), code);
    assert.equal(calls, 1);
  }
});

test('response limits count streamed bytes and cancel oversized metadata instead of trusting Content-Length', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(16_385)); }, cancel() { cancelled = true; } });
  const fetcher = (async () => new Response(stream, { headers: { 'content-type': 'application/json', 'content-length': '1' } })) as DiscoveryFetcher;
  await rejectsCode(() => projectTree({ url: REPO }, fetcher), 'PROJECT_RESPONSE_TOO_LARGE', 502);
  assert.equal(cancelled, true);
});

test('binary source, credential-like source and failed blobs disclose limits instead of generating evidence', async () => {
  for (const source of ['const x = "\u0000";', 'export const apiKey = "sk-abcdefghijklmnopqrstuvwxyz123456";', new Response('', { status: 404 })]) {
    const fixture = githubFixture([entry('src/main.ts')], { [BLOB]: source });
    await rejectsCode(() => analyseProject({ url: REPO, commit: COMMIT, paths: ['src/main.ts'] }, fixture.fetcher), 'PROJECT_NO_READABLE_FILES', 422);
  }
});

test('an unreadable selected file produces a named partial warning while retaining actual readable evidence', async () => {
  const fixture = githubFixture([entry('src/main.ts'), entry('src/missing.ts', MAIN, { sha: 'd'.repeat(40) })], { [BLOB]: MAIN, ['d'.repeat(40)]: new Response('', { status: 404 }) });
  const snapshot = await analyseProject({ url: REPO, commit: COMMIT, paths: ['src/main.ts', 'src/missing.ts'] }, fixture.fetcher);
  assert.deepEqual(snapshot.files.map(file => file.path), ['src/main.ts']);
  assert.match(snapshot.warnings.join(' '), /src\/missing\.ts.*unavailable/i);
});

const RSS = (items: string) => `<?xml version="1.0"?><rss version="2.0"><channel><title>Publisher</title>${items}</channel></rss>`;
const RSS_ITEM = (title: string, url: string, date = 'Tue, 27 Oct 2026 12:00:00 +0000') => `<item><title>${title}</title><link>${url}</link><pubDate>${date}</pubDate></item>`;
const FEEDS = ['https://github.blog/changelog/feed/', 'https://web.dev/static/blog/feed.xml', 'https://devblogs.microsoft.com/typescript/feed/'];

test('project and Radar readers work with the deployed Worker redirect contract', async () => {
  const edge = (inner: DiscoveryFetcher): DiscoveryFetcher => (async (url, init) => {
    if (init?.redirect !== 'manual') throw new TypeError('Workers accepts follow or manual; error mode is unsupported.');
    return inner(url, init);
  }) as DiscoveryFetcher;
  const project = await projectTree({ url: REPO }, edge(githubFixture().fetcher));
  assert.deepEqual(project.files.map(file => file.path), ['src/main.ts']);
  const radar = await readRadar(edge((async () => new Response(RSS(''))) as DiscoveryFetcher));
  assert.deepEqual(radar.sources.map(source => source.error), [null, null, null]);
});

test('platform transport failures become an actionable source error without internal identifiers', async () => {
  const radar = await readRadar((async () => { throw new Error('internal error; reference = private-runtime-id'); }) as DiscoveryFetcher);
  assert.ok(radar.sources.every(source => source.error === 'Source could not be read. Try Refresh or open the publisher directly.'));
});

// Catches publishing feed markup or fabricated dates as current source headlines.
test('radar uses the official fixed feeds and returns plain titles, real dates and separately labelled application angles', async () => {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetcher = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url) === FEEDS[0]) return new Response(RSS(RSS_ITEM('<![CDATA[Tools &amp; <b>testing</b>]]>', 'https://github.blog/changelog/2026-10-27-tools/')));
    if (String(url) === FEEDS[1]) return new Response(`<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Web &amp; APIs</title><link href="https://web.dev/blog/api-update" rel="alternate"/><published>2026-10-26T09:30:00Z</published><updated>2026-10-28T10:00:00Z</updated></entry></feed>`);
    if (String(url) === FEEDS[2]) return new Response(RSS(RSS_ITEM('Types &#x26; tooling', 'https://devblogs.microsoft.com/typescript/typed-tooling/')));
    throw new Error('Unexpected feed');
  }) as DiscoveryFetcher;
  const radar = await readRadar(fetcher);
  assert.deepEqual(calls.map(call => call.url), FEEDS);
  assert.deepEqual(radar.sources.map(source => source.title), ['GitHub Changelog', 'web.dev', 'Microsoft TypeScript Blog']);
  assert.deepEqual(radar.sources.map(source => source.items[0]?.title), ['Tools & testing', 'Web & APIs', 'Types & tooling']);
  assert.equal(radar.sources[1].items[0].publishedAt, '2026-10-26T09:30:00.000Z');
  assert.ok(!Number.isNaN(Date.parse(radar.fetchedAt)));
  for (const source of radar.sources) {
    assert.equal(source.error, null); assert.match(source.items[0].learningAngle, /^Application idea:/);
    assert.ok(source.items[0].missionId.length > 0);
  }
  for (const call of calls) { assert.equal(call.init?.redirect, 'manual'); assert.equal(call.init?.credentials, 'omit'); assert.equal(new Headers(call.init?.headers).has('authorization'), false); }
});

test('radar rejects unsafe or wrong-publisher links and missing, invalid or future publication dates', async () => {
  const unsafe = RSS_ITEM('Unsafe', 'javascript:alert(1)') + RSS_ITEM('Credentials', 'https://u:p@github.blog/changelog/x/') +
    RSS_ITEM('Port', 'https://github.blog:443/changelog/x/') + RSS_ITEM('Wrong publisher', 'https://evil.test/entry') +
    RSS_ITEM('Tracking fragment', 'https://github.blog/changelog/x/#fragment') +
    RSS_ITEM('Missing date', 'https://github.blog/changelog/a/', '') + RSS_ITEM('Invalid date', 'https://github.blog/changelog/b/', 'yesterday') +
    RSS_ITEM('Future', 'https://github.blog/changelog/c/', '2099-01-01T00:00:00Z') + RSS_ITEM('Valid', 'https://github.blog/changelog/valid/');
  const radar = await readRadar((async (url: RequestInfo | URL) => new Response(String(url) === FEEDS[0] ? RSS(unsafe) : RSS(''))) as DiscoveryFetcher);
  assert.deepEqual(radar.sources[0].items.map(item => item.title), ['Valid']);
  assert.equal(radar.sources[0].error, null); assert.equal(radar.sources[1].error, null); assert.deepEqual(radar.sources[1].items, []);
});

test('radar reports each failed, redirected, malformed or oversized source independently', async () => {
  const failed = await readRadar((async (url: RequestInfo | URL) => {
    if (String(url) === FEEDS[0]) return new Response('', { status: 503 });
    if (String(url) === FEEDS[1]) return new Response('', { status: 302, headers: { location: 'https://evil.test/' } });
    return new Response(RSS(RSS_ITEM('Still available', 'https://devblogs.microsoft.com/typescript/available/')));
  }) as DiscoveryFetcher);
  assert.ok(failed.sources[0].error); assert.ok(failed.sources[1].error);
  assert.equal(failed.sources[2].error, null); assert.equal(failed.sources[2].items[0].title, 'Still available');
  const malformed = await readRadar((async () => new Response('<html><body>not a feed</body></html>')) as DiscoveryFetcher);
  assert.ok(malformed.sources.every(source => source.error && source.items.length === 0));
  const oversized = await readRadar((async () => new Response('x'.repeat(524_289))) as DiscoveryFetcher);
  assert.ok(oversized.sources.every(source => source.error && source.items.length === 0));
});

test('radar does not expand XML entities and bounds headline text and item counts', async () => {
  const entity = '<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY leak SYSTEM "https://evil.test/">]><rss><channel/></rss>';
  const blocked = await readRadar((async () => new Response(entity)) as DiscoveryFetcher);
  assert.ok(blocked.sources.every(source => source.error));
  const items = Array.from({ length: 20 }, (_, index) => RSS_ITEM(`Headline ${index} ${'z'.repeat(500)}`, `https://github.blog/changelog/item-${index}/`)).join('');
  const bounded = await readRadar((async (url: RequestInfo | URL) => new Response(String(url) === FEEDS[0] ? RSS(items) : RSS(''))) as DiscoveryFetcher);
  assert.ok(bounded.sources[0].items.length > 0 && bounded.sources[0].items.length <= 8);
  assert.ok(bounded.sources[0].items.every(item => item.title.length <= 200));
});

test('discovery routes expose only exact methods and fields and leave unrelated routing alone', async () => {
  const fixture = githubFixture();
  const tree = await handleDiscovery(new Request('https://groundtruth.test/api/projects/tree', { method: 'POST' }), { url: REPO }, fixture.fetcher);
  assert.equal(tree?.status, 200); assert.equal((await tree!.json() as { commit: string }).commit, COMMIT);
  await rejectsCode(() => handleDiscovery(new Request('https://groundtruth.test/api/projects/tree', { method: 'POST' }), { url: REPO, token: 'never-used' }, fixture.fetcher), 'UNKNOWN_FIELD', 400);
  await rejectsCode(() => handleDiscovery(new Request('https://groundtruth.test/api/projects/tree'), {}, fixture.fetcher), 'METHOD_NOT_ALLOWED', 405);
  assert.equal(await handleDiscovery(new Request('https://groundtruth.test/api/other'), {}, fixture.fetcher), null);
});

test('the project deadline aborts an unresponsive fetch even when the injected transport ignores the signal', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal: AbortSignal | undefined;
  const fetcher = (async (_url: RequestInfo | URL, init?: RequestInit) => { signal = init?.signal ?? undefined; return await new Promise<Response>(() => {}); }) as DiscoveryFetcher;
  const pending = projectTree({ url: REPO }, fetcher);
  const rejected = rejectsCode(() => pending, 'PROJECT_TIMEOUT', 504);
  await Promise.resolve(); t.mock.timers.tick(10_001); await rejected;
  assert.equal(signal?.aborted, true);
});

test('the project deadline also stops a stalled response body', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('{')); }, cancel() { cancelled = true; } });
  const pending = projectTree({ url: REPO }, (async () => new Response(stream)) as DiscoveryFetcher);
  const rejected = rejectsCode(() => pending, 'PROJECT_TIMEOUT', 504);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  t.mock.timers.tick(10_001); await rejected;
  assert.equal(cancelled, true);
});

test('multibyte selected source stays within the profile save budget without splitting a Unicode character', async () => {
  const code = 'export const message = "' + '🧑'.repeat(2_000) + '";';
  const entries = ['a.ts', 'b.ts', 'c.ts'].map(path => entry(path, code));
  const fixture = githubFixture(entries, { [BLOB]: code });
  const snapshot = await analyseProject({ url: REPO, commit: COMMIT, paths: ['a.ts', 'b.ts', 'c.ts'] }, fixture.fetcher);
  assert.ok(new TextEncoder().encode(JSON.stringify(snapshot)).length <= 20_480);
  for (const file of snapshot.files) assert.equal(/[^\uD800-\uDBFF][\uDC00-\uDFFF]$|[\uD800-\uDBFF]$/.test(file.excerpt), false);
});

test('article CDATA may contain a DOCTYPE code example without becoming a feed declaration', async () => {
  const item = RSS_ITEM('Markup example', 'https://github.blog/changelog/markup-example/').replace('</item>', '<content:encoded><![CDATA[<!DOCTYPE html><html><body>Code example</body></html>]]></content:encoded></item>');
  const radar = await readRadar((async (url: RequestInfo | URL) => new Response(String(url) === FEEDS[0] ? RSS(item) : RSS(''))) as DiscoveryFetcher);
  assert.equal(radar.sources[0].error, null);
  assert.equal(radar.sources[0].items[0]?.title, 'Markup example');
});

test('sensitive directories and generated filenames cannot enter the source picker', async () => {
  const fixture = githubFixture([entry('src/main.ts'), entry('src/secrets/service.ts'), entry('credentials/client.ts'), entry('env/settings.ts'), entry('src/generated.ts')]);
  const tree = await projectTree({ url: REPO }, fixture.fetcher);
  assert.deepEqual(tree.files.map(file => file.path), ['src/main.ts']);
});

test('invalid calendar dates and update-only Atom entries cannot acquire a publication date', async () => {
  const impossible = RSS_ITEM('Impossible date', 'https://github.blog/changelog/impossible/', '2026-02-31T12:00:00Z');
  const valid = RSS_ITEM('Valid date', 'https://github.blog/changelog/valid-date/', '2026-02-28T12:00:00Z');
  const atom = '<feed><entry><title>Updated only</title><link href="https://web.dev/blog/updated"/><updated>2026-10-26T00:00:00Z</updated></entry></feed>';
  const result = await readRadar((async (url: RequestInfo | URL) => new Response(String(url) === FEEDS[0] ? RSS(impossible + valid) : String(url) === FEEDS[1] ? atom : RSS(''))) as DiscoveryFetcher);
  assert.deepEqual(result.sources[0].items.map(item => item.title), ['Valid date']);
  assert.deepEqual(result.sources[1].items, []);
  assert.ok(result.sources[1].error);
});

test('project response budget prevents another blob request after large bounded metadata and tree reads', async () => {
  let blobs = 0;
  const fixture = githubFixture(Array.from({ length: 5 }, (_, index) => entry(`src/file-${index}.ts`, 'x')));
  const fetcher = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const value = String(url);
    if (value === API) return Response.json({ full_name: 'student/web-app', private: false, default_branch: 'main', padding: 'x'.repeat(15_000) });
    if (value.includes('/git/commits/')) return Response.json({ sha: COMMIT, tree: { sha: TREE }, padding: 'x'.repeat(11_000) });
    if (value.includes('/git/trees/')) return Response.json({ sha: TREE, tree: Array.from({ length: 5 }, (_, index) => entry(`src/file-${index}.ts`, 'x')), truncated: false, padding: 'x'.repeat(63_000) });
    if (value.includes('/git/blobs/')) { blobs++; return new Response('x'.repeat(12_000)); }
    return fixture.fetcher(url, init);
  }) as DiscoveryFetcher;
  try { await analyseProject({ url: REPO, commit: COMMIT, paths: Array.from({ length: 5 }, (_, index) => `src/file-${index}.ts`) }, fetcher); }
  catch (error) { assert.ok(error instanceof ApiError); }
  assert.ok(blobs <= 3, `Read ${blobs} blobs despite the remaining response budget`);
});
