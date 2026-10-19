import { useState, useCallback } from 'react';
import { fetchProjects, createProject } from '../services/scopePilotService.js';
import { useAsync } from '../hooks/useAsync.js';
import {
  Card, Badge, SectionHeader, LoadingState, ErrorState, EmptyState, Breadcrumb,
  Button, FormField, Input, Textarea, Select, Notice,
} from '../components/ui.jsx';
import styles from './ProjectsPage.module.css';

const STATUS_ORDER = { active: 0, paused: 1, completed: 2, archived: 3 };

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState('active');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchFn = useCallback(() => fetchProjects(), []);
  const { data: projects, loading, error, reload } = useAsync(fetchFn, []);

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
      await createProject({
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: newStatus,
      });
      setNewTitle('');
      setNewDescription('');
      setShowCreateForm(false);
      reload();
    } catch (err) {
      setCreateError(err.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState message="Loading projects…" />;
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

  const statuses = ['all', ...new Set(projects?.map((p) => p.status) ?? [])];

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Workspace', to: '/workspace' }, { label: 'Projects' }]} />

      <SectionHeader
        title="Projects"
        subtitle={`${filtered.length} of ${projects?.length ?? 0} project${projects?.length !== 1 ? 's' : ''}`}
        action={
          !showCreateForm && (
            <Button variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>
              + New Project ◊
            </Button>
          )
        }
      />

      {/* New Project Form */}
      {showCreateForm && (
        <Card surface="grey" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.25rem' }}>
            Create New Project
          </h3>
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
            <FormField label="INITIAL STATUS" htmlFor="proj-status">
              <Select
                id="proj-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={creating}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
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

      {/* Search & filter */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search by name, description, or tag…"
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search projects"
          />
        </div>
        <div className={styles.filterGroup} role="group" aria-label="Filter by status">
          {statuses.map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ''}`}
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="📂"
          title="No projects match your filter"
          message={search ? `No results found for "${search}".` : 'No projects found in this workspace yet.'}
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
    <Card to={`/projects/${p.id}`} className={styles.projectCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.projectName}>{p.name}</h3>
        <Badge status={p.status} />
      </div>
      <p className={styles.projectSummary}>{p.summary}</p>
      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <span className={styles.metaIcon}>📅</span>
          {p.startDate} – {p.estimatedEndDate}
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaIcon}>📄</span>
          v{p.activeProposalVersion} approved
        </span>
      </div>
      {p.tags.length > 0 && (
        <div className={styles.tagRow}>
          {p.tags.map((t) => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}
        </div>
      )}
    </Card>
  );
}
