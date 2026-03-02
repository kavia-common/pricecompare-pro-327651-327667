/**
 * Lightweight API client for the price comparison backend.
 *
 * Uses `NEXT_PUBLIC_API_BASE_URL` (as specified by the work item) and falls back
 * to same-origin when not set (useful in dev/proxy setups).
 */

const DEFAULT_TIMEOUT_MS = 60_000;

function getApiBaseUrl() {
  // CRA exposes env vars at build time; we still defensively default to empty.
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  return base.replace(/\/+$/, "");
}

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // If caller provided an AbortSignal, forward abort to our controller.
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function parseJsonOrText(res) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

/**
 * PUBLIC_INTERFACE
 * Post JSON to an API endpoint and return parsed JSON.
 * @param {string} path - API path beginning with `/` (e.g. `/api/comparePrices`)
 * @param {any} body - JSON-serializable payload
 * @param {{timeoutMs?: number, signal?: AbortSignal}} [opts]
 * @returns {Promise<any>}
 */
export async function apiPostJson(path, body, opts = {}) {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  const { signal, clear } = withTimeout(opts.signal, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal,
    });

    const payload = await parseJsonOrText(res);

    if (!res.ok) {
      const msg =
        (payload && typeof payload === "object" && (payload.detail || payload.message)) ||
        (typeof payload === "string" ? payload : "") ||
        `Request failed with status ${res.status}`;

      const err = new Error(msg);
      err.status = res.status;
      err.payload = payload;
      throw err;
    }

    return payload;
  } finally {
    clear();
  }
}
