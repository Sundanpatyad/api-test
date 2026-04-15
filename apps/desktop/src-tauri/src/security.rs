use url::Url;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

#[derive(Debug)]
pub enum SsrfError {
    InvalidUrl(String),
    BlockedHost(String),
}

const BLOCKED_HOSTS: &[&str] = &[
    "localhost",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "169.254.169.254", // AWS/GCP/Azure metadata
];

pub fn validate_url(url_str: &str) -> Result<(), SsrfError> {
    let url = Url::parse(url_str)
        .map_err(|e| SsrfError::InvalidUrl(format!("Could not parse URL: {}", e)))?;

    // Only allow http/https
    match url.scheme() {
        "http" | "https" => {}
        scheme => {
            return Err(SsrfError::InvalidUrl(format!(
                "Scheme '{}' is not allowed. Only http/https are permitted.",
                scheme
            )));
        }
    }

    let host = url.host_str().ok_or_else(|| SsrfError::InvalidUrl("URL has no host".into()))?;

    // Check blocked hostnames
    let host_lower = host.to_lowercase();
    for blocked in BLOCKED_HOSTS {
        if host_lower == *blocked {
            return Err(SsrfError::BlockedHost(host.to_string()));
        }
    }

    // Attempt to parse as IP and check for private/reserved ranges
    if let Ok(ip) = host.parse::<IpAddr>() {
        if is_blocked_ip(&ip) {
            return Err(SsrfError::BlockedHost(host.to_string()));
        }
    }

    Ok(())
}

fn is_blocked_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => is_blocked_ipv4(v4),
        IpAddr::V6(v6) => is_blocked_ipv6(v6),
    }
}

fn is_blocked_ipv4(ip: &Ipv4Addr) -> bool {
    let octets = ip.octets();
    let [a, b, c, d] = octets;

    // Loopback: 127.0.0.0/8
    if a == 127 {
        return true;
    }
    // Private: 10.0.0.0/8
    if a == 10 {
        return true;
    }
    // Private: 172.16.0.0/12
    if a == 172 && (16..=31).contains(&b) {
        return true;
    }
    // Private: 192.168.0.0/16
    if a == 192 && b == 168 {
        return true;
    }
    // Link-local: 169.254.0.0/16 (metadata services)
    if a == 169 && b == 254 {
        return true;
    }
    // Unspecified: 0.0.0.0
    if a == 0 && b == 0 && c == 0 && d == 0 {
        return true;
    }
    // Broadcast
    if a == 255 && b == 255 && c == 255 && d == 255 {
        return true;
    }

    false
}

fn is_blocked_ipv6(ip: &Ipv6Addr) -> bool {
    // Loopback ::1
    if ip.is_loopback() {
        return true;
    }
    // Unspecified ::
    if ip.is_unspecified() {
        return true;
    }
    // Link-local fe80::/10
    let segments = ip.segments();
    if segments[0] & 0xffc0 == 0xfe80 {
        return true;
    }

    false
}
