import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import { DEMO_USERS } from '../mocks/fixtures.js';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login } = useDemoSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(DEMO_USERS[0].id);
  const [entering, setEntering] = useState(false);

  function handleEnterDemo() {
    setEntering(true);
    login(selected);
    navigate('/workspace');
  }

  const selectedUser = DEMO_USERS.find((u) => u.id === selected);

  return (
    <div className={styles.page}>
      {/* Decorative background orbs */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <span className={styles.logoIcon}>🧭</span>
          <span className={styles.logoText}>ScopePilot</span>
        </div>

        <h1 className={styles.headline}>Freelance scope &amp; change management</h1>
        <p className={styles.sub}>
          Review approved scope, track milestones, and manage change requests — all
          in one place.
        </p>

        {/* Demo banner */}
        <div className={styles.demoBanner}>
          <span className={styles.demoBadge}>DEMO MODE</span>
          <p>
            This is a local-only demo. No backend is connected. All data is
            sample data stored in your browser.
          </p>
        </div>

        {/* Role picker */}
        <fieldset className={styles.roleGroup}>
          <legend className={styles.roleLegend}>Choose a demo perspective</legend>
          {DEMO_USERS.map((u) => (
            <label
              key={u.id}
              className={`${styles.roleCard} ${selected === u.id ? styles.roleCardSelected : ''}`}
            >
              <input
                type="radio"
                name="demoRole"
                value={u.id}
                checked={selected === u.id}
                onChange={() => setSelected(u.id)}
                className={styles.radioInput}
              />
              <span className={styles.roleAvatar}>{u.avatar}</span>
              <span className={styles.roleInfo}>
                <span className={styles.roleName}>{u.name}</span>
                <span className={styles.roleTag}>{u.role}</span>
              </span>
              {selected === u.id && <span className={styles.roleCheck} aria-hidden="true">✓</span>}
            </label>
          ))}
        </fieldset>

        <button
          className={styles.enterBtn}
          onClick={handleEnterDemo}
          disabled={entering}
          aria-label={`Enter demo as ${selectedUser?.name}`}
        >
          {entering ? 'Entering…' : `Enter demo as ${selectedUser?.name}`} →
        </button>

        <p className={styles.disclaimer}>
          You can switch perspective at any time using the <strong>View as</strong>{' '}
          control in the top navigation. Demo data resets via the <strong>↺ Reset</strong>{' '}
          button.
        </p>
      </div>
    </div>
  );
}
