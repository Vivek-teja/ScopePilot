import TopArchNav from './TopArchNav.jsx';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import styles from './AppShell.module.css';

export default function AppShell({ children }) {
  const { mode } = useDemoSession();
  const isLive = mode === 'live';

  return (
    <div className={styles.shell}>
      {/* ── Semicircular Cyber-Geometric Navigation Hub ── */}
      <TopArchNav />

      {/* ── Main content ── */}
      <main className={styles.main}>{children}</main>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <span>
          ScopePilot &nbsp;·&nbsp;{' '}
          {isLive
            ? `Connected to Express API at ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}`
            : 'Local sample data only (Demo Mode)'}
        </span>
      </footer>
    </div>
  );
}
