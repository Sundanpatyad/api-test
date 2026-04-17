"use client";
import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

const NAV_LINKS = ['Features', 'API Docs', 'Security', 'Download'];

const TECH_STRIP = [
  { name: 'Tauri', icon: '◈' },
  { name: 'React', icon: '⚛' },
  { name: 'Next.js', icon: '▲' },
  { name: 'MongoDB', icon: '🍃' },
  { name: 'Socket.IO', icon: '⬡' },
  { name: 'Vercel', icon: '▲' },
  { name: 'Render', icon: '◉' },
  { name: 'Rust', icon: '⚙' },
];

const DOWNLOADS = [
  {
    id: 'dl-mac-silicon',
    platform: 'macOS',
    variant: 'Apple Silicon',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    ext: '.dmg',
    size: '8.2 MB',
    accent: '#5A7D9A',
    href: 'https://github.com/Sundanpatyad/api-test/releases/download/1.2.2/PayloadX.API.Studioaarch64.dmg',
  },
  {
    id: 'dl-mac-intel',
    platform: 'macOS',
    variant: 'Intel',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    ext: '.dmg',
    size: '9.1 MB',
    accent: '#4C6378',
    href: 'https://github.com/Sundanpatyad/api-test/releases/download/1.2.2/PayloadX.API.Studiox64.dmg',
  },
  {
    id: 'dl-windows',
    platform: 'Windows',
    variant: 'x64',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
      </svg>
    ),
    ext: '.exe',
    size: '7.8 MB',
    accent: '#3E5568',
    href: 'https://github.com/Sundanpatyad/api-test/releases/tag/1.2.2',
  },
  {
    id: 'dl-linux-appimage',
    platform: 'Linux',
    variant: 'AppImage',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M12 0a12 12 0 100 24A12 12 0 0012 0zm0 2.18a9.82 9.82 0 110 19.64A9.82 9.82 0 0112 2.18zm.58 4.3c-.32 0-.63.03-.94.08-1.5.24-2.77 1.1-3.5 2.3-.45.76-.67 1.62-.64 2.5.06 1.79 1.09 3.39 2.67 4.2.47.25.98.4 1.5.48.33.05.67.07 1 .06.67-.02 1.33-.17 1.93-.45 1.58-.73 2.67-2.27 2.76-4.06.05-.88-.13-1.75-.56-2.52-.72-1.25-1.99-2.14-3.5-2.43-.24-.04-.48-.07-.72-.07v-.09z" />
      </svg>
    ),
    ext: '.AppImage',
    size: '9.4 MB',
    accent: '#343A40',
    href: 'https://github.com/Sundanpatyad/api-test/releases/tag/1.2.2',
  },
  {
    id: 'dl-linux-deb',
    platform: 'Linux',
    variant: 'Ubuntu .deb',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M12 0a12 12 0 100 24A12 12 0 0012 0zm0 2.18a9.82 9.82 0 110 19.64A9.82 9.82 0 0112 2.18zm.58 4.3c-.32 0-.63.03-.94.08-1.5.24-2.77 1.1-3.5 2.3-.45.76-.67 1.62-.64 2.5.06 1.79 1.09 3.39 2.67 4.2.47.25.98.4 1.5.48.33.05.67.07 1 .06.67-.02 1.33-.17 1.93-.45 1.58-.73 2.67-2.27 2.76-4.06.05-.88-.13-1.75-.56-2.52-.72-1.25-1.99-2.14-3.5-2.43-.24-.04-.48-.07-.72-.07v-.09z" />
      </svg>
    ),
    ext: '.deb',
    size: '8.8 MB',
    accent: '#2A2F36',
    href: 'https://github.com/Sundanpatyad/api-test/releases/tag/1.2.2',
  },
];

export default function LandingPage() {
  const [os, setOs] = useState('Unknown');
  const [downloads, setDownloads] = useState(DOWNLOADS);
  const [heroCta, setHeroCta] = useState({ text: 'Download App', href: 'https://github.com/Sundanpatyad/api-test/releases/latest' });
  const [latestVersion, setLatestVersion] = useState('v1.0.0');

  useEffect(() => {
    let detectedOS = 'Unknown';
    if (navigator.userAgent.indexOf('Win') !== -1) detectedOS = 'Windows';
    else if (navigator.userAgent.indexOf('Mac') !== -1) detectedOS = 'macOS';
    else if (navigator.userAgent.indexOf('Linux') !== -1) detectedOS = 'Linux';
    setOs(detectedOS);

    if (detectedOS !== 'Unknown') {
      setHeroCta(prev => ({ ...prev, text: `Download for ${detectedOS}` }));
    }

    fetch('https://api.github.com/repos/Sundanpatyad/api-test/releases/latest')
      .then(res => res.json())
      .then(data => {
        if (!data || !data.assets) return;
        const releaseUrl = data.html_url || 'https://github.com/Sundanpatyad/api-test/releases/latest';
        setLatestVersion(data.tag_name || 'v1.0.0');

        const newDownloads = DOWNLOADS.map(d => {
          const assets = data.assets || [];
          let asset = null;

          if (d.platform === 'macOS') {
            if (d.variant === 'Apple Silicon') {
              asset = assets.find(a => a.name.toLowerCase().endsWith('.dmg') && (a.name.toLowerCase().includes('aarch64') || a.name.toLowerCase().includes('arm64')));
            } else {
              asset = assets.find(a => a.name.toLowerCase().endsWith('.dmg') && (a.name.toLowerCase().includes('x64') || a.name.toLowerCase().includes('x86_64')));
              // Fallback for universal or intel-only if explicit x64 not found
              if (!asset) asset = assets.find(a => a.name.toLowerCase().endsWith('.dmg') && !a.name.toLowerCase().includes('aarch64'));
            }
          } else if (d.platform === 'Windows') {
            // Find .exe but exclude any with -setup suffix if we prefer others, or just get the first exe
            asset = assets.find(a => a.name.toLowerCase().endsWith('.exe'));
            if (!asset) asset = assets.find(a => a.name.toLowerCase().endsWith('.msi'));
          } else if (d.platform === 'Linux') {
            if (d.variant.includes('AppImage')) {
              asset = assets.find(a => a.name.toLowerCase().endsWith('.appimage'));
            } else if (d.variant.includes('.deb')) {
              asset = assets.find(a => a.name.toLowerCase().endsWith('.deb'));
            }
          }

          if (asset) {
            return {
              ...d,
              href: asset.browser_download_url,
              size: (asset.size / (1024 * 1024)).toFixed(1) + ' MB'
            };
          }
          return { ...d, href: releaseUrl };
        });

        setDownloads(newDownloads);

        if (detectedOS !== 'Unknown') {
          const match = newDownloads.find(d => d.platform === detectedOS);
          if (match && match.href && match.href !== releaseUrl) {
            setHeroCta({ text: `Download for ${detectedOS} (${match.size})`, href: match.href });
          } else if (match) {
            setHeroCta({ text: `Download for ${detectedOS}`, href: match.href });
          }
        } else {
          setHeroCta({ text: 'Download App', href: releaseUrl });
        }
      })
      .catch(err => {
        console.error("Failed to fetch releases", err);
        const fallback = 'https://github.com/Sundanpatyad/api-test/releases/latest';
        setDownloads(prev => prev.map(d => ({ ...d, href: fallback })));
        setHeroCta({ text: 'Download App', href: fallback });
      });
  }, []);

  return (
    <main className={styles.root}>

      {/* ── Ambient glows ── */}
      <div className={styles.glow1} />
      <div className={styles.glow2} />
      <div className={styles.glow3} />

      {/* ── Noise overlay ── */}
      <div className={styles.noise} />

      {/* ══════════════════════════════════════
          NAV
      ══════════════════════════════════════ */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <img src="/logo.png" alt="PayloadX" className={styles.navBrandImg} />
          <span className={styles.navBrand}>PayloadX</span>
        </div>

        <ul className={styles.navLinks}>
          {NAV_LINKS.map((l) => (
            <li key={l}>
              <a href={`#${l.toLowerCase().replace(' ', '-')}`} className={styles.navLink} id={`nav-${l.toLowerCase().replace(' ', '-')}`}>
                {l}
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.navRight}>
          <a id="nav-github" href="https://github.com/Sundanpatyad/api-test" className={styles.ghostBtn} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a id="nav-download-hero" href={heroCta.href} className={styles.primaryBtn}>
            Download Free
          </a>
        </div>
      </nav>


      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className={styles.hero}>

        {/* Floating cards */}
        <div className={`${styles.floatCard} ${styles.cardTL}`} id="float-realtime">
          <span className={styles.floatDot} style={{ background: '#22c55e' }} />
          <div>
            <div className={styles.floatLabel}>Real-time Sync</div>
            <div className={styles.floatVal}>3 members • live</div>
          </div>
        </div>

        <div className={`${styles.floatCard} ${styles.cardTR}`} id="float-requests">
          <span className={styles.floatDot} style={{ background: '#a78bfa' }} />
          <div>
            <div className={styles.floatLabel}>Requests Today</div>
            <div className={styles.floatVal}>2,847</div>
          </div>
        </div>

        <div className={`${styles.floatCard} ${styles.cardBL}`} id="float-ssrf">
          <span className={styles.floatDot} style={{ background: '#f59e0b' }} />
          <div>
            <div className={styles.floatLabel}>SSRF Protected</div>
            <div className={styles.floatVal}>Rust native</div>
          </div>
        </div>

        <div className={`${styles.floatCard} ${styles.cardBR}`} id="float-teams">
          <span className={styles.floatDot} style={{ background: '#60a5fa' }} />
          <div>
            <div className={styles.floatLabel}>Team Workspaces</div>
            <div className={styles.floatVal}>Unlimited</div>
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '100px', marginBottom: '20px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '0.02em' }}>
            Project by <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Sundan Sharma</span>
          </span>
        </div>

        {/* Center content */}
        <div className={styles.heroCenter}>
          <div className={styles.heroPill} id="hero-badge" style={{ marginBottom: '12px' }}>
            <span className={styles.heroPillDot} />
            Open Source · Postman Alternative
          </div>



          <h1 className={styles.heroTitle}>
            The Payload studio<br />
            <span className={styles.heroGradient}>Built for Teams</span>
          </h1>

          <p className={styles.heroSub}>
            Test, collaborate, and ship faster — with real-time sync,<br />
            Postman import, JWT auth, and a Rust-powered native desktop app.
          </p>

          <div className={styles.heroCtas}>
            <a id="cta-download" href={heroCta.href} className={styles.ctaPrimary}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              {heroCta.text}
            </a>
            <a id="cta-docs" href="https://api-test-desktop.vercel.app/" className={styles.ctaOutline}>
              Playground →
            </a>
          </div>

          {/* Version + platform hints */}
          <div className={styles.heroMeta}>
            <span>{latestVersion}</span>
            <span className={styles.metaSep}>·</span>
            <span>macOS · Windows · Linux</span>
            <span className={styles.metaSep}>·</span>
            <span>Free &amp; Open Source</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DOWNLOAD SECTION
      ══════════════════════════════════════ */}
      <section className={styles.downloadSection} id="download">
        <p className={styles.dlLabel}>Choose your platform</p>
        <div className={styles.dlGrid}>
          {downloads.map((d) => (
            <a
              key={d.id}
              id={d.id}
              href={d.href || '#'}
              className={styles.dlCard}
              style={{ '--accent': d.accent }}
            >
              <div className={styles.dlIcon} style={{ color: d.accent }}>
                {d.icon}
              </div>
              <div className={styles.dlInfo}>
                <div className={styles.dlPlatform}>{d.platform}</div>
                <div className={styles.dlVariant}>{d.variant}</div>
              </div>
              <div className={styles.dlRight}>
                <span className={styles.dlExt}>{d.ext}</span>
                <span className={styles.dlSize}>{d.size}</span>
              </div>
              <svg className={styles.dlArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </a>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          TECH STRIP
      ══════════════════════════════════════ */}
      <footer className={styles.footer}>
        <div className={styles.footerMain}>
          <img src="/logo.png" alt="PayloadX" className={styles.footerLogo} />
          <p className={styles.footerLabel}>Powered by</p>
        </div>
        <div className={styles.techStrip}>
          {TECH_STRIP.map((t) => (
            <div key={t.name} className={styles.techItem}>
              <span className={styles.techIcon}>{t.icon}</span>
              <span className={styles.techName}>{t.name}</span>
            </div>
          ))}
        </div>
      </footer>

    </main>
  );
}
