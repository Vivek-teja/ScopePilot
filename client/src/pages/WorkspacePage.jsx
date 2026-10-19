import { } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import { fetchWorkspace, fetchWorkspaceMembers } from '../services/scopePilotService.js';
import { Avatar, Badge, Card, LoadingState, ErrorState, Notice, SectionHeader, Button } from '../components/ui.jsx';
import styles from './WorkspacePage.module.css';

export default function WorkspacePage() {
  const { session, mode } = useDemoSession();
  const { data: workspace, loading: wsLoading, error: wsError, reload: wsReload } = useAsync(fetchWorkspace, []);
  const { data: members, loading: memLoading } = useAsync(fetchWorkspaceMembers, []);

  if (wsLoading) return <LoadingState message="Loading workspace…" />;
  if (wsError)   return <ErrorState message={wsError} onRetry={wsReload} />;

  if (!workspace) {
    return (
      <div className={styles.page}>
        <Notice variant={mode === 'live' ? 'info' : 'demo'}>
          {mode === 'live'
            ? 'Connected to live backend — viewing authenticated workspace and members from the ScopePilot API.'
            : 'Demo workspace — all data is local sample data. No backend is connected.'}
        </Notice>
        <div className={styles.hero}>
          <div className={styles.heroIcon}>🏢</div>
          <div className={styles.heroText}>
            <h1 className={styles.wsName}>Welcome to ScopePilot</h1>
            <p className={styles.wsDesc}>You have successfully signed in. Connect to or create a workspace to begin managing projects.</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button as={Link} to="/projects" variant="primary" size="md">
            View Projects →
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <Notice variant={mode === 'live' ? 'info' : 'demo'}>
        {mode === 'live' ? (
          <><strong>Connected to live backend</strong> — viewing authenticated workspace and members from the ScopePilot API.</>
        ) : (
          <><strong>Demo workspace</strong> — all data is local sample data. No backend is connected.</>
        )}
      </Notice>

      {/* Workspace header */}
      <div className={styles.hero}>
        <div className={styles.heroIcon}>🏢</div>
        <div className={styles.heroText}>
          <h1 className={styles.wsName}>{workspace.name}</h1>
          <p className={styles.wsDesc}>{workspace.description}</p>
          <div className={styles.wsMeta}>
            <span className={styles.metaChip}>Slug: <code>{workspace.slug}</code></span>
            <span className={styles.metaChip}>Created: {workspace.createdAt}</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className={styles.actions}>
        <Button as={Link} to="/projects" variant="primary" size="md">
          View Projects →
        </Button>
      </div>

      {/* Members */}
      <section className={styles.section}>
        <SectionHeader title="Workspace Members" subtitle={`${members?.length ?? 0} member${members?.length !== 1 ? 's' : ''}`} />
        {memLoading ? (
          <LoadingState message="Loading members…" />
        ) : (
          <div className={styles.memberGrid}>
            {members?.map((m) => (
              <Card key={m.id} className={styles.memberCard}>
                <div className={styles.memberRow}>
                  <Avatar initials={m.avatar} size="lg" />
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>
                      {m.name}
                      {session?.id === m.id && <span className={styles.youBadge}> (you)</span>}
                    </span>
                    <Badge status={m.role} label={m.role} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Access info */}
      <section className={styles.section}>
        <SectionHeader title="Your Access" />
        <Card>
          <div className={styles.accessRow}>
            <div className={styles.accessItem}>
              <span className={styles.accessLabel}>Signed in as</span>
              <span className={styles.accessValue}>{session?.name ?? '—'}</span>
            </div>
            <div className={styles.accessItem}>
              <span className={styles.accessLabel}>Role</span>
              <Badge status={session?.role} />
            </div>
            <div className={styles.accessItem}>
              <span className={styles.accessLabel}>Workspace</span>
              <span className={styles.accessValue}>{workspace.name}</span>
            </div>
          </div>
          <Notice variant="info" style={{ marginTop: 12 }}>
            {mode === 'live'
              ? 'Role-based access controls and project tenancy are enforced server-side by the backend API.'
              : 'In the live application, access and permissions will be enforced server-side. Role behavior shown here is for demonstration only.'}
          </Notice>
        </Card>
      </section>
    </div>
  );
}
