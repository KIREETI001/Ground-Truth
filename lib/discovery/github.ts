import type { ProjectSnapshot, SkillId } from '../learner/types.ts';
import { ApiError } from '../server/http.ts';
import type { DiscoveryFetcher, ProjectTree } from './types.ts';

const API = 'https://api.github.com';
const MAX_NETWORK_BYTES = 128 * 1024;
const MAX_FILE_BYTES = 12 * 1024;
const MAX_SELECTED_BYTES = 32 * 1024;
const MAX_FILES = 200;
const SHA = /^[a-f0-9]{40}$/i;
const LANGUAGES: Record<string, string> = {
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  ts: 'TypeScript', tsx: 'TypeScript', sql: 'SQL', py: 'Python', java: 'Java',
  c: 'C', h: 'C', cc: 'C++', cpp: 'C++', hpp: 'C++', cs: 'C#',
  html: 'HTML', css: 'CSS', vue: 'Vue', svelte: 'Svelte',
};
const EXCLUDED_DIRS = new Set(['node_modules', 'vendor', 'generated', '__generated__', 'build', 'dist', 'out',
  'coverage', 'target', 'bin', 'obj', 'venv', '__pycache__', 'bower_components', 'secrets', 'credentials', 'keys', 'private-keys', 'env', 'envs']);
const CAVEAT = 'Found in project · understanding not checked. Text patterns can occur in comments or strings; this is not a security review or authorship assessment.';
type Repository = { repository: string; url: string; apiPath: string };
type SourceFile = ProjectTree['files'][number] & { sha: string };
type PinnedTree = { files: SourceFile[]; truncated: boolean; warnings: string[] };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(502, 'PROJECT_RESPONSE_INVALID');
  return value as Record<string, unknown>;
}
function repository(value: unknown): Repository {
  // Match the original spelling too: URL() normalizes explicit :443, dot segments and empty ?/#.
  if (typeof value !== 'string') throw new ApiError(400, 'PROJECT_URL_INVALID');
  const match = value.match(/^https:\/\/github\.com\/([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)\/([a-z0-9][a-z0-9_.-]{0,99})\/?$/i);
  if (!match) throw new ApiError(400, 'PROJECT_URL_INVALID', 'Use one public HTTPS github.com/owner/repository URL without extra URL components.');
  const name = `${match[1]}/${match[2]}`;
  return { repository: name, url: `https://github.com/${name}`, apiPath: `/repos/${match[1]}/${match[2]}` };
}
function language(path: unknown): string | null {
  if (typeof path !== 'string' || path.length > 200 || !/^[a-z0-9_ .@()+[\]/-]+$/i.test(path)) return null;
  const parts = path.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.startsWith('.') || EXCLUDED_DIRS.has(part.toLowerCase()))) return null;
  const name = parts[parts.length - 1].toLowerCase();
  if (/(?:secret|credential|password|private[-_]?key|api[-_]?key|access[-_]?token)/.test(name) ||
    /(?:^|[._-])env(?:[._-]|$)|\.min\.|(?:^|[._-])generated(?:[._-]|$)|\.g\.cs$|(?:^|[._-])lock(?:[._-]|$)/.test(name)) return null;
  return LANGUAGES[name.split('.').pop() ?? ''] ?? null;
}
function paths(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5 || new Set(value).size !== value.length ||
    !value.every(path => typeof path === 'string' && language(path))) {
    throw new ApiError(400, 'PROJECT_PATHS_INVALID', 'Choose one to five different supported source files; secret, generated and dependency files are excluded.');
  }
  return value as string[];
}

// API contracts verified against official docs (2026-10-28):
// https://docs.github.com/en/rest/git/refs#get-a-reference
// https://docs.github.com/en/rest/git/commits#get-a-commit
// https://docs.github.com/en/rest/git/trees#get-a-tree
// https://docs.github.com/en/rest/git/blobs#get-a-blob
// These public reads deliberately use no GitHub account, token, download_url or response-provided URL.
function reader(fetcher: DiscoveryFetcher) {
  const controller = new AbortController();
  let rejectDeadline!: (error: ApiError) => void;
  const deadline = new Promise<never>((_resolve, reject) => { rejectDeadline = reject; });
  const timer = setTimeout(() => {
    controller.abort();
    rejectDeadline(new ApiError(504, 'PROJECT_TIMEOUT', 'GitHub took too long. Try a smaller project or retry later.'));
  }, 10_000);
  let total = 0;
  async function read(path: string, maximum: number, raw = false): Promise<string> {
    let body: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      if (total + maximum > MAX_NETWORK_BYTES) throw new ApiError(502, 'PROJECT_RESPONSE_TOO_LARGE', 'The remaining public-read budget is too small for another file. Choose fewer files.');
      const response = await Promise.race([fetcher(`${API}${path}`, {
        method: 'GET', redirect: 'manual', credentials: 'omit', signal: controller.signal,
        headers: { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'GroundTruth-Public-Learning' },
      }), deadline]);
      if (response.status >= 300 && response.status < 400 || response.redirected) throw new ApiError(502, 'PROJECT_REDIRECT_REFUSED', 'GitHub redirected this repository. Use its current public URL.');
      if (response.status === 403 || response.status === 429) throw new ApiError(503, 'PROJECT_RATE_LIMITED', 'Public GitHub reads are rate limited. Try again later.');
      if (response.status === 404) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'The public repository or pinned file is unavailable. Check the URL or inspect the project again.');
      if (!response.ok) throw new ApiError(502, 'PROJECT_UNAVAILABLE', 'GitHub is unavailable. Try again later.');
      const declared = Number(response.headers.get('content-length') ?? 0);
      if (declared > maximum || declared + total > MAX_NETWORK_BYTES) throw new ApiError(502, 'PROJECT_RESPONSE_TOO_LARGE', 'This repository exceeds the public-read size limit. Try a smaller project.');
      body = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      if (body) while (true) {
        const { done, value } = await Promise.race([body.read(), deadline]);
        if (done) break;
        length += value.byteLength; total += value.byteLength;
        if (length > maximum || total > MAX_NETWORK_BYTES) throw new ApiError(502, 'PROJECT_RESPONSE_TOO_LARGE', 'This repository exceeds the public-read size limit. Try fewer or smaller files.');
        chunks.push(value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new ApiError(502, 'PROJECT_RESPONSE_INVALID', 'GitHub returned unsupported text.'); }
    } catch (error) {
      if (body) void body.cancel().catch(() => {});
      if (controller.signal.aborted) throw new ApiError(504, 'PROJECT_TIMEOUT', 'GitHub took too long. Try again later.');
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'PROJECT_UNAVAILABLE', 'GitHub could not be reached. Try again later, or open the public repository directly.');
    }
  }
  return {
    read,
    async json(path: string, maximum: number): Promise<Record<string, unknown>> {
      const text = await read(path, maximum);
      try { return object(JSON.parse(text)); }
      catch { throw new ApiError(502, 'PROJECT_RESPONSE_INVALID', 'GitHub returned an unsupported response.'); }
    },
    close() { clearTimeout(timer); },
  };
}

async function publicRepository(repo: Repository, network: ReturnType<typeof reader>): Promise<Record<string, unknown>> {
  const metadata = await network.json(repo.apiPath, 16 * 1024);
  if (metadata.private !== false) throw new ApiError(400, 'PROJECT_PUBLIC_REQUIRED', 'Only public repositories can be inspected.');
  if (typeof metadata.full_name !== 'string' || metadata.full_name.toLowerCase() !== repo.repository.toLowerCase()) throw new ApiError(502, 'PROJECT_RESPONSE_INVALID');
  return metadata;
}
async function pinnedTree(repo: Repository, commit: string, network: ReturnType<typeof reader>): Promise<PinnedTree> {
  const revision = await network.json(`${repo.apiPath}/git/commits/${commit}`, 12 * 1024);
  if (revision.sha !== commit) throw new ApiError(502, 'PROJECT_RESPONSE_INVALID');
  const root = object(revision.tree);
  if (typeof root.sha !== 'string' || !SHA.test(root.sha)) throw new ApiError(502, 'PROJECT_RESPONSE_INVALID');
  const result = await network.json(`${repo.apiPath}/git/trees/${root.sha}?recursive=1`, 64 * 1024);
  if (result.sha !== root.sha || !Array.isArray(result.tree) || typeof result.truncated !== 'boolean') throw new ApiError(502, 'PROJECT_RESPONSE_INVALID');
  const files: SourceFile[] = [];
  const found = new Set<string>();
  for (const raw of result.tree) {
    const file = object(raw);
    if (file.type !== 'blob' || !['100644', '100755'].includes(file.mode as string)) continue;
    const supported = language(file.path);
    if (!supported || typeof file.path !== 'string' || !Number.isInteger(file.size) || Number(file.size) < 1 || Number(file.size) > MAX_FILE_BYTES || typeof file.sha !== 'string' || !SHA.test(file.sha)) continue;
    if (found.has(file.path)) throw new ApiError(502, 'PROJECT_RESPONSE_INVALID');
    found.add(file.path);
    files.push({ path: file.path, language: supported, size: Number(file.size), sha: file.sha });
  }
  const truncated = result.truncated || files.length > MAX_FILES;
  return { files: files.slice(0, MAX_FILES), truncated, warnings: [
    'Only supported source files up to 12 KiB are listed; secret, hidden, generated, dependency, binary and lock files are excluded.',
    ...(truncated ? ['The file listing is truncated and may omit source files. Choose only from this partial listing or use a smaller repository.'] : []),
    ...(files.length === 0 ? ['No supported nonempty source files were found within the public-read limits.'] : []),
  ] };
}

export async function projectTree(input: { url: unknown }, fetcher: DiscoveryFetcher = fetch): Promise<ProjectTree> {
  const repo = repository(input.url);
  const network = reader(fetcher);
  try {
    const metadata = await publicRepository(repo, network);
    if (typeof metadata.default_branch !== 'string' || !metadata.default_branch || metadata.default_branch.length > 200 || /[\u0000-\u001f\u007f]/.test(metadata.default_branch)) throw new ApiError(502, 'PROJECT_RESPONSE_INVALID');
    const reference = await network.json(`${repo.apiPath}/git/ref/heads/${encodeURIComponent(metadata.default_branch)}`, 4 * 1024);
    const head = object(reference.object);
    if (head.type !== 'commit' || typeof head.sha !== 'string' || !SHA.test(head.sha)) throw new ApiError(502, 'PROJECT_RESPONSE_INVALID');
    const commit = head.sha.toLowerCase();
    const tree = await pinnedTree(repo, commit, network);
    return { repository: repo.repository, url: repo.url, commit, files: tree.files.map(({ path, language, size }) => ({ path, language, size })), truncated: tree.truncated, warnings: tree.warnings };
  } finally { network.close(); }
}

function excerpt(text: string, maximum = 1500): string {
  const cut = text.slice(0, maximum);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}
function credentialLike(text: string): boolean {
  return /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,}|AKIA[A-Z0-9]{16}|sk-[a-z0-9_-]{20,})\b/i.test(text) ||
    /\b(?:api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*["'][^"'\r\n]{16,}["']/i.test(text);
}
function textSignals(path: string, source: string, language: string): ProjectSnapshot['signals'] {
  const signals: ProjectSnapshot['signals'] = [{ skillId: 'code-reading', path, note: `${language} source text is available to trace. Understanding has not been checked.` }];
  const add = (skillId: SkillId, note: string) => signals.push({ skillId, path, note });
  if (/\b(?:async|await|Promise)\b|\bfetch\s*\(/.test(source)) add('async', 'Async or request-related text appears. Trace which work completes before a later statement.');
  if (/\b(?:Map|Set)\s*\(|\bfor\s*\(|\.(?:map|filter|reduce|sort)\s*\(/.test(source)) add('collections', 'Collection or iteration text appears. Check the operation and its boundary cases.');
  if (/\bselect\b[\s\S]*\bfrom\b/i.test(source)) add('sql', 'SELECT and FROM text appears. Practice tracing rows and filters; query correctness has not been checked.');
  if (/\b(?:test|it|describe)\s*\(|\bassert(?:\.|\()/.test(source)) add('testing', 'Test or assertion text appears. Inspect which behavior it checks; passing tests were not verified.');
  if (/\b(?:owner_?id|user_?id|authorize|authorization|authenticated)\b/i.test(source)) add('access', 'Identity or ownership-related text appears. Review where the server enforces ownership; no security verdict is provided.');
  return signals;
}
function suggestedMission(signals: ProjectSnapshot['signals'], text: string): string {
  if (signals.some(signal => signal.skillId === 'access')) return 'check-the-owner';
  if (signals.some(signal => signal.skillId === 'sql')) return 'query-the-data';
  if (signals.some(signal => signal.skillId === 'async')) return 'async-in-order';
  if (/\.sort\s*\(/.test(text)) return 'move-the-marker';
  if (/\bMap\s*\(/.test(text)) return 'find-the-receipt';
  return 'scan-the-queue';
}

export async function analyseProject(input: { url: unknown; commit: unknown; paths: unknown }, fetcher: DiscoveryFetcher = fetch): Promise<ProjectSnapshot> {
  const repo = repository(input.url);
  if (typeof input.commit !== 'string' || !SHA.test(input.commit)) throw new ApiError(400, 'PROJECT_COMMIT_INVALID', 'Inspect the repository first, then use its full pinned commit SHA.');
  const commit = input.commit.toLowerCase();
  const selectedPaths = paths(input.paths);
  const network = reader(fetcher);
  try {
    await publicRepository(repo, network);
    const tree = await pinnedTree(repo, commit, network);
    const chosen = selectedPaths.map(path => {
      const file = tree.files.find(item => item.path === path);
      if (!file) throw new ApiError(400, 'PROJECT_PATH_NOT_IN_TREE', 'A selected file is not in the pinned supported file listing. Inspect the repository again.');
      return file;
    });
    if (chosen.reduce((total, file) => total + file.size, 0) > MAX_SELECTED_BYTES) throw new ApiError(400, 'PROJECT_SELECTION_TOO_LARGE', 'Choose files totalling at most 32 KiB.');
    const snapshot: ProjectSnapshot = { repository: repo.repository, url: repo.url, commit, analysedAt: new Date().toISOString(), files: [], signals: [], suggestedMissionId: null, warnings: [CAVEAT] };
    if (tree.truncated) snapshot.warnings.push('The pinned file listing was partial. These signals cover only the selected readable files.');
    let sourceText = '';
    for (const file of chosen) {
      try {
        const source = await network.read(`${repo.apiPath}/git/blobs/${file.sha}`, MAX_FILE_BYTES, true);
        if (!source.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source) || credentialLike(source)) {
          snapshot.warnings.push(`${excerpt(file.path, 130)}: skipped unsupported, empty or potentially sensitive text.`);
          continue;
        }
        snapshot.files.push({ path: file.path, language: file.language, excerpt: excerpt(source) });
        snapshot.signals.push(...textSignals(file.path, source, file.language));
        sourceText += `\n${source}`;
        if (source.length > 1500) snapshot.warnings.push(`${excerpt(file.path, 130)}: excerpt shortened to 1,500 characters; signals inspect the bounded selected file.`);
      } catch (error) {
        if (error instanceof ApiError && (error.code === 'PROJECT_TIMEOUT' || error.code === 'PROJECT_RATE_LIMITED')) throw error;
        snapshot.warnings.push(`${excerpt(file.path, 130)}: unavailable or exceeds the read limit; no signals were recorded for this file.`);
      }
    }
    if (!snapshot.files.length) throw new ApiError(422, 'PROJECT_NO_READABLE_FILES', 'No selected files could be read safely within the limits. Choose smaller source files without sensitive text and try again.');
    snapshot.signals = snapshot.signals.slice(0, 20);
    snapshot.suggestedMissionId = suggestedMission(snapshot.signals, sourceText);
    snapshot.warnings = snapshot.warnings.slice(0, 10).map(warning => warning.slice(0, 200));
    // Keep multibyte public excerpts inside the explicit account-save payload budget too.
    while (new TextEncoder().encode(JSON.stringify(snapshot)).byteLength > 20 * 1024) {
      const longest = snapshot.files.reduce((a, b) => a.excerpt.length >= b.excerpt.length ? a : b);
      longest.excerpt = excerpt(longest.excerpt, Math.max(0, longest.excerpt.length - 100));
    }
    return snapshot;
  } finally { network.close(); }
}
