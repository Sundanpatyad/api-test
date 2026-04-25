import React, { useState } from "react";
import styles from "./Docs.module.css";
import PayloadX from "./components/core/Logo";
import { ChevronRight, Terminal, Cpu, Layers, Github } from "lucide-react";

export default function Docs({ onBack }) {
  const [activeSection, setActiveSection] = useState("setup");

  const sections = {
    setup: (
      <div className={styles.section}>
        <h1 className={styles.metallicTitle}>Getting Started</h1>
        <p className={styles.text}>
          PayloadX is a high-performance, open-source API Studio built with Rust and React. 
          Follow these detailed steps to set up the full development suite on your local machine.
        </p>
        
        <div className={styles.sectionTitle}>1. Environment Prerequisites</div>
        <p className={styles.text}>You'll need the following toolchains installed:</p>
        <div className={styles.featGrid}>
          <div className={styles.badge}>Node.js v20.x (LTS)</div>
          <div className={styles.badge}>Rustc 1.75+ & Cargo</div>
          <div className={styles.badge}>Tauri CLI (npm install -g @tauri-apps/cli)</div>
        </div>

        <div className={styles.sectionTitle}>2. Repository Initialization</div>
        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}><span>Shell</span></div>
          <code>git clone https://github.com/Sundanpatyad/api-test.git<br/>cd api-test<br/>npm install</code>
        </div>

        <div className={styles.sectionTitle}>3. Environment Configuration</div>
        <p className={styles.text}>
          Create a <code>.env</code> file in <code>apps/backend</code> with these keys:
        </p>
        <div className={styles.codeBlock}>
          <code>
            PORT=3001<br/>
            MONGODB_URI=your_mongodb_connection_string<br/>
            JWT_SECRET=your_secure_random_secret<br/>
            OPENAI_API_KEY=optional_for_ai_features
          </code>
        </div>
      </div>
    ),
    architecture: (
      <div className={styles.section}>
        <h1 className={styles.metallicTitle}>Architecture Deep-Dive</h1>
        <p className={styles.text}>
          PayloadX leverages a hybrid architecture to balance performance with developer velocity.
        </p>

        <div className={styles.sectionTitle}>Desktop Client (apps/desktop)</div>
        <p className={styles.text}>
          A Tauri-powered application. The frontend is built with React and TailwindCSS. 
          The backend logic (Request execution engine) is written in <strong>Rust</strong> for maximum throughput.
        </p>

        <div className={styles.sectionTitle}>Cloud Service (apps/backend)</div>
        <p className={styles.text}>
          A Node.js/Express service that handles user authentication, workspace synchronization, 
          and team management via MongoDB.
        </p>

        <div className={styles.sectionTitle}>Realtime Engine (apps/realtime)</div>
        <p className={styles.text}>
          A specialized Socket.IO server that synchronizes cursor positions, live request edits, 
          and team presence in real-time.
        </p>
      </div>
    ),
    running: (
      <div className={styles.section}>
        <h1 className={styles.metallicTitle}>Development Workflow</h1>
        
        <div className={styles.sectionTitle}>Development Mode</div>
        <p className={styles.text}>To start all services in development mode:</p>
        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}><span>Root Directory</span></div>
          <code>npm run dev</code>
        </div>

        <div className={styles.sectionTitle}>Tauri Desktop Client</div>
        <p className={styles.text}>Run the desktop UI separately if needed:</p>
        <div className={styles.codeBlock}>
          <code>npm run desktop</code>
        </div>

        <div className={styles.sectionTitle}>Building for Production</div>
        <p className={styles.text}>Generate a production bundle for your current OS:</p>
        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}><span>apps/desktop</span></div>
          <code>npm run tauri build</code>
        </div>

        <div className={styles.sectionTitle}>Contribution Guidelines</div>
        <p className={styles.text}>
          1. Fork the repo and create a feature branch.<br/>
          2. Ensure all code follows the established ESLint patterns.<br/>
          3. Submit a PR with a clear description of your changes.
        </p>
      </div>
    ),
    structure: (
      <div className={styles.section}>
        <h1 className={styles.metallicTitle}>Project Structure</h1>
        <p className={styles.text}>
          PayloadX follows a clean, modular structure within a workspace-managed monorepo.
        </p>

        <div className={styles.codeBlock}>
          <code>
            .github/workflows/  # CI/CD pipelines<br/>
            apps/<br/>
            ├── desktop/       # React + Tauri UI<br/>
            │   ├── src/       # Frontend components<br/>
            │   └── src-tauri/ # Rust backend core<br/>
            ├── backend/       # Node.js API<br/>
            └── realtime/      # Socket.IO server<br/>
            packages/          # Shared types & utilities
          </code>
        </div>
      </div>
    )
  };

  return (
    <div className={styles.root}>
      <div className={styles.scanlines} aria-hidden />

      <nav className={styles.nav}>
        <div onClick={onBack} className={styles.logoName}>
           <PayloadX size="28px" fontSize="10px" />
           <span style={{ marginLeft: '10px' }}>PayloadX</span>
        </div>
        <div className={styles.navSpacer} />
        <a href="https://github.com/Sundanpatyad/api-test" target="_blank" rel="noreferrer" className={styles.navLink}>
          <Github size={16} />
        </a>
      </nav>

      <main className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <span className={styles.sidebarTitle}>Developer Guide</span>
            <div 
              className={`${styles.sidebarLink} ${activeSection === 'setup' ? styles.sidebarLinkActive : ''}`}
              onClick={() => setActiveSection('setup')}
            >
              Quick Start
            </div>
            <div 
              className={`${styles.sidebarLink} ${activeSection === 'architecture' ? styles.sidebarLinkActive : ''}`}
              onClick={() => setActiveSection('architecture')}
            >
              Architecture
            </div>
            <div 
              className={`${styles.sidebarLink} ${activeSection === 'structure' ? styles.sidebarLinkActive : ''}`}
              onClick={() => setActiveSection('structure')}
            >
              Project Structure
            </div>
            <div 
              className={`${styles.sidebarLink} ${activeSection === 'running' ? styles.sidebarLinkActive : ''}`}
              onClick={() => setActiveSection('running')}
            >
              Local Execution
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <span className={styles.sidebarTitle}>Resources</span>
            <a href="https://github.com/Sundanpatyad/api-test/issues" target="_blank" className={styles.sidebarLink}>
              Report Issue
            </a>
            <a href="https://github.com/Sundanpatyad/api-test/discussions" target="_blank" className={styles.sidebarLink}>
              Community
            </a>
          </div>
        </aside>

        <div className={styles.content}>
          {sections[activeSection]}
        </div>
      </main>
    </div>
  );
}
