import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { useProjectTabs } from '../hooks/ProjectTabsContext.jsx';
import { fetchProject } from '../services/scopePilotService.js';
import {
  Badge, Breadcrumb, LoadingState, ErrorState, NotFoundState,
  Card, KVRow, KVGrid, Divider,
} from '../components/ui.jsx';
import styles from './ProjectDetailPage.module.css';
import ProposalTab from './tabs/ProposalTab.jsx';
import MilestonesTab from './tabs/MilestonesTab.jsx';
import ChangeRequestsTab from './tabs/ChangeRequestsTab.jsx';

/**
 * ProjectDetailPage:
 * Implements Reference Image 4 & design.txt:
 * - Persistent semi-circle arch with outer 4-segment concentric arc: Overview, Approved Scope, Milestones, Change Requests.
 * - In-page "Quick Navigation" box is completely removed (now driven by arch nav).
 * - Project details card is an octagonal chamfered box with grey interior.
 */
export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { activeTab, setIsProjectDetail } = useProjectTabs();

  // Enable the 4-segment concentric outer arc in TopArchNav
  useEffect(() => {
    setIsProjectDetail(true);
    return () => setIsProjectDetail(false);
  }, [setIsProjectDetail]);

  const fetchFn = useCallback(() => fetchProject(projectId), [projectId]);
  const { data: project, loading, error } = useAsync(fetchFn, [projectId]);

  if (loading) return <LoadingState message="Loading project..." />;
  if (error?.includes('not found'))
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

      {/* Project Header Overview */}
      <div className={styles.headerBlock}>
        <div className={styles.headerTop}>
          <h1 className={styles.projectTitle}>{project.name}</h1>
          <Badge status={project.status} />
        </div>
        <p className={styles.summary}>{project.summary}</p>
        <div className={styles.metaLine}>
          <span>TIMELINE: {project.startDate} - {project.estimatedEndDate}</span>
          <span>APPROVED: Proposal v{project.activeProposalVersion}</span>
          {project.tags.map((t) => (
            <span key={t} className={styles.tagPill}>#{t}</span>
          ))}
        </div>
      </div>

      {/* Active Tab Content Panel */}
      <div role="tabpanel" className={styles.tabContentPanel}>
        {activeTab === 'overview' && <OverviewTab project={project} />}
        {activeTab === 'scope' && (
          <ProposalTab projectId={projectId} proposalId={project.approvedProposalId} />
        )}
        {activeTab === 'milestones' && <MilestonesTab projectId={projectId} />}
        {activeTab === 'changes' && (
          <ChangeRequestsTab
            projectId={projectId}
            onOpenRequest={(crId) => navigate(`/projects/${projectId}/changes/${crId}`)}
          />
        )}
      </div>
    </div>
  );
}

// ── Overview Tab (Project Details inside chamfered card with grey interior) ──
function OverviewTab({ project }) {
  return (
    <div className={styles.overviewContainer}>
      <Card className={styles.projectDetailsOctCard} surface="grey">
        <div className={styles.cardTitleLine}>
          <h2 className={styles.cardTitle}>Project Details</h2>
          <span className={styles.cardIdBadge}>[ {project.id} ]</span>
        </div>
        <Divider />
        <KVGrid>
          <KVRow label="STATUS" value={<Badge status={project.status} />} />
          <KVRow label="START DATE" value={project.startDate} />
          <KVRow label="EST. END DATE" value={project.estimatedEndDate} />
          <KVRow label="PROPOSAL" value={`v${project.activeProposalVersion} (Approved)`} />
          <KVRow label="CLIENT ID" value={project.clientId} mono />
          <KVRow label="FREELANCER" value={project.freelancerId} mono />
          <KVRow label="TAGS" value={project.tags.join(', ')} />
        </KVGrid>
      </Card>
    </div>
  );
}
