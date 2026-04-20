use std::collections::HashMap;
use std::time::Instant;
use std::str::FromStr;
use serde::{Deserialize, Serialize};
use reqwest::{Client, Method, header::{HeaderMap, HeaderName, HeaderValue}};
use crate::security::{validate_url, SsrfError};

// ── Request types ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RequestHeader {
    pub key: String,
    pub value: String,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct RequestParam {
    pub key: String,
    pub value: String,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BodyConfig {
    pub mode: Option<String>,
    pub raw: Option<String>,
    pub raw_language: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthConfig {
    #[serde(rename = "type")]
    pub auth_type: Option<String>,
    pub bearer: Option<BearerAuth>,
    pub basic: Option<BasicAuth>,
    pub apikey: Option<ApiKeyAuth>,
}

#[derive(Debug, Deserialize)]
pub struct BearerAuth {
    pub token: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BasicAuth {
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApiKeyAuth {
    pub key: Option<String>,
    pub value: Option<String>,
    #[serde(rename = "in")]
    pub location: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteRequestPayload {
    pub method: String,
    pub url: String,
    pub headers: Option<Vec<RequestHeader>>,
    pub params: Option<Vec<RequestParam>>,
    pub body: Option<BodyConfig>,
    pub auth: Option<AuthConfig>,
    pub timeout_ms: Option<u64>,
}

// ── Response types ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub response_time_ms: u64,
    pub size_bytes: usize,
}

// ── Command ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn execute_request(
    payload: ExecuteRequestPayload,
    client: tauri::State<'_, reqwest::Client>,
    cookie_jar: tauri::State<'_, crate::AppCookieJar>,
) -> Result<ExecuteResponse, String> {
    // 1. SSRF protection
    validate_url(&payload.url).map_err(|e| match e {
        SsrfError::InvalidUrl(msg) => format!("SSRF_INVALID_URL: {}", msg),
        SsrfError::BlockedHost(host) => format!("SSRF_BLOCKED: {} is a blocked internal address", host),
    })?;

    // 2. URL already contains query params visually thanks to 2-way UI binding
    let url = payload.url.clone();

    // 3. HTTP method
    let method = Method::from_str(&payload.method.to_uppercase())
        .map_err(|_| format!("Invalid HTTP method: {}", payload.method))?;

    // 4. Client timeout
    let timeout_secs = payload.timeout_ms.unwrap_or(30_000) / 1000;

    // 5. Build headers
    let mut header_map = HeaderMap::new();

    // Auth
    if let Some(auth) = &payload.auth {
        match auth.auth_type.as_deref() {
            Some("bearer") => {
                if let Some(bearer) = &auth.bearer {
                    if let Some(token) = &bearer.token {
                        if !token.is_empty() {
                            if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", token)) {
                                header_map.insert(
                                    HeaderName::from_static("authorization"),
                                    val,
                                );
                            }
                        }
                    }
                }
            }
            Some("basic") => {
                if let Some(basic) = &auth.basic {
                    let user = basic.username.as_deref().unwrap_or("");
                    let pass = basic.password.as_deref().unwrap_or("");
                    let encoded = base64_encode(&format!("{}:{}", user, pass));
                    if let Ok(val) = HeaderValue::from_str(&format!("Basic {}", encoded)) {
                        header_map.insert(HeaderName::from_static("authorization"), val);
                    }
                }
            }
            Some("apikey") => {
                if let Some(apikey) = &auth.apikey {
                    if apikey.location.as_deref() == Some("header") {
                        if let (Some(k), Some(v)) = (&apikey.key, &apikey.value) {
                            if let (Ok(name), Ok(val)) = (
                                HeaderName::from_str(k),
                                HeaderValue::from_str(v),
                            ) {
                                header_map.insert(name, val);
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    // Custom headers
    if let Some(headers) = &payload.headers {
        for h in headers.iter().filter(|h| h.enabled.unwrap_or(true) && !h.key.is_empty()) {
            if let (Ok(name), Ok(val)) = (
                HeaderName::from_str(&h.key),
                HeaderValue::from_str(&h.value),
            ) {
                header_map.insert(name, val);
            }
        }
    }

    // Extract Host for Cookie Jar
    let parsed_url = url::Url::parse(&url).map_err(|e| format!("Invalid URL format: {}", e))?;
    let host = parsed_url.host_str().unwrap_or("").to_string();

    // Attach saved cookies for this host
    if !host.is_empty() {
        if let Ok(jar) = cookie_jar.0.lock() {
            if let Some(cookies) = jar.get(&host) {
                if !cookies.is_empty() {
                    let mut cookie_components = Vec::new();
                    for (k, v) in cookies.iter() {
                        if v.is_empty() {
                            cookie_components.push(k.clone());
                        } else {
                            cookie_components.push(format!("{}={}", k, v));
                        }
                    }
                    if let Ok(val) = HeaderValue::from_str(&cookie_components.join("; ")) {
                        header_map.insert(reqwest::header::COOKIE, val);
                    }
                }
            }
        }
    }

    // 6. Build request
    let mut req = client.request(method, &url)
        .headers(header_map)
        .timeout(std::time::Duration::from_secs(timeout_secs.max(5).min(60)));

    // 7. Body
    if let Some(body) = &payload.body {
        if body.mode.as_deref() == Some("raw") {
            let raw = body.raw.clone().unwrap_or_default();
            let content_type = match body.raw_language.as_deref() {
                Some("json") => "application/json",
                Some("xml")  => "application/xml",
                Some("html") => "text/html",
                _            => "text/plain",
            };
            req = req.header("Content-Type", content_type).body(raw);
        }
    }

    // 8. Execute + measure time
    let start = Instant::now();
    let response = req.send().await.map_err(|e| {
        if e.is_timeout()  { "Request timed out".to_string() }
        else if e.is_connect() { format!("Connection failed: {}", e) }
        else { format!("Request failed: {}", e) }
    })?;
    let elapsed = start.elapsed().as_millis() as u64;

    // 9. Parse response
    let status_code = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("Unknown").to_string();

    let mut resp_headers = HashMap::new();
    
    // Handle returning Set-Cookies
    if !host.is_empty() {
        let set_cookies = response.headers().get_all(reqwest::header::SET_COOKIE);
        let mut new_cookies = Vec::new();
        for cookie in set_cookies.iter() {
            if let Ok(c_str) = cookie.to_str() {
                new_cookies.push(c_str.to_string());
                
                // Parse key=value
                let parts: Vec<&str> = c_str.split(';').collect();
                if let Some(first_part) = parts.first() {
                    let kv: Vec<&str> = first_part.splitn(2, '=').collect();
                    if let Ok(mut jar) = cookie_jar.0.lock() {
                        let host_jar = jar.entry(host.clone()).or_insert_with(HashMap::new);
                        let key = kv[0].trim().to_string();
                        let val = if kv.len() > 1 { kv[1].trim().to_string() } else { "".to_string() };
                        host_jar.insert(key, val);
                    }
                }
            }
        }
        if !new_cookies.is_empty() {
            resp_headers.insert("Set-Cookie".to_string(), new_cookies.join("\n"));
        }
    }

    for (k, v) in response.headers().iter() {
        if k != reqwest::header::SET_COOKIE {
            resp_headers.insert(k.to_string(), v.to_str().unwrap_or("").to_string());
        }
    }

    // Read body with timeout to prevent hanging on Linux
    let body_bytes = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        response.bytes()
    ).await
    .map_err(|_| "Body read timed out".to_string())?
    .map_err(|e| format!("Failed to read response body: {}", e))?;
    
    let size_bytes = body_bytes.len();
    let body_str = String::from_utf8_lossy(&body_bytes).to_string();

    Ok(ExecuteResponse {
        status: status_code,
        status_text,
        headers: resp_headers,
        body: body_str,
        response_time_ms: elapsed,
        size_bytes,
    })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Percent-encode a URL component (RFC 3986 unreserved chars pass through)
fn percent_encode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9'
            | b'-' | b'_' | b'.' | b'~' => result.push(byte as char),
            _ => result.push_str(&format!("%{:02X}", byte)),
        }
    }
    result
}

/// Base64 encode (RFC 4648) — used for Basic auth header
fn base64_encode(input: &str) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bytes = input.as_bytes();
    let mut result = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        result.push(CHARS[b0 >> 2] as char);
        result.push(CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char);
        if chunk.len() > 1 { result.push(CHARS[((b1 & 0xf) << 2) | (b2 >> 6)] as char); }
        else { result.push('='); }
        if chunk.len() > 2 { result.push(CHARS[b2 & 0x3f] as char); }
        else { result.push('='); }
    }
    result
}
