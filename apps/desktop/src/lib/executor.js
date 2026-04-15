/**
 * Detects whether the app is running inside the Tauri webview.
 * `window.__TAURI__` is injected by Tauri at runtime.
 */
export const isTauri = () =>
  typeof window !== 'undefined' && typeof window.__TAURI__ !== 'undefined';

/**
 * Execute an HTTP request.
 *
 * - Inside Tauri  → uses Rust `reqwest` via invoke() for SSRF-safe execution
 * - In browser    → falls back to native fetch() for development/testing
 */
export async function executeHttpRequest(payload) {
  if (isTauri()) {
    // ── Tauri path (production) ────────────────────────────────────────────
    const { invoke } = await import('@tauri-apps/api/tauri');
    return invoke('execute_request', { payload });
  }

  // ── Browser fallback (dev / testing) ──────────────────────────────────────
  return executeFetchFallback(payload);
}

async function executeFetchFallback(payload) {
  const { method, url, headers = [], params = [], body, auth, timeoutMs = 30000 } = payload;

  // Build URL with query params
  let finalUrl = url;
  const enabledParams = params.filter((p) => p.enabled !== false && p.key);
  if (enabledParams.length > 0) {
    const qs = new URLSearchParams(enabledParams.map((p) => [p.key, p.value])).toString();
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
  }

  // Build headers
  const reqHeaders = new Headers();
  headers.filter((h) => h.enabled !== false && h.key).forEach((h) => {
    reqHeaders.set(h.key, h.value);
  });

  // Auth header
  if (auth?.type === 'bearer' && auth.bearer?.token) {
    reqHeaders.set('Authorization', `Bearer ${auth.bearer.token}`);
  } else if (auth?.type === 'basic' && auth.basic?.username) {
    const encoded = btoa(`${auth.basic.username}:${auth.basic.password || ''}`);
    reqHeaders.set('Authorization', `Basic ${encoded}`);
  } else if (auth?.type === 'apikey' && auth.apikey?.in === 'header') {
    reqHeaders.set(auth.apikey.key, auth.apikey.value);
  }

  // Build body
  let reqBody = undefined;
  if (body?.mode === 'raw' && body.raw) {
    if (body.rawLanguage === 'json' && !reqHeaders.has('Content-Type')) {
      reqHeaders.set('Content-Type', 'application/json');
    }
    reqBody = body.raw;
  } else if (body?.mode === 'form-data' && body.formData?.length) {
    const fd = new FormData();
    body.formData.filter((f) => f.enabled !== false).forEach((f) => fd.append(f.key, f.value));
    reqBody = fd;
  } else if (body?.mode === 'urlencoded' && body.urlencoded?.length) {
    reqHeaders.set('Content-Type', 'application/x-www-form-urlencoded');
    reqBody = new URLSearchParams(
      body.urlencoded.filter((u) => u.enabled !== false).map((u) => [u.key, u.value])
    ).toString();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const start = performance.now();
  try {
    const response = await fetch(finalUrl, {
      method: method.toUpperCase(),
      headers: reqHeaders,
      body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : reqBody,
      signal: controller.signal,
    });

    const elapsed = Math.round(performance.now() - start);
    const bodyText = await response.text();

    const respHeaders = {};
    response.headers.forEach((value, key) => { respHeaders[key] = value; });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: respHeaders,
      body: bodyText,
      responseTimeMs: elapsed,
      sizeBytes: new TextEncoder().encode(bodyText).length,
    };
  } catch (err) {
    if (err.name === 'AbortError') throw 'Request timed out';

    // CORS error detection
    const msg = err.message || String(err);
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('CORS')) {
      throw [
        'CORS Error: The target server blocked this request from the browser.',
        '',
        '💡 Options:',
        '  1. Run the app with Tauri (npm run tauri:dev) — bypasses CORS entirely',
        '  2. Ensure the target API has Access-Control-Allow-Origin: * header',
        '  3. For ngrok URLs: add "ngrok-skip-browser-warning: true" header',
      ].join('\n');
    }

    throw msg;
  } finally {
    clearTimeout(timer);
  }
}
