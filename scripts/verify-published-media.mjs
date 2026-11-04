/** Public, read-only HTTP verification of the reviewed media release.
 *
 * Only GET requests are sent, without credentials or cookies. Downloads are
 * bounded in memory and never saved as replacement media. The only writes are
 * the non-overwriting previous-report archive and the local JSON report.
 *
 * node scripts/verify-published-media.mjs --commit <SHA> --deployment <ID>
 * Optional: --base https://host --revision <id> --output submission/report.json
 */
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = resolve(root, 'submission/video-publication-verification.json');
const archivePath = resolve(root, 'submission/video-v2/previous-release-verification.json');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const options = { base: 'https://groundtruth-meta.vercel.app', commit: null, deployment: null, output: reportPath };
for (let at = 2; at < process.argv.length; at += 2) {
  const flag = process.argv[at];
  if (!['--base', '--revision', '--commit', '--deployment', '--output'].includes(flag) || !process.argv[at + 1]) {
    throw new Error('Use only --base, --revision, --commit, --deployment or --output followed by a value.');
  }
  options[flag.slice(2)] = process.argv[at + 1];
}
const base = new URL(options.base);
if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !['', '/'].includes(base.pathname)) {
  throw new Error('The public base must be a plain HTTPS origin with no credentials.');
}
const output = resolve(root, options.output);
const withinSubmission = relative(resolve(root, 'submission'), output);
if (!withinSubmission || isAbsolute(withinSubmission) || withinSubmission === '..' || withinSubmission.startsWith('..' + sep) || resolve(output).toLowerCase() === archivePath.toLowerCase() || !output.endsWith('.json')) {
  throw new Error('Write verification reports only to a JSON file inside submission/, excluding the archive.');
}
if (!/^[a-f0-9]{40}$/.test(options.commit) || !/^dpl_[A-Za-z0-9]+$/.test(options.deployment)) {
  throw new Error('Supply a full source commit and deployment ID as operator-provided release metadata.');
}

// Preserve the previous tracked release report before any replacement. Never
// overwrite another V2 record or an existing archive on repeated runs.
let archiveAction = 'existing_archive_preserved';
if (!existsSync(archivePath)) {
  if (!existsSync(reportPath)) throw new Error('Previous report is absent; archive it explicitly before first use.');
  copyFileSync(reportPath, archivePath, constants.COPYFILE_EXCL);
  archiveAction = 'previous_report_archived_without_overwrite';
}

const localRender = JSON.parse(readFileSync(resolve(root, 'submission/video-v3/render-report.json'), 'utf8'));
const localValidation = JSON.parse(readFileSync(resolve(root, 'submission/video-v3/media-validation.json'), 'utf8'));
const local = {
  video: readFileSync(resolve(root, 'public/groundtruth-demo.mp4')),
  captions: readFileSync(resolve(root, 'public/groundtruth-demo.vtt')),
  poster: readFileSync(resolve(root, 'public/demo-poster.png')),
};
const expected = { videoSha256: localRender.sha256, videoBytes: localRender.bytes,
  captionsSha256: digest(local.captions), posterSha256: digest(local.poster),
  durationSeconds: localValidation.durationSeconds, captionCues: localValidation.captionCues || 64 };
const revision = options.revision || expected.videoSha256.slice(0, 8);
if (!/^[a-zA-Z0-9._-]{1,40}$/.test(revision)) throw new Error('Invalid public media revision.');
if (digest(local.video) !== expected.videoSha256 || local.video.length !== expected.videoBytes || !localValidation.decodePassed) {
  throw new Error('The local public video does not match the decoded, reviewed V3 render.');
}
if (!local.poster.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) throw new Error('The local public poster must be PNG.');
const posterDimensions = [local.poster.readUInt32BE(16), local.poster.readUInt32BE(20)];
const startedAt = new Date().toISOString();

async function get(path, { limit = 1_048_576, headers = {} } = {}) {
  let url = new URL(path, base), redirects = 0;
  const chain = [];
  while (true) {
    if (url.origin !== base.origin) throw new Error('A public check attempted to leave the configured origin.');
    const response = await fetch(url, { method: 'GET', redirect: 'manual', credentials: 'omit',
      headers: { Accept: '*/*', 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache', ...headers },
      signal: AbortSignal.timeout(30_000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      if (++redirects > 5 || !response.headers.get('location')) throw new Error('Unexpected public redirect chain.');
      chain.push({ status: response.status, from: url.href });
      url = new URL(response.headers.get('location'), url);
      continue;
    }
    const advertised = Number(response.headers.get('content-length'));
    if (Number.isFinite(advertised) && advertised > limit) {
      await response.body?.cancel();
      throw new Error('Public response exceeds its explicit byte budget.');
    }
    const chunks = [];
    let bytes = 0;
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > limit) { await reader.cancel(); throw new Error('Public response exceeds its explicit byte budget.'); }
        chunks.push(Buffer.from(value));
      }
    }
    return { url: url.href, status: response.status, type: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'), contentRange: response.headers.get('content-range'),
      redirects: chain, bytes: Buffer.concat(chunks) };
  }
}

function attribute(tag, name) {
  const pattern = new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i');
  const match = pattern.exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3]).replaceAll('&amp;', '&') : null;
}

function captions(bytes) {
  const text = bytes.toString('utf8').replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  if (!text.startsWith('WEBVTT')) throw new Error('Caption file is not WebVTT.');
  const time = value => {
    const match = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/.exec(value);
    if (!match || Number(match[2]) >= 60 || Number(match[3]) >= 60) throw new Error('Invalid WebVTT timestamp.');
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
  };
  const cues = [];
  for (const block of text.split(/\n\s*\n/)) {
    if (!block.includes('-->')) continue;
    const lines = block.split('\n');
    const timing = lines.findIndex(line => line.includes('-->'));
    const match = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/.exec(lines[timing]);
    if (!match || !lines.slice(timing + 1).some(line => line.trim())) throw new Error('Malformed or empty WebVTT cue.');
    const start = time(match[1]), end = time(match[2]);
    if (!(start >= 0 && start < end && end < expected.durationSeconds)) throw new Error('Caption cue is outside the reviewed duration.');
    if (cues.length && start < cues.at(-1).end) throw new Error('Caption cues overlap or run out of order.');
    cues.push({ start, end });
  }
  if (cues.length !== expected.captionCues) throw new Error('Caption cue count differs from the reviewed track.');
  return { count: cues.length, firstStart: cues[0].start, lastEnd: cues.at(-1).end,
    ordered: true, nonOverlapping: true, allBoundsInsideDuration: true };
}

const media = { video: '/groundtruth-demo.mp4?v=' + revision,
  captions: '/groundtruth-demo.vtt?v=' + revision, poster: '/demo-poster.png?v=' + revision };
const jobs = {
  canonical: () => get('/'), login: () => get('/login'), health: () => get('/api/health'),
  demo: () => get('/demo'), pitch: () => get('/pitch.html'),
  video: () => get(media.video, { limit: expected.videoBytes + 1024 }),
  range: () => get(media.video, { limit: 2048, headers: { Range: 'bytes=0-1023' } }),
  captions: () => get(media.captions), poster: () => get(media.poster, { limit: 2_097_152 }),
};
const entries = Object.entries(jobs);
const settled = await Promise.allSettled(entries.map(([, job]) => job()));
const results = {}, errors = [];
for (let at = 0; at < entries.length; at++) {
  const name = entries[at][0], outcome = settled[at];
  if (outcome.status === 'fulfilled') results[name] = outcome.value;
  else errors.push({ check: name, message: outcome.reason instanceof Error ? outcome.reason.message : 'Public HTTP request failed.' });
}
const check = (condition, name, message) => { if (!condition) errors.push({ check: name, message }); return !!condition; };
const checks = {};
for (const name of ['canonical', 'login', 'health', 'demo', 'pitch']) {
  const response = results[name];
  checks[name] = response ? { url: response.url, status: response.status, contentType: response.type,
    redirects: response.redirects, ok: check(response.status === 200, name, 'Expected HTTP 200.') } : { ok: false };
  if (response && name !== 'health') check(/^text\/html(?:;|$)/i.test(response.type || ''), name, 'Expected an HTML page.');
}
if (results.health) {
  try {
    const value = JSON.parse(results.health.bytes.toString('utf8'));
    checks.health.database = value.database === 'connected' ? 'connected' : 'not-confirmed';
    checks.health.inference = value.inference === 'meta-configured' ? 'meta-configured' : 'not-confirmed';
    checks.health.model = value.model === 'muse-spark-1.3' ? value.model : 'not-confirmed';
    check(value.status === 'ok' && value.database === 'connected', 'health', 'Database health did not report connected.');
  } catch { errors.push({ check: 'health', message: 'Health did not return valid expected JSON.' }); }
}
if (results.demo) {
  const html = results.demo.bytes.toString('utf8');
  const player = /<video\b[^>]*>[\s\S]*?<\/video>/i.exec(html)?.[0];
  if (!player) errors.push({ check: 'player', message: 'No rendered video player found.' });
  else {
    const source = /<source\b[^>]*>/i.exec(player)?.[0];
    const tracks = (player.match(/<track\b[^>]*>/gi) || []).filter(tag => attribute(tag, 'kind') === 'captions');
    const defaultTracks = tracks.filter(tag => /\sdefault(?:\s|=|\/?\>)/i.test(tag));
    const sourceUrl = source && attribute(source, 'src');
    const trackUrl = tracks.length === 1 && attribute(tracks[0], 'src');
    const posterUrl = attribute(/^<video\b[^>]*>/i.exec(player)?.[0] || '', 'poster');
    checks.player = { revision, source: sourceUrl, captions: trackUrl || null, poster: posterUrl,
      captionTracks: tracks.length, defaultCaptionTracks: defaultTracks.length,
      burnedInCaptions: 'Previously verified local encoded artifact; exact public video hash checked here.',
      duplicateDefaultCaptions: defaultTracks.length > 0 };
    for (const [label, path] of [['video', sourceUrl], ['captions', trackUrl], ['poster', posterUrl]]) {
      let matches = false;
      try { matches = new URL(path, base).href === new URL(media[label], base).href; } catch { /* Fail below. */ }
      check(matches, 'player', 'Rendered ' + label + ' URL does not match the reviewed revision.');
    }
    check(tracks.length === 1 && defaultTracks.length === 0, 'player', 'Use exactly one optional caption track; default sidecars duplicate burned-in captions.');
  }
}
if (results.video) {
  const response = results.video, hash = digest(response.bytes);
  checks.video = { url: response.url, status: response.status, contentType: response.type,
    bytes: response.bytes.length, sha256: hash,
    matchesReviewedCandidate: check(response.status === 200 && /^video\/mp4(?:;|$)/i.test(response.type || '') &&
      response.bytes.length === expected.videoBytes && hash === expected.videoSha256, 'video', 'Public MP4 status, MIME, size or hash differs from the reviewed local artifact.') };
}
if (results.range) {
  const response = results.range;
  checks.range = { url: response.url, status: response.status, contentRange: response.contentRange,
    bytes: response.bytes.length, matchesFirst1024Bytes: response.bytes.equals(local.video.subarray(0, 1024)) };
  check(response.status === 206 && response.contentRange === 'bytes 0-1023/' + expected.videoBytes && response.bytes.length === 1024 && checks.range.matchesFirst1024Bytes,
    'range', 'Byte-range response did not return the exact reviewed first 1024 bytes.');
}
if (results.captions) {
  const response = results.captions;
  checks.captions = { url: response.url, status: response.status, contentType: response.type,
    bytes: response.bytes.length, sha256: digest(response.bytes), matchesLocalBytes: response.bytes.equals(local.captions) };
  check(response.status === 200 && /^text\/vtt(?:;|$)/i.test(response.type || '') && checks.captions.matchesLocalBytes, 'captions', 'Public caption MIME/status/raw bytes differ from local.');
  try { checks.captions.cues = captions(response.bytes); } catch (error) { errors.push({ check: 'captions', message: error.message }); }
}
if (results.poster) {
  const response = results.poster;
  checks.poster = { url: response.url, status: response.status, contentType: response.type,
    bytes: response.bytes.length, sha256: digest(response.bytes), dimensions: posterDimensions,
    matchesLocalBytes: response.bytes.equals(local.poster) };
  check(response.status === 200 && /^image\/png(?:;|$)/i.test(response.type || '') && checks.poster.matchesLocalBytes, 'poster', 'Public poster MIME/status/raw bytes differ from local.');
}
const report = { schemaVersion: 'groundtruth-public-media-verification.v3',
  startedAt, observedAt: new Date().toISOString(), scope: 'Public read-only GET checks; no account session or portal access.',
  baseUrl: base.origin, release: { deployedCommit: options.commit, deploymentId: options.deployment,
    metadataSource: 'Release operator supplied commit/deployment IDs; these HTTP checks do not independently attest source identity.' },
  expected: { ...expected, revision }, checks, passed: errors.length === 0, errors,
  previousReleaseArchive: { path: relative(root, archivePath).split(sep).join('/'), action: archiveAction,
    sha256: digest(readFileSync(archivePath)), existingV2RecordsOverwritten: false },
  localEncodingEvidence: { path: 'submission/video-v3/media-validation.json', durationSeconds: localValidation.durationSeconds,
    dimensions: localValidation.dimensions, fps: localValidation.fps, decodePassed: localValidation.decodePassed,
    note: 'Already measured locally; no re-encoding or new decode is performed by this script.' },
  browserVerification: { status: 'not_performed_by_this_script', note: 'The release operator separately observes browser playback and seeking.' },
  listening_review: 'not_performed', officialSubmissionStatus: 'not_checked',
  actions: { httpMethods: ['GET'], credentialsSent: false, cookiesSent: false, mediaReencoded: false,
    publicMediaChanged: false, officialPortalAccessed: false } };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ report: relative(root, output).split(sep).join('/'), passed: report.passed,
  videoStatus: checks.video?.status, videoBytes: checks.video?.bytes, videoSha256: checks.video?.sha256,
  rangeStatus: checks.range?.status, captionCues: checks.captions?.cues?.count,
  captionsSha256: checks.captions?.sha256, posterSha256: checks.poster?.sha256,
  defaultCaptionTracks: checks.player?.defaultCaptionTracks, errors }, null, 2));
process.exitCode = report.passed ? 0 : 1;
