import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import { DEMO_USERS } from '../mocks/fixtures.js';
import { DiamondProceedButton } from '../components/ui.jsx';
import styles from './LoginPage.module.css';

/**
 * LoginPage:
 * Implements the exact layout from Reference Image 1 & design.txt:
 * - Central octagonal card with white border and pitch-black outer background.
 * - Corner details: dual parallel lines outside diagonal edges, outer wireframe triangles with inner filled purple triangle gems.
 * - Title "Login" with a distinct glowing purple dot on the "i".
 * - White rectangular Username and Password input boxes with black text.
 * - Two demo user selection boxes with white outlines.
 * - Diamond "Proceed" button with inner floating black box enclosing white text.
 */
export default function LoginPage() {
  const { login } = useDemoSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(DEMO_USERS[0].id);
  const [entering, setEntering] = useState(false);
  const [username, setUsername] = useState('taran');
  const [password, setPassword] = useState('••••••••');

  function handleEnterDemo() {
    setEntering(true);
    login(selected);
    navigate('/workspace');
  }

  return (
    <div className={styles.loginViewport}>
      {/* ── Main Octagonal Card Container ── */}
      <div className={styles.cardWrapper}>

        {/* Four Corner Accents (Parallel diagonal lines & white/pastel-purple triangle gems) */}
        <div className={`${styles.cornerAccent} ${styles.cornerTopLeft}`}>
          <div className={styles.parallelLines} />
          <svg className={styles.triangleSvg} width="28" height="28" viewBox="0 0 28 28">
            <polygon points="2,2 26,2 2,26" fill="#ffffff" stroke="#ffffff" strokeWidth="1.5" />
            <polygon points="6,6 20,6 6,20" fill="#c084fc" />
          </svg>
        </div>

        <div className={`${styles.cornerAccent} ${styles.cornerTopRight}`}>
          <div className={styles.parallelLines} />
          <svg className={styles.triangleSvg} width="28" height="28" viewBox="0 0 28 28">
            <polygon points="2,2 26,2 26,26" fill="#ffffff" stroke="#ffffff" strokeWidth="1.5" />
            <polygon points="8,6 22,6 22,20" fill="#c084fc" />
          </svg>
        </div>

        <div className={`${styles.cornerAccent} ${styles.cornerBottomLeft}`}>
          <div className={styles.parallelLines} />
          <svg className={styles.triangleSvg} width="28" height="28" viewBox="0 0 28 28">
            <polygon points="2,2 2,26 26,26" fill="#ffffff" stroke="#ffffff" strokeWidth="1.5" />
            <polygon points="6,8 6,22 20,22" fill="#c084fc" />
          </svg>
        </div>

        <div className={`${styles.cornerAccent} ${styles.cornerBottomRight}`}>
          <div className={styles.parallelLines} />
          <svg className={styles.triangleSvg} width="28" height="28" viewBox="0 0 28 28">
            <polygon points="26,2 26,26 2,26" fill="#ffffff" stroke="#ffffff" strokeWidth="1.5" />
            <polygon points="22,8 22,22 8,22" fill="#c084fc" />
          </svg>
        </div>

        {/* Central Card Box with True Connected 8-Sided Octagonal Border */}
        <div className={styles.octCard}>
          <div className={styles.octCardInner}>
            {/* Title with purple dot on 'i' */}
            <div className={styles.titleRow}>
              <span className={styles.titleLetter}>L</span>
              <span className={styles.titleLetter}>o</span>
              <span className={styles.titleLetter}>g</span>
              <span className={styles.titleIWrapper}>
                <span className={styles.purpleDot} />
                <span className={styles.titleIBody}>ı</span>
              </span>
              <span className={styles.titleLetter}>n</span>
            </div>

            <p className={styles.loginSubtitle}>
              ScopePilot // Freelance Scope &amp; Change Control
            </p>

            {/* Form Fields */}
            <div className={styles.fieldBlock}>
              <label className={styles.inputLabel} htmlFor="login-username">Username:</label>
              <input
                id="login-username"
                type="text"
                className={styles.whiteInput}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>

            <div className={styles.fieldBlock}>
              <label className={styles.inputLabel} htmlFor="login-password">Password:</label>
              <input
                id="login-password"
                type="password"
                className={styles.whiteInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>

            {/* Demo User Selection Boxes */}
            <div className={styles.demoSelectionSection}>
              <span className={styles.demoSelectionTitle}>Demo Persona:</span>
              <div className={styles.demoBoxGroup}>
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={`${styles.demoBox} ${selected === u.id ? styles.demoBoxActive : ''}`}
                    onClick={() => setSelected(u.id)}
                  >
                    <span className={styles.demoBoxName}>{u.name}</span>
                    <span className={styles.demoBoxRole}>[ {u.role} ]</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Diamond Proceed Button */}
            <div className={styles.buttonContainer}>
              <DiamondProceedButton
                onClick={handleEnterDemo}
                loading={entering}
                text="Proceed"
              />
            </div>

            <p className={styles.disclaimerNote}>
              Local sample data mode // No backend credentials required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
