import { NavLink, useNavigate } from 'react-router-dom';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import { DEMO_USERS } from '../mocks/fixtures.js';
import { resetDemoData } from '../services/scopePilotService.js';
import { Avatar } from './ui.jsx';
import styles from './AppShell.module.css';

export default function AppShell({ children }) {
  const { session, switchRole, logout } = useDemoSession();
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

  return (
    <div className={styles.shell}>
      {/* ── Top nav bar ── */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <NavLink to="/workspace" className={styles.wordmark}>
            <span className={styles.wordmarkIcon}>🧭</span>
            <span>ScopePilot</span>
          </NavLink>
          <span className={styles.demoPill} title="Running on local sample data — no backend connected">
            DEMO
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
          {/* Demo role switcher */}
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

          {/* Reset */}
          <button className={styles.resetBtn} onClick={handleReset} title="Reset demo data">
            ↺ Reset
          </button>

          {/* User chip */}
          {session && (
            <div className={styles.userChip}>
              <Avatar initials={session.avatar} size="sm" />
              <span className={styles.userName}>{session.name}</span>
              <button className={styles.logoutBtn} onClick={handleLogout} aria-label="Log out">
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
        <span>ScopePilot — Part 1 Demo &nbsp;·&nbsp; Local sample data only, no backend connected</span>
      </footer>
    </div>
  );
}
