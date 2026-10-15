/**
 * ScopePilot – shared UI components
 *
 * All components are pure presentational; they receive data via props
 * and have no direct dependency on the service or mock layers.
 */

import { Link } from 'react-router-dom';
import styles from './ui.module.css';

// ── Badge ─────────────────────────────────────────────────────────────────────

const BADGE_VARIANTS = {
  // all status values across project/proposal/deliverable/change-request
  active:       'green',
  completed:    'blue',
  paused:       'yellow',
  archived:     'gray',
  approved:     'green',
  superseded:   'gray',
  rejected:     'red',
  draft:        'gray',
  pending:      'yellow',
  accepted:     'green',
  submitted:    'blue',
  in_progress:  'yellow',
  blocked:      'red',
  planned:      'gray',
  under_review: 'yellow',
  withdrawn:    'gray',
};

export function Badge({ status, label, variant }) {
  const v = variant ?? BADGE_VARIANTS[status] ?? 'gray';
  const text = label ?? status?.replace(/_/g, ' ') ?? '—';
  return (
    <span className={`${styles.badge} ${styles[`badge-${v}`]}`}>
      {text}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

export function Avatar({ initials, size = 'md' }) {
  return (
    <span className={`${styles.avatar} ${styles[`avatar-${size}`]}`} aria-hidden="true">
      {initials}
    </span>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

export function ProgressBar({ value = 0, max = 100, label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={styles.progressWrap}>
      <div
        className={styles.progressBar}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? `${Math.round(pct)}% complete`}
      >
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.progressLabel}>{Math.round(pct)}%</span>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ children, className = '', onClick, as: Tag = 'div', to }) {
  const cls = [styles.card, onClick || to ? styles.cardClickable : '', className].join(' ');
  if (to) {
    return <Link to={to} className={cls}>{children}</Link>;
  }
  return <Tag className={cls} onClick={onClick}>{children}</Tag>;
}

// ── Section header ────────────────────────────────────────────────────────────

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.sectionAction}>{action}</div>}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  type = 'button',
  onClick,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={[styles.btn, styles[`btn-${variant}`], styles[`btn-${size}`], className].join(' ')}
      aria-busy={loading ? 'true' : undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className={styles.stateContainer} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <p>{message}</p>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div className={styles.stateContainer}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h3>{title}</h3>
      {message && <p className={styles.stateMessage}>{message}</p>}
      {action}
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

export function ErrorState({ message, onRetry }) {
  return (
    <div className={`${styles.stateContainer} ${styles.stateError}`} role="alert">
      <div className={styles.emptyIcon}>⚠️</div>
      <h3>Something went wrong</h3>
      <p className={styles.stateMessage}>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// ── Not-found state ───────────────────────────────────────────────────────────

export function NotFoundState({ message = 'The item you requested was not found.' }) {
  return (
    <div className={styles.stateContainer} role="alert">
      <div className={styles.emptyIcon}>🔍</div>
      <h3>Not found</h3>
      <p className={styles.stateMessage}>{message}</p>
      <Button variant="secondary" as={Link} onClick={() => window.history.back()}>
        Go back
      </Button>
    </div>
  );
}

// ── Info notice ────────────────────────────────────────────────────────────────

export function Notice({ variant = 'info', children }) {
  const varMap = { info: styles.noticeInfo, warning: styles.noticeWarning, demo: styles.noticeDemo };
  return (
    <div className={`${styles.notice} ${varMap[variant] ?? styles.noticeInfo}`} role="note">
      {children}
    </div>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

export function Breadcrumb({ items }) {
  // items: [{ label, to? }]
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <ol className={styles.breadcrumbList}>
        {items.map((item, i) => (
          <li key={i} className={styles.breadcrumbItem}>
            {i < items.length - 1 ? (
              <>
                <Link to={item.to} className={styles.breadcrumbLink}>{item.label}</Link>
                <span aria-hidden="true" className={styles.breadcrumbSep}>›</span>
              </>
            ) : (
              <span aria-current="page" className={styles.breadcrumbCurrent}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

export function Tabs({ tabs, activeTab, onChange }) {
  // tabs: [{ id, label }]
  return (
    <div className={styles.tabs} role="tablist" aria-label="Section tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={activeTab === t.id}
          className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Form components ───────────────────────────────────────────────────────────

export function FormField({ label, htmlFor, error, required, hint, children }) {
  return (
    <div className={styles.formField}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden="true"> *</span>}
      </label>
      {hint && <span className={styles.hint}>{hint}</span>}
      {children}
      {error && <span className={styles.fieldError} role="alert">{error}</span>}
    </div>
  );
}

export function Input({ id, error, ...rest }) {
  return (
    <input
      id={id}
      className={`${styles.input} ${error ? styles.inputError : ''}`}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      {...rest}
    />
  );
}

export function Textarea({ id, error, rows = 4, ...rest }) {
  return (
    <textarea
      id={id}
      rows={rows}
      className={`${styles.input} ${styles.textarea} ${error ? styles.inputError : ''}`}
      aria-invalid={error ? 'true' : undefined}
      {...rest}
    />
  );
}

export function Select({ id, error, children, ...rest }) {
  return (
    <select
      id={id}
      className={`${styles.input} ${styles.select} ${error ? styles.inputError : ''}`}
      aria-invalid={error ? 'true' : undefined}
      {...rest}
    >
      {children}
    </select>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider() {
  return <hr className={styles.divider} />;
}

// ── Key-value row ─────────────────────────────────────────────────────────────

export function KVRow({ label, value, mono = false }) {
  return (
    <div className={styles.kvRow}>
      <dt className={styles.kvLabel}>{label}</dt>
      <dd className={`${styles.kvValue} ${mono ? styles.kvMono : ''}`}>
        {value ?? <span className={styles.kvEmpty}>—</span>}
      </dd>
    </div>
  );
}

export function KVGrid({ children }) {
  return <dl className={styles.kvGrid}>{children}</dl>;
}
