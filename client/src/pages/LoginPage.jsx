import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import { DEMO_USERS } from '../mocks/fixtures.js';
import { DiamondProceedButton } from '../components/ui.jsx';
import styles from './LoginPage.module.css';

const SEEDED_ACCOUNTS = [
  { role: 'freelancer', email: 'freelancer@scopepilot.dev', password: 'password123', demoId: 'usr-001', label: '⚡ Freelancer (Alex)' },
  { role: 'client', email: 'client@scopepilot.dev', password: 'password123', demoId: 'usr-003', label: '⚡ Client (Sarah)' },
  { role: 'admin', email: 'admin@scopepilot.dev', password: 'password123', demoId: 'usr-001', label: '⚡ Admin' },
  { role: 'freelancer', email: 'demo1@scopepilot.dev', password: 'password123', demoId: 'usr-001', label: '⚡ Demo 1' },
  { role: 'client', email: 'demo2@scopepilot.dev', password: 'password123', demoId: 'usr-003', label: '⚡ Demo 2' },
];

/**
 * LoginPage:
 * Harmonizes Taran's cyber-geometric octagonal card and DiamondProceedButton
 * with ScopePilot live JWT authentication, registration, and demo fixtures.
 */
export default function LoginPage() {
  const { login, loginWithCredentials, registerWithCredentials } = useDemoSession();
  const navigate = useNavigate();

  const [authTab, setAuthTab] = useState('live'); // 'live' | 'demo'
  const [isRegister, setIsRegister] = useState(false);

  // Live credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('freelancer');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Demo perspective state
  const [selectedDemoUser, setSelectedDemoUser] = useState(DEMO_USERS[0].id);

  async function handleLiveSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (isRegister) {
        await registerWithCredentials({ name, email, password, role });
      } else {
        await loginWithCredentials(email, password);
      }
      navigate('/workspace');
    } catch (err) {
      const msg = err.errors?.length
        ? `${err.message}: ${err.errors.map((x) => `${x.field}: ${x.message}`).join(', ')}`
        : err.message || 'Authentication failed. Please verify credentials.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleInstantDemoLogin(acc) {
    setEmail(acc.email);
    setPassword(acc.password || 'password123');
    setIsRegister(false);
    setLoading(true);
    setErrorMessage(null);

    try {
      if (authTab === 'live') {
        try {
          await loginWithCredentials(acc.email, acc.password || 'password123');
          navigate('/workspace');
          return;
        } catch {
          // If live API credentials fail, seamlessly fall back to local demo session
          login(acc.demoId || 'usr-001');
          navigate('/workspace');
          return;
        }
      } else {
        login(acc.demoId || 'usr-001');
        navigate('/workspace');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Direct login failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleDirectDemoLogin(userId) {
    setSelectedDemoUser(userId);
    login(userId);
    navigate('/workspace');
  }

  function handleEnterDemo() {
    login(selectedDemoUser);
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

            {/* Mode Switcher Tabs */}
            <div className={styles.authTabGroup} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'live'}
                className={`${styles.authTabBtn} ${authTab === 'live' ? styles.authTabBtnActive : ''}`}
                onClick={() => { setAuthTab('live'); setErrorMessage(null); }}
              >
                [ 🟢 LIVE API ]
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'demo'}
                className={`${styles.authTabBtn} ${authTab === 'demo' ? styles.authTabBtnActive : ''}`}
                onClick={() => { setAuthTab('demo'); setErrorMessage(null); }}
              >
                [ 📦 DEMO PERSPECTIVE ]
              </button>
            </div>

            {authTab === 'live' ? (
              <form onSubmit={handleLiveSubmit} className={styles.fieldBlock}>
                {/* 1-Click Instant Demo Login Buttons */}
                <div className={styles.quickAccountsRow}>
                  <span className={styles.quickLabel}>1-CLICK INSTANT DEMO LOGIN (NO PASSWORD NEEDED):</span>
                  <div className={styles.quickBtnGroup}>
                    {SEEDED_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.email}
                        type="button"
                        className={`${styles.quickBtn} ${email === acc.email ? styles.quickBtnActive : ''}`}
                        onClick={() => handleInstantDemoLogin(acc)}
                        title={`Click to log in immediately as ${acc.label}`}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {errorMessage && (
                  <div className={styles.errorBox} role="alert">
                    [ ! ] {errorMessage}
                  </div>
                )}

                {isRegister && (
                  <>
                    <div className={styles.fieldBlock}>
                      <label className={styles.inputLabel} htmlFor="reg-name">FULL NAME:</label>
                      <input
                        id="reg-name"
                        type="text"
                        className={styles.whiteInput}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Developer"
                        required
                      />
                    </div>
                    <div className={styles.fieldBlock}>
                      <label className={styles.inputLabel} htmlFor="reg-role">ACCOUNT ROLE:</label>
                      <select
                        id="reg-role"
                        className={styles.whiteSelect}
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="freelancer">Freelancer</option>
                        <option value="client">Client</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </>
                )}

                <div className={styles.fieldBlock}>
                  <label className={styles.inputLabel} htmlFor="auth-email">EMAIL ADDRESS:</label>
                  <input
                    id="auth-email"
                    type="email"
                    className={styles.whiteInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>

                <div className={styles.fieldBlock}>
                  <label className={styles.inputLabel} htmlFor="auth-password">PASSWORD:</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      className={styles.passwordInput}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className={styles.showPasswordBtn}
                      onClick={() => setShowPassword((prev) => !prev)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'HIDE ◊' : 'SHOW ◊'}
                    </button>
                  </div>
                </div>

                {/* Diamond Proceed Button */}
                <div className={styles.buttonContainer}>
                  <DiamondProceedButton
                    onClick={handleLiveSubmit}
                    loading={loading}
                    text={isRegister ? 'Register' : 'Sign In'}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => { setIsRegister(!isRegister); setErrorMessage(null); }}
                  >
                    {isRegister
                      ? 'Already have an account? Sign in here ◊'
                      : 'Need an account? Register new account ◊'}
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.fieldBlock}>
                {/* Demo User Selection Boxes */}
                <div className={styles.demoSelectionSection}>
                  <span className={styles.demoSelectionTitle}>CLICK ANY DEMO PERSONA TO ENTER INSTANTLY:</span>
                  <div className={styles.demoBoxGroup}>
                    {DEMO_USERS.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className={`${styles.demoBox} ${selectedDemoUser === u.id ? styles.demoBoxActive : ''}`}
                        onClick={() => handleDirectDemoLogin(u.id)}
                        title={`Click to enter workspace directly as ${u.name}`}
                      >
                        <span className={styles.demoBoxName}>⚡ {u.name}</span>
                        <span className={styles.demoBoxRole}>[ {u.role} ]</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diamond Proceed Button */}
                <div className={styles.buttonContainer}>
                  <DiamondProceedButton
                    onClick={handleEnterDemo}
                    loading={loading}
                    text="Enter Demo"
                  />
                </div>
              </div>
            )}

            <p className={styles.disclaimerNote}>
              {authTab === 'live'
                ? `Live API connected at ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}`
                : 'Local sample data mode // No backend credentials required'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
