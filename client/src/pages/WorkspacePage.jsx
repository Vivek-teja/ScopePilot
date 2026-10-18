import { Link } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import { fetchWorkspace, fetchWorkspaceMembers } from '../services/scopePilotService.js';
import { Avatar, Badge, Card, LoadingState, ErrorState, Notice, Button } from '../components/ui.jsx';
import styles from './WorkspacePage.module.css';

/**
 * WorkspacePage:
 * Implements Reference Image 2 & design.txt:
 * - Title "Taran Creative Studios"
 * - Section "Workspace members <4>" with purple underline and diamond-bracket count.
 * - Octagonal chamfered member cards with lighter grey interior (#1a1a24), avatar initial ("TT"), name, and role.
 * - Large chamfered "Your Access" container at the bottom.
 */
export default function WorkspacePage() {
  const { session, mode } = useDemoSession();
  const { data: workspace, loading: wsLoading, error: wsError, reload: wsReload } = useAsync(fetchWorkspace, []);
  const { data: members, loading: memLoading } = useAsync(fetchWorkspaceMembers, []);

  if (wsLoading) return <LoadingState message="Loading workspace..." />;
  if (wsError)   return <ErrorState message={wsError} onRetry={wsReload} />;

  const memberCount = members?.length ?? 4;
  const isLive = mode === 'live';

  return (
    <div className={styles.page}>
      <Notice variant={isLive ? 'info' : 'demo'}>
        {isLive
          ? 'LIVE WORKSPACE // Authenticated session connected to ScopePilot API'
          : 'DEMO WORKSPACE // Local sample data only // No backend connected'}
      </Notice>

      {/* Workspace Header Title */}
      <div className={styles.workspaceHeaderBlock}>
        <h1 className={styles.workspaceMainTitle}>{workspace.name}</h1>
        <p className={styles.workspaceDesc}>{workspace.description}</p>
        <div className={styles.workspaceMetaRow}>
          <span className={styles.metaChip}>
            SLUG: <code className={styles.slugCode}>{workspace.slug}</code>
          </span>
          <span className={styles.metaChip}>
            CREATED: {workspace.createdAt}
          </span>
          <Button as={Link} to="/projects" variant="primary" size="sm" className={styles.viewProjectsBtn}>
            View Projects ◊
          </Button>
        </div>
      </div>

      {/* Section: Workspace members <4> */}
      <section className={styles.membersSection}>
        <div className={styles.membersHeaderLine}>
          <h2 className={styles.membersTitle}>
            Workspace members <span className={styles.diamondCount}>&lt;{memberCount}&gt;</span>
          </h2>
          <div className={styles.purpleUnderline} />
        </div>

        {memLoading ? (
          <LoadingState message="Loading members..." />
        ) : (
          <div className={styles.memberGrid}>
            {members?.map((m) => (
              <Card key={m.id} className={styles.memberOctCard} surface="grey">
                <div className={styles.memberCardContent}>
                  <Avatar initials={m.avatar} size="md" />
                  <div className={styles.memberInfo}>
                    <div className={styles.memberNameRow}>
                      <span className={styles.memberName}>{m.name}</span>
                      {session?.id === m.id && (
                        <span className={styles.youIndicator}>[ you ]</span>
                      )}
                    </div>
                    <Badge status={m.role} label={m.role} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Section: Your Access */}
      <section className={styles.accessSection}>
        <div className={styles.accessHeaderLine}>
          <h2 className={styles.accessTitle}>Your Access</h2>
          <div className={styles.purpleUnderline} />
        </div>

        <Card className={styles.accessOctCard} surface="grey">
          <div className={styles.accessGrid}>
            <div className={styles.accessItem}>
              <span className={styles.accessLabel}>SIGNED IN AS</span>
              <span className={styles.accessValue}>{session?.name ?? '—'}</span>
            </div>
            <div className={styles.accessItem}>
              <span className={styles.accessLabel}>ROLE PERSPECTIVE</span>
              <Badge status={session?.role} />
            </div>
            <div className={styles.accessItem}>
              <span className={styles.accessLabel}>WORKSPACE CONTEXT</span>
              <span className={styles.accessValue}>{workspace.name}</span>
            </div>
          </div>
          <div className={styles.accessNoticeLine}>
            <span className={styles.accessNoticeGlyph}>◊</span>
            <span className={styles.accessNoticeText}>
              In live deployment, permissions are enforced by backend authentication. Role switching is provided here as a local presentation control.
            </span>
          </div>
        </Card>
      </section>
    </div>
  );
}
