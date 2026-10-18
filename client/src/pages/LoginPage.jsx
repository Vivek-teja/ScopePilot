import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import { DEMO_USERS } from '../mocks/fixtures.js';
import styles from './LoginPage.module.css';

const SEEDED_ACCOUNTS = [
  { role: 'freelancer', email: 'freelancer@scopepilot.dev', password: 'password123', label: 'Alex Freelancer', avatar: 'AF' },
  { role: 'client', email: 'client@scopepilot.dev', password: 'password123', label: 'Sarah Client', avatar: 'SC' },
  { role: 'admin', email: 'admin@scopepilot.dev', password: 'password123', label: 'ScopePilot Admin', avatar: 'SA' },
];

export default function LoginPage() {
  const { login, loginWithCredentials, registerWithCredentials } = useDemoSession();
  const navigate = useNavigate();

  const [authTab, setAuthTab] = useState('live'); // 'live' | 'demo'
  const [isRegister, setIsRegister] = useState(false);

  // Live credentials state
  const [email, setEmail] = useState('freelancer@scopepilot.dev');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [role, setRole] = useState('freelancer');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Demo perspective state
  const [selectedDemoUser, setSelectedDemoUser] = useState(DEMO_USERS[0].id);

  async function handleLiveSubmit(e) {
    if (e) e.preventDefault();
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

  function handleQuickFill(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
    setIsRegister(false);
    setErrorMessage(null);
  }

  function handleEnterDemo() {
    login(selectedDemoUser);
    navigate('/workspace');
  }

  return (
    <div className={styles.page}>
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />

      <div className={styles.card}>
        <div className={styles.logoRow}>
          <span className={styles.logoIcon}>🧭</span>
          <span className={styles.logoText}>ScopePilot</span>
        </div>

        <h1 className={styles.headline}>Freelance scope &amp; change management</h1>
        <p className={styles.sub}>
          Review approved scope, track milestones, and manage change requests — all in one place.
        </p>

        {/* Tab switch between Live API and Demo Mode */}
        <div className={styles.tabHeader} role="tablist">
          <button
            type="button"
            className={`${styles.tabBtn} ${authTab === 'live' ? styles.tabBtnActive : ''}`}
            onClick={() => { setAuthTab('live'); setErrorMessage(null); }}
          >
            🔌 Live Backend API
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${authTab === 'demo' ? styles.tabBtnActive : ''}`}
            onClick={() => { setAuthTab('demo'); setErrorMessage(null); }}
          >
            📦 Demo / Fixtures
          </button>
        </div>

        {authTab === 'live' && (
          <div className={styles.liveSection}>
            <div className={styles.quickAccounts}>
              <span className={styles.quickLabel}>Quick-select seeded database account:</span>
              <div className={styles.quickBtnGroup}>
                {SEEDED_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    className={`${styles.quickBtn} ${email === acc.email ? styles.quickBtnActive : ''}`}
                    onClick={() => handleQuickFill(acc)}
                  >
                    <span className={styles.quickRoleBadge}>{acc.role}</span>
                    <span>{acc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleLiveSubmit} className={styles.form}>
              {errorMessage && (
                <div className={styles.errorBox} role="alert">
                  ⚠️ {errorMessage}
                </div>
              )}

              {isRegister && (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="reg-name">Full Name</label>
                    <input
                      id="reg-name"
                      type="text"
                      className={styles.textInput}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Developer"
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="reg-role">Account Role</label>
                    <select
                      id="reg-role"
                      className={styles.textInput}
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

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="auth-email">Email Address</label>
                <input
                  id="auth-email"
                  type="email"
                  className={styles.textInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  className={styles.textInput}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className={styles.enterBtn}
                disabled={loading}
              >
                {loading
                  ? (isRegister ? 'Creating Account…' : 'Signing In…')
                  : (isRegister ? 'Create Account & Sign In →' : 'Sign In with Live API →')}
              </button>

              <div className={styles.toggleRow}>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => { setIsRegister(!isRegister); setErrorMessage(null); }}
                >
                  {isRegister
                    ? 'Already have an account? Sign in here'
                    : 'Need an account? Register here'}
                </button>
              </div>
            </form>
          </div>
        )}

        {authTab === 'demo' && (
          <div className={styles.demoSection}>
            <div className={styles.demoBanner}>
              <span className={styles.demoBadge}>DEMO MODE</span>
              <p>
                Browsing with local fixtures. No live network calls will be made.
              </p>
            </div>

            <fieldset className={styles.roleGroup}>
              <legend className={styles.roleLegend}>Choose a demo perspective</legend>
              {DEMO_USERS.map((u) => (
                <label
                  key={u.id}
                  className={`${styles.roleCard} ${selectedDemoUser === u.id ? styles.roleCardSelected : ''}`}
                >
                  <input
                    type="radio"
                    name="demoRole"
                    value={u.id}
                    checked={selectedDemoUser === u.id}
                    onChange={() => setSelectedDemoUser(u.id)}
                    className={styles.radioInput}
                  />
                  <span className={styles.roleAvatar}>{u.avatar}</span>
                  <span className={styles.roleInfo}>
                    <span className={styles.roleName}>{u.name}</span>
                    <span className={styles.roleTag}>{u.role}</span>
                  </span>
                  {selectedDemoUser === u.id && <span className={styles.roleCheck} aria-hidden="true">✓</span>}
                </label>
              ))}
            </fieldset>

            <button
              type="button"
              className={styles.enterBtn}
              onClick={handleEnterDemo}
            >
              Enter Demo Mode →
            </button>
          </div>
        )}

        <p className={styles.disclaimer}>
          ScopePilot connects to Express backend running at <code>{import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}</code>.
        </p>
      </div>
    </div>
  );
}
