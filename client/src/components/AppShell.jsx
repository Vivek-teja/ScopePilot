import { NavLink, useNavigate } from 'react-router-dom';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import { DEMO_USERS } from '../mocks/fixtures.js';
import { resetDemoData } from '../services/scopePilotService.js';
import { Avatar } from './ui.jsx';
import styles from './AppShell.module.css';

export default function AppShell({ children }) {
  const { session, mode, switchRole, logout } = useDemoSession();
  const navigate = useNavigate();

  function handleReset() {
    if (window.confirm('Reset all demo data? This restores the original sample state.')) {
      resetDemoData();
      window.location.reload();
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  const isLive = mode === 'live';

  return (
    <div className={styles.shell}>
      {/* ── Top nav bar ── */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <NavLink to="/workspace" className={styles.wordmark}>
            <span className={styles.wordmarkIcon}>🧭</span>
            <span>ScopePilot</span>
          </NavLink>
          <span
            className={styles.demoPill}
            style={{
              background: isLive ? 'rgba(34, 197, 94, 0.15)' : undefined,
              borderColor: isLive ? 'rgba(34, 197, 94, 0.4)' : undefined,
              color: isLive ? '#15803d' : undefined,
            }}
            title={isLive ? 'Connected to live Express backend API' : 'Running on local sample data'}
          >
            {isLive ? '🟢 LIVE API' : 'DEMO MODE'}
          </span>
        </div>

        <nav className={styles.topbarNav} aria-label="Primary navigation">
          <NavLink to="/workspace" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}>
            Workspace
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}>
            Projects
          </NavLink>
        </nav>

        <div className={styles.topbarRight}>
          {/* Demo role switcher - shown only in demo mode */}
          {!isLive && (
            <div className={styles.roleSwitch} title="Demo control: switch perspective">
              <span className={styles.roleSwitchLabel}>View as</span>
              <select
                className={styles.roleSelect}
                value={session?.id ?? ''}
                onChange={(e) => switchRole(e.target.value)}
                aria-label="Switch demo role"
              >
                {DEMO_USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset only for demo */}
          {!isLive && (
            <button className={styles.resetBtn} onClick={handleReset} title="Reset demo data">
              ↺ Reset
            </button>
          )}

          {/* User chip */}
          {session && (
            <div className={styles.userChip}>
              <Avatar initials={session.avatar} size="sm" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className={styles.userName}>{session.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{session.role}</span>
              </div>
              <button className={styles.logoutBtn} onClick={handleLogout} aria-label="Log out" title="Log out">
                ↗
              </button>
            </div>
          )}
        </div>
      </header>

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
