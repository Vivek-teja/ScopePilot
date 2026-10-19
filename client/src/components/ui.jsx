/**
 * ScopePilot – shared UI components
 * High-contrast cyber-geometric aesthetic
 * Large legible typography, wide diamond badges, circular progress, diamond buttons
 */

import { Link } from 'react-router-dom';
import styles from './ui.module.css';

// ── Badge Variants Mapping (Ref design.txt lines 32 & 48) ────────────────────
// Active / In Progress: Lighter purple (than usual), Black text
// Paused / Pending / Under Review: White, Black text
// Completed / Accepted / Approved: Black with white outline, White text

const BADGE_VARIANTS = {
  active:       'active',       // Lighter purple
  in_progress:  'in_progress',  // Lighter purple
  paused:       'paused',       // White
  pending:      'pending',      // White
  under_review: 'pending',      // White
  completed:    'completed',    // Black (white outline)
  accepted:     'accepted',     // Black (white outline)
  approved:     'approved',     // Black (white outline)
  archived:     'completed',    // Black (white outline)
  draft:        'completed',
  planned:      'completed',
  withdrawn:    'completed',
  rejected:     'red',
  blocked:      'red',
};

export function Badge({ status, label, variant }) {
  const v = variant ?? BADGE_VARIANTS[status] ?? 'completed';
  const text = label ?? status?.replace(/_/g, ' ') ?? '—';
  return (
    <span className={`${styles.badge} ${styles[`badge-${v}`]}`}>
      <svg className={styles.badgeHexSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon
          points="8,1.5 92,1.5 98.5,50 92,98.5 8,98.5 1.5,50"
          className={styles.badgeHexPolygon}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className={styles.badgeContent}>
        <span className={styles.badgeDiamondGlyph}>◊</span>
        <span>{text}</span>
      </span>
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

// ── Circular Progress Gauge (Left-aligned for milestones & general) ───────────

export function CircularProgress({ value = 0, max = 100, size = 68, strokeWidth = 5, label }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={styles.circularProgressWrap}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label ?? `${pct}% complete`}
      style={{ width: size, height: size }}
    >
      <svg className={styles.circularSvg} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track circle */}
        <circle
          className={styles.circularTrack}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Active purple progress stroke */}
        <circle
          className={styles.circularIndicator}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className={styles.circularLabelWrap}>
        <span className={styles.circularPercentNum}>{pct}</span>
        <span className={styles.circularPercentSymbol}>%</span>
      </div>
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, label }) {
  return <CircularProgress value={value} max={max} label={label} />;
}

// ── Card (True Connected 8-Sided Octagonal Container) ─────────────────────────

export function Card({ children, className = '', onClick, as: Tag = 'div', to, surface = 'dark' }) {
  const surfaceClass = surface === 'grey' ? styles.cardGrey : styles.cardDark;
  const outerCls = [styles.card, onClick || to ? styles.cardClickable : ''].join(' ');
  const innerCls = [styles.cardInner, surfaceClass, className].join(' ');
  const content = (
    <div className={innerCls}>
      {children}
    </div>
  );
  if (to) {
    return <Link to={to} className={outerCls}>{content}</Link>;
  }
  return <Tag className={outerCls} onClick={onClick}>{content}</Tag>;
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

// ── Diamond Proceed Button (Ref Image 1) ──────────────────────────────────────

export function DiamondProceedButton({ onClick, disabled, loading, text = 'Proceed' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={styles.diamondBtnOuter}
      aria-label={text}
    >
      <div className={styles.diamondBoxShape}>
        <div className={styles.diamondInnerSelectionBox}>
          <span className={styles.diamondBtnText}>{loading ? '...' : text}</span>
        </div>
      </div>
    </button>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className={styles.stateContainer} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <p>{message}</p>
    </div>
  );
}

// ── Empty state (No emojis) ───────────────────────────────────────────────────

export function EmptyState({ title, message, action }) {
  return (
    <div className={styles.stateContainer}>
      <div className={styles.emptyDiamondGlyph}>◊</div>
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
      <div className={styles.errorGlyph}>[ ! ]</div>
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
      <div className={styles.emptyDiamondGlyph}>[ 404 ]</div>
      <h3>Not found</h3>
      <p className={styles.stateMessage}>{message}</p>
      <Button variant="secondary" as={Link} onClick={() => window.history.back()}>
        Go back
      </Button>
    </div>
  );
}

// ── Info notice ────────────────────────────────────────────────────────────────

export function Notice({ variant = 'info', children, style }) {
  const varMap = { info: styles.noticeInfo, warning: styles.noticeWarning, demo: styles.noticeDemo };
  return (
    <div className={`${styles.notice} ${varMap[variant] ?? styles.noticeInfo}`} style={style} role="note">
      <div className={styles.noticeDiamondIcon}>◊</div>
      <div className={styles.noticeContent}>{children}</div>
    </div>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

export function Breadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <ol className={styles.breadcrumbList}>
        {items.map((item, i) => (
          <li key={i} className={styles.breadcrumbItem}>
            {i < items.length - 1 ? (
              <>
                <Link to={item.to} className={styles.breadcrumbLink}>{item.label}</Link>
                <span aria-hidden="true" className={styles.breadcrumbSep}>/</span>
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
