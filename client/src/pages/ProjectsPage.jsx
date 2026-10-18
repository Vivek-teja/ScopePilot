import { useState, useCallback } from 'react';
import { fetchProjects } from '../services/scopePilotService.js';
import { WORKSPACE } from '../mocks/fixtures.js';
import { useAsync } from '../hooks/useAsync.js';
import {
  Card, Badge, LoadingState, ErrorState, EmptyState, Breadcrumb,
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

  const fetchFn = useCallback(() => fetchProjects(WORKSPACE.id), []);
  const { data: projects, loading, error, reload } = useAsync(fetchFn, []);

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
        <h1 className={styles.pageTitle}>Projects</h1>
        <span className={styles.projectCountBadge}>
          [ {filtered.length} of {projects?.length ?? 0} ]
        </span>
      </div>

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
