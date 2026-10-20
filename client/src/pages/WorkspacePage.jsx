import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import {
  fetchWorkspace,
  fetchWorkspaceMembers,
  createWorkspace,
  inviteWorkspaceMember,
  listUserWorkspaces,
  setActiveWorkspaceId,
} from '../services/scopePilotService.js';
import { Avatar, Badge, Card, LoadingState, ErrorState, Notice, Button, FormField, Input, Select } from '../components/ui.jsx';
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
  const { data: members, loading: memLoading, reload: memReload } = useAsync(fetchWorkspaceMembers, []);
  const { data: allWorkspaces, reload: allWsReload } = useAsync(listUserWorkspaces, []);

  const [showCreateWs, setShowCreateWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);
  const [createWsError, setCreateWsError] = useState(null);

  // Invite member state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('client');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  function handleCopyJoinLink() {
    const url = window.location.origin + '/workspace';
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  async function handleInviteMember(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError('Email address is required.');
      return;
    }
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await inviteWorkspaceMember(workspace.id, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()} with role [${inviteRole}]!`);
      setInviteEmail('');
      setTimeout(() => {
        wsReload();
        memReload();
        allWsReload();
      }, 1000);
    } catch (err) {
      setInviteError(err.message || 'Failed to send workspace invitation.');
    } finally {
      setInviting(false);
    }
  }

  async function handleCreateWorkspace(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!wsName.trim()) {
      setCreateWsError('Workspace name is required (min 2 characters).');
      return;
    }
    if (wsName.trim().length < 2) {
      setCreateWsError('Workspace name must be at least 2 characters.');
      return;
    }
    setCreatingWs(true);
    setCreateWsError(null);
    try {
      await createWorkspace({ name: wsName.trim() });
      setWsName('');
      setShowCreateWs(false);
      wsReload();
    } catch (err) {
      setCreateWsError(err.message || 'Failed to create workspace.');
    } finally {
      setCreatingWs(false);
    }
  }

  if (wsLoading) return <LoadingState message="Loading workspace..." />;
  if (wsError)   return <ErrorState message={wsError} onRetry={wsReload} />;

  const memberCount = members?.length ?? 4;
  const isLive = mode === 'live';

  if (!workspace) {
    return (
      <div className={styles.page}>
        <Notice variant={isLive ? 'info' : 'demo'}>
          {isLive
            ? 'LIVE WORKSPACE // Authenticated session connected to ScopePilot API'
            : 'DEMO WORKSPACE // Local sample data only // No backend connected'}
        </Notice>
        <div className={styles.workspaceHeaderBlock}>
          <h1 className={styles.workspaceMainTitle}>Welcome to ScopePilot</h1>
          <p className={styles.workspaceDesc}>
            You have successfully signed in. Create or connect to a workspace to begin managing projects.
          </p>
        </div>
        {!showCreateWs ? (
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <Button variant="primary" size="md" onClick={() => setShowCreateWs(true)}>
              + Create Workspace ◊
            </Button>
            <Button as={Link} to="/projects" variant="secondary" size="md">
              View Projects →
            </Button>
          </div>
        ) : (
          <Card surface="grey" style={{ padding: '24px', maxWidth: '500px', marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-white)', fontFamily: 'var(--font-display)' }}>
              Create New Workspace
            </h3>
            {createWsError && <Notice variant="warning">{createWsError}</Notice>}
            <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FormField label="WORKSPACE NAME" htmlFor="ws-name" required>
                <Input
                  id="ws-name"
                  placeholder="e.g. Apex Digital Lab"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  disabled={creatingWs}
                />
              </FormField>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <Button type="submit" variant="primary" loading={creatingWs}>
                  {creatingWs ? 'Creating...' : 'Create Workspace ◊'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreateWs(false)} disabled={creatingWs}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    );
  }

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
          {!showCreateWs && (
            <Button variant="secondary" size="sm" onClick={() => setShowCreateWs(true)}>
              + New Workspace ◊
            </Button>
          )}
          {allWorkspaces && allWorkspaces.length > 1 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>WORKSPACE:</span>
              <Select
                style={{ width: 'auto', minWidth: '180px', padding: '4px 8px', fontSize: '0.85rem' }}
                value={workspace.id}
                onChange={(e) => {
                  setActiveWorkspaceId(e.target.value);
                  wsReload();
                  memReload();
                }}
              >
                {allWorkspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.owner?.toString() === session?.id ? '(Owner)' : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </div>

      {showCreateWs && (
        <Card surface="grey" style={{ padding: '24px', maxWidth: '500px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-white)', fontFamily: 'var(--font-display)' }}>
            Create New Workspace
          </h3>
          {createWsError && <Notice variant="warning">{createWsError}</Notice>}
          <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FormField label="WORKSPACE NAME" htmlFor="ws-name-active" required>
              <Input
                id="ws-name-active"
                placeholder="e.g. Apex Digital Lab"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                disabled={creatingWs}
              />
            </FormField>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button type="submit" variant="primary" loading={creatingWs}>
                {creatingWs ? 'Creating...' : 'Create Workspace ◊'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreateWs(false)} disabled={creatingWs}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Section: Workspace members <4> */}
      <section className={styles.membersSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div className={styles.membersHeaderLine} style={{ flex: 1, margin: 0 }}>
            <h2 className={styles.membersTitle}>
              Workspace members <span className={styles.diamondCount}>&lt;{memberCount}&gt;</span>
            </h2>
            <div className={styles.purpleUnderline} />
          </div>
          {!showInvite && (
            <Button variant="secondary" size="sm" onClick={() => setShowInvite(true)}>
              + Invite Member / Client ◊
            </Button>
          )}
        </div>

        {/* Invite Member Inline Form */}
        {showInvite && (
          <Card surface="grey" style={{ padding: '20px', maxWidth: '550px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-white)', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
              Invite Client or Collaborator
            </h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Enter a real email address. If they already have an account, they are linked immediately. Otherwise, an invitation awaits their first sign-in.
            </p>
            {inviteError && <Notice variant="warning">{inviteError}</Notice>}
            {inviteSuccess && <Notice variant="info">{inviteSuccess}</Notice>}
            <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FormField label="EMAIL ADDRESS" htmlFor="invite-email" required>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="e.g. client@acmecorp.com or partner@agency.dev"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviting}
                />
              </FormField>
              <FormField label="WORKSPACE ROLE" htmlFor="invite-role" required>
                <Select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  disabled={inviting}
                >
                  <option value="client">Client (Project Reviewer & Scope Approver)</option>
                  <option value="member">Member (Freelancer / Collaborator)</option>
                  <option value="admin">Workspace Admin</option>
                </Select>
              </FormField>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <Button type="submit" variant="primary" loading={inviting}>
                  {inviting ? 'Verifying & Inviting...' : 'Send Invitation ◊'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setShowInvite(false); setInviteError(null); setInviteSuccess(null); }} disabled={inviting}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

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

        {/* Pending & Sent Invitations List */}
        {workspace?.invitations?.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Pending & Sent Invitations ({workspace.invitations.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {workspace.invitations.map((inv, idx) => (
                <div
                  key={inv.id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--surface-subtle, #1a1a24)',
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle, #2a2a38)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--purple-light)' }}>✉</span>
                    <strong style={{ color: 'var(--text-white)', fontSize: '0.9rem' }}>{inv.email}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      [Role: <strong style={{ color: 'var(--purple-light)' }}>{inv.role}</strong>]
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge
                      status={inv.status === 'accepted' ? 'completed' : 'pending'}
                      label={inv.status === 'accepted' ? 'Accepted' : 'Pending Sign-In'}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyJoinLink}
                      style={{ fontSize: '0.75rem', padding: '2px 8px', color: 'var(--purple-light)' }}
                      title="Copy workspace link to send directly to this person"
                    >
                      {copiedLink ? '✓ Copied!' : '🔗 Copy Link'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              ℹ <strong>How it works:</strong> ScopePilot uses in-app account linking (no external email is sent to their Gmail). Once the invited user signs up or logs into ScopePilot with their email, they will automatically be joined to this workspace! You can also click <em>"Copy Link"</em> above to send them the direct link.
            </p>
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
