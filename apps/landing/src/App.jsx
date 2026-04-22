import React, { useState, useEffect } from "react";
import styles from "./App.module.css";
import { Download, Github, Globe, Zap, Shield, Users, Code, Star } from "lucide-react";

const FEATURES = [
  { icon: Zap, title: "Lightning Fast", description: "Rust-powered performance for instant API testing" },
  { icon: Shield, title: "Secure", description: "JWT authentication and encrypted data storage" },
  { icon: Users, title: "Team Collaboration", description: "Real-time sync with your entire team" },
  { icon: Code, title: "Developer Friendly", description: "Import from Postman and export with ease" }
];

const DOWNLOADS = [
  { platform: "macOS", name: "Apple Silicon", url: "#", icon: "🍎" },
  { platform: "macOS", name: "Intel", url: "#", icon: "🍎" },
  { platform: "Windows", name: "x64", url: "#", icon: "🪟" },
  { platform: "Linux", name: "AppImage", url: "#", icon: "🐧" }
];

export default function LandingPage() {
  const [userOS, setUserOS] = useState("Windows");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes("Win")) setUserOS("Windows");
    else if (ua.includes("Mac")) setUserOS("macOS");
    else setUserOS("Linux");
  }, []);

  const primaryDownload = DOWNLOADS.find(d => d.platform === userOS) || DOWNLOADS[2];

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <img src="/app-icon.png" alt="PayloadX" className={styles.logoIcon} />
            <span className={styles.logoText}>PayloadX</span>
          </div>
          
          <div className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ''}`}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#download" className={styles.navLink}>Download</a>
            <a href="https://github.com/Sundanpatyad/api-test" target="_blank" rel="noreferrer" className={styles.navLink}>
              <Github size={18} />
            </a>
            <a href="https://api-test-desktop.vercel.app/" target="_blank" rel="noreferrer" className={styles.navLink}>
              Web App
            </a>
          </div>

          <button 
            className={styles.menuToggle}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className={`${styles.hamburger} ${isMenuOpen ? styles.hamburgerOpen : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.badge}>
              <Star size={16} />
              Open Source • Free Forever
            </div>
            
            <h1 className={styles.title}>
              API Testing,
              <br />
              <span className={styles.titleGradient}>Simplified</span>
            </h1>
            
            <p className={styles.subtitle}>
              The modern, lightweight alternative to Postman. 
              Built for developers who value speed and simplicity.
            </p>

            <div className={styles.ctaButtons}>
              <a href={primaryDownload.url} className={styles.primaryButton}>
                <Download size={20} />
                Download for {userOS}
              </a>
              <a href="https://api-test-desktop.vercel.app/" target="_blank" rel="noreferrer" className={styles.secondaryButton}>
                <Globe size={20} />
                Try Web Version
              </a>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.appPreview}>
              <img src="/app-icon.png" alt="PayloadX" className={styles.appIcon} />
              <div className={styles.appIconGlow}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <div className={styles.featuresContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Built for Modern Development</h2>
            <p className={styles.sectionSubtitle}>
              Everything you need for efficient API testing, nothing you don't
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {FEATURES.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <feature.icon size={24} />
                </div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className={styles.download}>
        <div className={styles.downloadContent}>
          <div className={styles.downloadHeader}>
            <h2 className={styles.downloadTitle}>Get Started Now</h2>
            <p className={styles.downloadSubtitle}>
              Available for all major platforms. Always free, forever.
            </p>
          </div>

          <div className={styles.downloadGrid}>
            {DOWNLOADS.map((download, index) => (
              <a 
                key={index}
                href={download.url}
                className={`${styles.downloadCard} ${download.platform === userOS ? styles.downloadCardPrimary : ''}`}
              >
                <div className={styles.downloadIcon}>{download.icon}</div>
                <div className={styles.downloadInfo}>
                  <div className={styles.downloadPlatform}>{download.platform}</div>
                  <div className={styles.downloadName}>{download.name}</div>
                </div>
                <Download size={20} className={styles.downloadArrow} />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <img src="/app-icon.png" alt="PayloadX" className={styles.footerLogoIcon} />
            <span>PayloadX</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="https://github.com/Sundanpatyad/api-test" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://api-test-desktop.vercel.app/" target="_blank" rel="noreferrer">
              Web App
            </a>
          </div>
          <div className={styles.footerCopyright}>
            © 2024 PayloadX. Open source and free forever.
          </div>
        </div>
      </footer>
    </div>
  );
}
