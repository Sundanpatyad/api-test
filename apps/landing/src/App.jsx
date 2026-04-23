import React, { useState, useEffect } from "react";
import styles from "./App.module.css";
import { Zap, Lock, Users, Code, Download } from 'lucide-react';
import { FaApple, FaWindows, FaLinux } from 'react-icons/fa';

const FEATURES = [
  { icon: <Zap size={18} />, tag: "PERFORMANCE", title: "Lightning Fast", desc: "Rust-powered engine" },
  { icon: <Lock size={18} />, tag: "SECURITY", title: "Encrypted", desc: "JWT + local vault" },
  { icon: <Users size={18} />, tag: "TEAMS", title: "Sync", desc: "Real-time collab" },
  { icon: <Code size={18} />, tag: "DEV", title: "Portable", desc: "Postman importer" },
];

const PLATFORMS = [
  { os: "macOS", arch: "Apple Silicon", icon: <FaApple />, primary: true },
  { os: "macOS", arch: "Intel", icon: <FaApple /> },
  { os: "Windows", arch: "x64", icon: <FaWindows /> },
  { os: "Linux", arch: "AppImage", icon: <FaLinux /> },
];

export default function App() {
  const [active, setActive] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 4), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.root}>
      {/* scanline overlay */}
      <div className={styles.scanlines} aria-hidden />

      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.logoMark}>
          <img src="/logo.png" alt="PayloadX Logo" />
        </div>
        <span className={styles.logoName}>PayloadX</span>
        <div className={styles.navSpacer} />
        <a href="#" className={styles.navLink}>Docs</a>
        <a href="https://github.com/Sundanpatyad/api-test" target="_blank" rel="noreferrer" className={styles.navLink}>GitHub</a>
        <a href="https://api-test-desktop.vercel.app/" target="_blank" rel="noreferrer" className={styles.navCta}>Web App →</a>
      </nav>

      {/* MAIN GRID */}
      <main className={styles.main}>

        {/* LEFT COLUMN */}
        <div className={styles.left}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            OPEN SOURCE · FREE FOREVER
          </div>

          <h1 className={styles.title}>
            <span className={styles.titleChrome}>Payload</span>
            <span className={styles.titleX}>X</span>
          </h1>

          <p className={styles.tagline}>API Testing,<br />Simplified.</p>

          <p className={styles.sub}>
            The modern, lightweight alternative to Postman —
            built for developers who move fast.
          </p>

          <div className={styles.ctaRow}>
            <a href="#" className={styles.btnPrimary}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 1v8M4 6l3 3 3-3M1 11h12" />
              </svg>
              Download
            </a>
            <a href="https://api-test-desktop.vercel.app/" target="_blank" rel="noreferrer" className={styles.btnGhost}>
              Try Web →
            </a>
          </div>

          {/* stat strip */}
          <div className={styles.stats}>
            <div className={styles.stat}><span className={styles.statNum}>2.4ms</span><span className={styles.statLabel}>avg latency</span></div>
            <div className={styles.statDiv} />
            <div className={styles.stat}><span className={styles.statNum}>4</span><span className={styles.statLabel}>platforms</span></div>
            <div className={styles.statDiv} />
            <div className={styles.stat}><span className={styles.statNum}>100%</span><span className={styles.statLabel}>free</span></div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.right}>

          {/* FEATURE TILES */}
          <div className={styles.featGrid}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`${styles.featCard} ${tick === i ? styles.featCardActive : ""}`}
              >
                <span className={styles.featTag}>{f.tag}</span>
                <div className={styles.featIcon}>{f.icon}</div>
                <div className={styles.featTitle}>{f.title}</div>
                <div className={styles.featDesc}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* DOWNLOAD STRIP */}
          <div className={styles.dlStrip}>
            <span className={styles.dlLabel}>DOWNLOAD FOR</span>
            <div className={styles.dlPills}>
              {PLATFORMS.map((p, i) => (
                <button
                  key={i}
                  className={`${styles.dlPill} ${active === i ? styles.dlPillActive : ""} ${p.primary ? styles.dlPillPrimary : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => {}}
                >
                  <span className={styles.pillOs}>
                    <span className={styles.pillIcon}>{p.icon}</span>
                    {p.os}
                  </span>
                  <span className={styles.pillArch}>{p.arch}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TERMINAL PREVIEW */}
          <div className={styles.terminal}>
            <div className={styles.termHeader}>
              <span className={styles.termDot} style={{ background: "#ff5f57" }} />
              <span className={styles.termDot} style={{ background: "#febc2e" }} />
              <span className={styles.termDot} style={{ background: "#28c840" }} />
              <span className={styles.termTitle}>payloadx — bash</span>
            </div>
            <div className={styles.termBody}>
              <span className={styles.termPrompt}>$ </span>
              <span className={styles.termCmd}>payloadx run collection.json</span>
              <br />
              <span className={styles.termOk}>✓</span>
              <span className={styles.termMuted}> GET /api/users </span>
              <span className={styles.termStatus}>200</span>
              <span className={styles.termTime}> 12ms</span>
              <br />
              <span className={styles.termOk}>✓</span>
              <span className={styles.termMuted}> POST /api/auth </span>
              <span className={styles.termStatus}>201</span>
              <span className={styles.termTime}> 8ms</span>
              <br />
              <span className={styles.termErr}>✗</span>
              <span className={styles.termMuted}> DELETE /api/item </span>
              <span className={styles.termStatusErr}>404</span>
              <span className={styles.termTime}> 3ms</span>
              <br />
              <span className={styles.termPrompt}>$ <span className={styles.termCursor}>▋</span></span>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <span className={styles.footerCopy}>© 2024 PayloadX</span>
        <div className={styles.footerLinks}>
          <a href="https://github.com/Sundanpatyad/api-test" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://api-test-desktop.vercel.app/" target="_blank" rel="noreferrer">Web App</a>
          <a href="#">Changelog</a>
        </div>
      </footer>
    </div>
  );
}