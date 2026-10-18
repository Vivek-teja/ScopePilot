import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import {
  fetchProject,
} from '../services/scopePilotService.js';
import {
  Badge, Breadcrumb, Tabs, LoadingState, ErrorState, NotFoundState,
  Card, KVRow, KVGrid,
  Divider,
} from '../components/ui.jsx';
import styles from './ProjectDetailPage.module.css';
import ProposalTab from './tabs/ProposalTab.jsx';
import MilestonesTab from './tabs/MilestonesTab.jsx';
import ChangeRequestsTab from './tabs/ChangeRequestsTab.jsx';

const TABS = [
  { id: 'overview',   label: '📋 Overview' },
  { id: 'scope',      label: '📄 Approved Scope' },
  { id: 'milestones', label: '🏁 Milestones' },
  { id: 'changes',    label: '🔄 Change Requests' },
];

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const fetchFn = useCallback(() => fetchProject(projectId), [projectId]);
  const { data: project, loading, error } = useAsync(fetchFn, [projectId]);

  if (loading) return <LoadingState message="Loading project…" />;
  if (error?.includes('not found') || (!loading && !project))
    return <NotFoundState message={`Project "${projectId}" was not found.`} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className={styles.page}>
      <Breadcrumb
        items={[
          { label: 'Workspace', to: '/workspace' },
          { label: 'Projects', to: '/projects' },
          { label: project.name },
        ]}
      />

      {/* Project header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerMeta}>
            <h1 className={styles.projectTitle}>{project.name}</h1>
            <div className={styles.badgeRow}>
              <Badge status={project.status} />
            </div>
          </div>
        </div>
        <p className={styles.summary}>{project.summary}</p>
        <div className={styles.dates}>
          <span>📅 {project.startDate} → {project.estimatedEndDate}</span>
          <span>📄 Proposal v{project.activeProposalVersion} approved</span>
          {project.tags.map((t) => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab panels */}
      <div role="tabpanel">
        {activeTab === 'overview'   && <OverviewTab project={project} onSelectTab={setActiveTab} />}
        {activeTab === 'scope'      && <ProposalTab projectId={projectId} proposalId={project.approvedProposalId} />}
        {activeTab === 'milestones' && <MilestonesTab projectId={projectId} />}
        {activeTab === 'changes'    && (
          <ChangeRequestsTab
            projectId={projectId}
            onOpenRequest={(crId) => navigate(`/projects/${projectId}/changes/${crId}`)}
          />
        )}
      </div>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ project, onSelectTab }) {
  return (
    <div className={styles.overviewGrid}>
      <Card className={styles.overviewCard}>
        <h3>Project Details</h3>
        <Divider />
        <KVGrid>
          <KVRow label="ID" value={project.id} mono />
          <KVRow label="Status" value={<Badge status={project.status} />} />
          <KVRow label="Start date" value={project.startDate} />
          <KVRow label="Est. end date" value={project.estimatedEndDate} />
          <KVRow label="Approved proposal" value={`v${project.activeProposalVersion}`} />
          <KVRow label="Tags" value={project.tags.join(', ')} />
        </KVGrid>
      </Card>

      <Card className={styles.overviewCard}>
        <h3>Quick Navigation</h3>
        <Divider />
        <p className={styles.overviewHint}>Use the tabs above to navigate between sections.</p>
        <div className={styles.quickLinks}>
          <QuickLink icon="📄" label="View approved scope" desc="See agreed deliverables, price, and revisions" onClick={() => onSelectTab?.('scope')} />
          <QuickLink icon="🏁" label="Milestones & deliverables" desc="Track progress and evidence links" onClick={() => onSelectTab?.('milestones')} />
          <QuickLink icon="🔄" label="Change requests" desc="Review, create, and track scope changes" onClick={() => onSelectTab?.('changes')} />
        </div>
      </Card>
    </div>
  );
}

function QuickLink({ icon, label, desc, onClick }) {
  return (
    <div className={styles.quickLink} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}>
      <span className={styles.quickLinkIcon}>{icon}</span>
      <div>
        <div className={styles.quickLinkLabel}>{label}</div>
        <div className={styles.quickLinkDesc}>{desc}</div>
      </div>
    </div>
  );
}
