/**
 * Detects whether the app is running inside the Tauri webview.
 * `window.__TAURI__` is injected by Tauri at runtime.
 */
export const isTauri = () =>
  typeof window !== 'undefined' && typeof window.__TAURI__ !== 'undefined';

/**
 * Execute an HTTP request.
 *
 * - Inside Tauri  → uses Rust `reqwest` via invoke()
 * - In browser    → falls back to native fetch()
 */
export async function executeHttpRequest(payload) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw 'Offline: No internet connection detected.';
  }

  if (isTauri()) {
    // ── Tauri path (production) ────────────────────────────────────────────
    const { invoke } = await import('@tauri-apps/api/tauri');

    // Create a watchdog timeout to prevent infinite loading if the bridge hangs
    const WATCHDOG_TIMEOUT_MS = 35000;
    
    const watchdog = new Promise((_, reject) => {
      setTimeout(() => reject('Request Timeout: The native bridge failed to respond within 35s.'), WATCHDOG_TIMEOUT_MS);
    });

    try {
      // Race the actual request against the watchdog
      return await Promise.race([
        invoke('execute_request', { payload }),
        watchdog
      ]);
    } catch (err) {
      // Detailed error logging for production debugging (if console is visible)
      console.error('[Tauri Bridge Error]:', err);
      
      const msg = typeof err === 'string' ? err : (err.message || String(err));
      
      if (msg.includes('SSRF_BLOCKED')) {
        throw 'Blocked: Internal/private IP addresses are not allowed for security.';
      }
      if (msg.includes('failed to fill whole buffer') || msg.includes('os error 10054')) {
        throw 'Connection reset by peer: The server closed the connection unexpectedly.';
      }

      throw msg;
    }
  }

  // ── Browser fallback (dev / testing) ──────────────────────────────────────
  return executeFetchFallback(payload);
}

async function executeFetchFallback(payload) {
  const { method, url, headers = [], params = [], body, auth, timeoutMs = 30000 } = payload;

  // URL already contains query params visually thanks to 2-way UI binding
  const finalUrl = url;

  // Build headers
  const reqHeaders = new Headers();
  headers.filter((h) => h.enabled !== false && h.key).forEach((h) => {
    reqHeaders.set(h.key, h.value);
  });

  // Automatically bypass ngrok and localtunnel browser warnings for web users
  if (!reqHeaders.has('ngrok-skip-browser-warning')) {
    reqHeaders.set('ngrok-skip-browser-warning', 'true');
  }
  if (!reqHeaders.has('Bypass-Tunnel-Reminder')) {
    reqHeaders.set('Bypass-Tunnel-Reminder', 'true');
  }

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
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timer);
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
    clearTimeout(timer);
    
    if (err.name === 'AbortError') throw 'Request timed out';

    // CORS error detection - provide helpful message
    const msg = err.message || String(err);
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('CORS') || msg.includes('blocked')) {
      throw 'CORS Error: The target server blocked this request. If using the desktop app, please use the production build (.AppImage or .deb) instead of development mode.';
    }

    throw msg;
  }
}
