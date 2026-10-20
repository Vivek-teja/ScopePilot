import { useState, useCallback } from 'react';
import { fetchProjects, createProject, fetchWorkspaceMembers } from '../services/scopePilotService.js';
import { WORKSPACE } from '../mocks/fixtures.js';
import { useAsync } from '../hooks/useAsync.js';
import {
  Card, Badge, LoadingState, ErrorState, EmptyState, Breadcrumb,
  Button, FormField, Input, Textarea, Select, Notice,
} from '../components/ui.jsx';
import styles from './ProjectsPage.module.css';

const STATUS_ORDER = { active: 0, paused: 1, completed: 2, archived: 3 };

/**
 * ProjectsPage:
 * Implements Reference Image 3 & design.txt:
 * - Persistent semi-circle nav at top (Projects active).
 * - Solid white search input box with black text (zero emojis).
 * - Status filter buttons in wide diamond / octagon shapes: All, Active, Paused, Completed.
 * - Project list in chamfered cards:
 *   - Project titles in crisp white.
 *   - Descriptive text and metadata in purple shades.
 *   - Status in wide diamond badges.
 */
export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState('active');
  const [selectedClient, setSelectedClient] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchFn = useCallback(() => fetchProjects(WORKSPACE.id), []);
  const { data: projects, loading, error, reload } = useAsync(fetchFn, []);
  const { data: members } = useAsync(fetchWorkspaceMembers, []);

  async function handleCreateProject(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError('Project title is required.');
      return;
    }
    if (newTitle.trim().length < 2) {
      setCreateError('Project title must be at least 2 characters.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const payload = {
        workspaceId: WORKSPACE.id,
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: newStatus,
      };
      if (selectedClient) {
        payload.clientId = selectedClient;
      }
      await createProject(payload);
      setNewTitle('');
      setNewDescription('');
      setSelectedClient('');
      setShowCreateForm(false);
      reload();
    } catch (err) {
      setCreateError(err.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState message="Loading projects..." />;
  if (error)   return <ErrorState message={error} onRetry={reload} />;

  const filtered = (projects ?? [])
    .filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q));
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));

  const filterOptions = ['all', 'active', 'paused', 'completed'];

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Workspace', to: '/workspace' }, { label: 'Projects' }]} />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <h1 className={styles.pageTitle}>Projects</h1>
          <span className={styles.projectCountBadge}>
            [ {filtered.length} of {projects?.length ?? 0} ]
          </span>
        </div>
        {!showCreateForm && (
          <Button variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>
            + New Project ◊
          </Button>
        )}
      </div>

      {/* New Project Inline Expandable Cyber-Geometric Card */}
      {showCreateForm && (
        <Card surface="grey" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-white)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>
              Create New Project
            </h3>
            <span style={{ color: 'var(--purple-light)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              [ NEW PROJECT ◊ ]
            </span>
          </div>
          {createError && <Notice variant="warning">{createError}</Notice>}
          <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FormField label="PROJECT TITLE" htmlFor="proj-title" required>
              <Input
                id="proj-title"
                placeholder="e.g. Mobile App Redesign"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={creating}
              />
            </FormField>
            <FormField label="DESCRIPTION & SCOPE SUMMARY" htmlFor="proj-desc">
              <Textarea
                id="proj-desc"
                placeholder="Briefly describe the project deliverables and scope..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={creating}
                rows={3}
              />
            </FormField>
            <FormField label="CLIENT (PROJECT SPONSOR)" htmlFor="proj-client">
              <Select
                id="proj-client"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                disabled={creating}
              >
                <option value="">— Unassigned (Or Select Workspace Member) —</option>
                {members?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} [{m.role}] {m.email ? `(${m.email})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="INITIAL STATUS" htmlFor="proj-status">
              <Select
                id="proj-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={creating}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </Select>
            </FormField>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button type="submit" variant="primary" loading={creating}>
                {creating ? 'Creating...' : 'Create Project ◊'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)} disabled={creating}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search & Filter Toolbar (Ref Image 3) */}
      <div className={styles.toolbar}>
        {/* Solid white search box with black text */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by name, tags, or description..."
            className={styles.whiteSearchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search projects"
          />
        </div>

        {/* Wide diamond / octagonal filter buttons */}
        <div className={styles.filterGroup} role="group" aria-label="Filter projects by status">
          {filterOptions.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.filterDiamondBtn} ${statusFilter === s ? styles.filterActive : ''} ${styles[`filter_${s}`]}`}
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
            >
              <svg className={styles.filterHexSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polygon
                  points="8,1.5 92,1.5 98.5,50 92,98.5 8,98.5 1.5,50"
                  className={styles.filterHexPolygon}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span className={styles.filterBtnText}>{s.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No projects match your filter"
          message={search ? `No results found for "${search}".` : 'No projects found in this view.'}
          action={
            !showCreateForm && (
              <Button variant="primary" onClick={() => setShowCreateForm(true)}>
                + Create First Project ◊
              </Button>
            )
          }
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p }) {
  return (
    <Card to={`/projects/${p.id}`} className={styles.projectOctCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.projectName}>{p.name}</h3>
        <Badge status={p.status} />
      </div>

      <p className={styles.projectSummary}>{p.summary}</p>

      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>TIMELINE:</span> {p.startDate} - {p.estimatedEndDate}
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>SCOPE:</span> Proposal v{p.activeProposalVersion} approved
        </span>
      </div>

      {p.tags.length > 0 && (
        <div className={styles.tagRow}>
          {p.tags.map((t) => (
            <span key={t} className={styles.tagPill}>
              #{t}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
