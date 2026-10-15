import { useState, useCallback } from 'react';
import { fetchProjects } from '../services/scopePilotService.js';
import { WORKSPACE } from '../mocks/fixtures.js';
import { useAsync } from '../hooks/useAsync.js';
import {
  Card, Badge, SectionHeader, LoadingState, ErrorState, EmptyState, Breadcrumb,
} from '../components/ui.jsx';
import styles from './ProjectsPage.module.css';

const STATUS_ORDER = { active: 0, paused: 1, completed: 2, archived: 3 };

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchFn = useCallback(() => fetchProjects(WORKSPACE.id), []);
  const { data: projects, loading, error, reload } = useAsync(fetchFn, []);

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
      />

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
          title="No projects found"
          message={search ? `No projects match "${search}".` : 'No projects in this workspace yet.'}
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
