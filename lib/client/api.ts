export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) { super(message); this.name = "ApiError"; this.status = status; this.code = code; }
}

const messages: Record<string, string> = {
  unauthorized: "Your sign-in has expired. Sign in again to continue.",
  forbidden: "This account does not have access to that record.",
  not_enrolled: "Enter your moderator’s pilot code to open the lab.",
  pilot_closed: "Pilot enrollment is currently closed. Your moderator can help you get access.",
  rate_limited: "A few too many requests arrived together. Please try again shortly.",
  session_expired: "This activity’s availability window has ended.",
  run_expired: "This run has expired. Its available records have been retained, but it cannot be shown as a completed experiment.",
  revision_conflict: "Your saved activity changed in another tab. Refresh the activity before continuing.",
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } }); }
  catch { throw new Error("The connection was interrupted. Your saved work is retained. Try again when you’re connected."); }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" ? body.error : null;
    const code = detail && "code" in detail && typeof detail.code === "string" ? detail.code : "request_failed";
    const description = detail && "message" in detail && typeof detail.message === "string" ? detail.message : null;
    throw new ApiError(response.status, code, description ?? messages[code.toLowerCase()] ?? `The request could not be completed (${response.status}; ${String(code).replaceAll("_", " ")}). Your saved records have not been replaced.`);
  }
  return body as T;
}

export const post = <T,>(path: string, body: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(body) });

export function requestId(key: string, stableId?: string): string {
  const storageKey = `gt:request:${key}`;
  try { const existing = sessionStorage.getItem(storageKey); if (existing) return existing; const id = stableId ?? crypto.randomUUID(); sessionStorage.setItem(storageKey, id); return id; }
  catch { return stableId ?? crypto.randomUUID(); }
}

export function finishRequest(key: string) { try { sessionStorage.removeItem(`gt:request:${key}`); } catch { /* Storage is optional; server receipts remain authoritative. */ } }

export function formatDate(value: string, includeTime = true): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { dateStyle: "medium", ...(includeTime ? { timeStyle: "short" } : {}) }).format(date);
}

export const shortId = (id: string) => id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
