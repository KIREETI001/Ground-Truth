import type { DiscoveryFetcher, RadarItem, RadarResult, RadarSource } from './types.ts';

// Publisher feed endpoints verified 2026-10-28; only these URLs are fetched.
// https://github.blog/changelog/feed/
// https://web.dev/feed.xml returns301 to the verified same-host /static/blog/feed.xml; pin it, never follow redirects.
// https://web.dev/static/blog/feed.xml
// https://devblogs.microsoft.com/typescript/feed/
const SOURCES = [
  { id: 'github', title: 'GitHub Changelog', url: 'https://github.blog/changelog/', feed: 'https://github.blog/changelog/feed/',
    host: 'github.blog', prefix: '/changelog/', missionId: 'check-the-owner',
    angle: 'Application idea: inspect where your own server checks ownership before returning a record. This general exercise is not a summary of the linked story.' },
  { id: 'webdev', title: 'web.dev', url: 'https://web.dev/blog/', feed: 'https://web.dev/static/blog/feed.xml',
    host: 'web.dev', prefix: '/', missionId: 'async-in-order',
    angle: 'Application idea: trace the order of a request and the UI update in your own app. This general exercise is not a summary of the linked story.' },
  { id: 'typescript', title: 'Microsoft TypeScript Blog', url: 'https://devblogs.microsoft.com/typescript/', feed: 'https://devblogs.microsoft.com/typescript/feed/',
    host: 'devblogs.microsoft.com', prefix: '/typescript/', missionId: 'scan-the-queue',
    angle: 'Application idea: trace one function and explain what its types do and do not guarantee. This general exercise is not a summary of the linked story.' },
] as const;
const MAX_FEED_BYTES = 512 * 1024;
type Source = typeof SOURCES[number];
type FeedEntry = { title: string; link: string; published: string };

function decode(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return named[name.toLowerCase()] ?? entity;
    const number = name.toLowerCase().startsWith('#x') ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);
    return number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff) ? String.fromCodePoint(number) : '';
  });
}
function plain(value: string): string {
  return decode(value).replace(/<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
}
function safeLink(value: string, source: Source): string | null {
  const decoded = decode(value).trim();
  if (decoded.length > 600 || !/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(decoded) || /[\u0000-\u0020\u007f\\]/.test(decoded)) return null;
  try {
    const url = new URL(decoded);
    if (url.protocol !== 'https:' || url.hostname !== source.host || url.username || url.password || url.port || url.hash ||
      !url.pathname.startsWith(source.prefix) || url.pathname.includes('%')) return null;
    // An explicit default port and an empty fragment are normalized away by URL().
    if (decoded.split('/')[2].includes(':') || decoded.includes('#')) return null;
    return url.href;
  } catch { return null; }
}
function publication(value: string, fetchedAt: string): string | null {
  const text = plain(value);
  // Accept publisher ISO-8601 or RSS RFC-822 dates, never relative or invented dates.
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i);
  const rss = text.match(/^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s+(?:[+-]\d{4}|GMT|UTC)$/i);
  if (!iso && !rss) return null;
  const year = Number(iso ? iso[1] : rss![3]);
  const month = iso ? Number(iso[2]) : ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(rss![2].toLowerCase()) + 1;
  const day = Number(iso ? iso[3] : rss![1]);
  const hour = Number(iso ? iso[4] : rss![4]), minute = Number(iso ? iso[5] : rss![5]), second = Number(iso ? iso[6] : rss![6] ?? 0);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59) return null;
  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp) || timestamp < Date.UTC(2000, 0, 1) || timestamp > Date.parse(fetchedAt)) return null;
  return new Date(timestamp).toISOString();
}

// A deliberately small non-expanding XML reader: direct entry metadata only, no DOM, HTML, DTD or URL resolution.
function entries(xml: string): FeedEntry[] {
  const stack: string[] = [];
  const output: FeedEntry[] = [];
  let root = '', ended = false, channel = false, offset = 0;
  let entry: FeedEntry | null = null, entryDepth = 0;
  let capture: { field: keyof FeedEntry; depth: number } | null = null;
  const local = (name: string) => name.split(':').pop()!.toLowerCase();
  const append = (text: string) => { if (entry && capture) entry[capture.field] = (entry[capture.field] + text).slice(0, 4_096); };
  const tokens = /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<[^>]*>|[^<]+/g;
  for (const match of xml.matchAll(tokens)) {
    if (match.index !== offset) throw new Error('The feed XML is malformed.');
    const token = match[0]; offset += token.length;
    if (token.startsWith('<!--') || token.startsWith('<?')) continue;
    if (token.startsWith('<![CDATA[')) { append(token.slice(9, -3)); continue; }
    if (!token.startsWith('<')) {
      if (stack.length === 0 && token.trim()) throw new Error('The feed XML is malformed.');
      append(token); continue;
    }
    if (token.startsWith('</')) {
      const closing = token.match(/^<\/([a-z_][\w:.-]*)\s*>$/i)?.[1];
      if (!closing || stack[stack.length - 1] !== closing) throw new Error('The feed XML is malformed.');
      if (capture?.depth === stack.length) capture = null;
      if (entry && entryDepth === stack.length) { output.push(entry); entry = null; capture = null; }
      stack.pop(); if (!stack.length) ended = true;
      continue;
    }
    if (token.startsWith('<!')) throw new Error('Feed declarations are not supported.');
    const opened = token.match(/^<([a-z_][\w:.-]*)([\s\S]*?)\/?\s*>$/i);
    if (!opened || ended || stack.length > 32) throw new Error('The feed XML is malformed or too deeply nested.');
    const name = opened[1], tag = local(name), selfClosing = /\/\s*>$/.test(token);
    if (!stack.length) {
      root = tag;
      if (!['rss', 'feed'].includes(root)) throw new Error('The source did not return an RSS or Atom feed.');
    }
    stack.push(name);
    if (root === 'rss' && tag === 'channel' && stack.length === 2) channel = true;
    if ((root === 'rss' && channel && tag === 'item' && stack.length === 3) || (root === 'feed' && tag === 'entry' && stack.length === 2)) {
      entry = { title: '', link: '', published: '' }; entryDepth = stack.length;
    } else if (entry && stack.length === entryDepth + 1) {
      if (tag === 'title') capture = { field: 'title', depth: stack.length };
      if (['pubdate', 'published', 'date'].includes(tag)) capture = { field: 'published', depth: stack.length };
      if (tag === 'link') {
        const attrs: Record<string, string> = {};
        for (const attribute of opened[2].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[attribute[1].toLowerCase()] = attribute[2] ?? attribute[3];
        if (attrs.href && (!attrs.rel || attrs.rel === 'alternate')) entry.link = attrs.href.slice(0, 4_096);
        else if (!attrs.href) capture = { field: 'link', depth: stack.length };
      }
    }
    if (selfClosing) {
      if (capture?.depth === stack.length) capture = null;
      if (entry && entryDepth === stack.length) { output.push(entry); entry = null; }
      stack.pop(); if (!stack.length) ended = true;
    }
  }
  if (offset !== xml.length || !root || !ended || stack.length || root === 'rss' && !channel) throw new Error('The feed XML is incomplete.');
  return output;
}

async function feedText(source: Source, fetcher: DiscoveryFetcher): Promise<string> {
  const controller = new AbortController();
  let rejectDeadline!: (error: Error) => void;
  const deadline = new Promise<never>((_resolve, reject) => { rejectDeadline = reject; });
  const timer = setTimeout(() => { controller.abort(); rejectDeadline(new Error('Source timed out. Try Refresh later.')); }, 10_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await Promise.race([fetcher(source.feed, { method: 'GET', redirect: 'manual', credentials: 'omit', signal: controller.signal,
      headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml', 'User-Agent': 'GroundTruth-Official-Feeds' } }), deadline]);
    if (response.redirected || response.status >= 300 && response.status < 400) throw new Error('Source redirected; the fixed feed could not be read.');
    if (!response.ok) throw new Error(`Source unavailable (HTTP ${response.status}). Try Refresh later.`);
    if (Number(response.headers.get('content-length') ?? 0) > MAX_FEED_BYTES) throw new Error('Source exceeds the 512 KiB feed limit. Open the publisher directly.');
    reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      length += value.byteLength;
      if (length > MAX_FEED_BYTES) throw new Error('Source exceeds the 512 KiB feed limit. Open the publisher directly.');
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch (error) {
    if (reader) void reader.cancel().catch(() => {});
    if (controller.signal.aborted) throw new Error('Source timed out. Try Refresh later.');
    throw error;
  } finally { clearTimeout(timer); }
}
async function readSource(source: Source, fetchedAt: string, fetcher: DiscoveryFetcher): Promise<RadarSource> {
  const result: RadarSource = { id: source.id, title: source.title, url: source.url, items: [], error: null };
  try {
    const raw = entries(await feedText(source, fetcher));
    const seen = new Set<string>();
    for (const entry of raw) {
      const title = plain(entry.title).slice(0, 200);
      const url = safeLink(entry.link, source), publishedAt = publication(entry.published, fetchedAt);
      if (!title || !url || !publishedAt || seen.has(url)) continue;
      seen.add(url);
      const item: RadarItem = { id: `${source.id}:${url}`, title, url, publishedAt, learningAngle: source.angle, missionId: source.missionId };
      result.items.push(item);
    }
    result.items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    result.items = result.items.slice(0, 8);
    if (raw.length && !result.items.length) result.error = 'The feed contained no usable headlines with a publisher link and publication date.';
  } catch (error) {
    result.error = error instanceof Error && !/fetch|network|invalid utf|internal error|typeerror/i.test(error.message) ? error.message.slice(0, 200) : 'Source could not be read. Try Refresh or open the publisher directly.';
  }
  return result;
}

export async function readRadar(fetcher: DiscoveryFetcher = fetch): Promise<RadarResult> {
  const fetchedAt = new Date().toISOString();
  return { fetchedAt, sources: await Promise.all(SOURCES.map(source => readSource(source, fetchedAt, fetcher))) };
}
