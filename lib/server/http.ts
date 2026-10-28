export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message = code) { super(message); this.status = status; this.code = code; }
}

export function json(value: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}

export async function readMutation(request: Request): Promise<Record<string, unknown>> {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new ApiError(403, 'ORIGIN_REQUIRED');
  }
  if (request.method === 'DELETE') {
    if (request.body !== null) throw new ApiError(400, 'UNEXPECTED_BODY');
    return {};
  }
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')) throw new ApiError(415, 'JSON_REQUIRED');
  if (Number(request.headers.get('content-length') ?? 0) > 32_768) throw new ApiError(413, 'BODY_TOO_LARGE');
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 32_768) { await reader.cancel(); throw new ApiError(413, 'BODY_TOO_LARGE'); }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new ApiError(400, 'INVALID_JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'INVALID_BODY');
  return value as Record<string, unknown>;
}

export function fields(body: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new ApiError(400, 'UNKNOWN_FIELD');
}

export function string(value: unknown, name: string, min = 1, max = 2_000): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new ApiError(400, 'INVALID_FIELD', `Invalid ${name}.`);
  return value.trim();
}

export function requestId(body: Record<string, unknown>): string {
  const value = string(body.requestId, 'requestId', 1, 120);
  if (!/^[a-zA-Z0-9._:-]+$/.test(value)) throw new ApiError(400, 'INVALID_REQUEST_ID');
  return value;
}
