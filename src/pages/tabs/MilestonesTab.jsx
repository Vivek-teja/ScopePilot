import { useCallback } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchMilestones, fetchDeliverables } from '../../services/scopePilotService.js';
import {
  Badge, Card, LoadingState, ErrorState, EmptyState,
  ProgressBar, Notice, Divider,
} from '../../components/ui.jsx';
import styles from './MilestonesTab.module.css';

export default function MilestonesTab({ projectId }) {
  const msFn  = useCallback(() => fetchMilestones(projectId), [projectId]);
  const delFn = useCallback(() => fetchDeliverables(projectId), [projectId]);

  const { data: milestones, loading: msLoading, error: msError, reload } = useAsync(msFn, [projectId]);
  const { data: deliverables, loading: delLoading } = useAsync(delFn, [projectId]);

  if (msLoading || delLoading) return <LoadingState message="Loading milestones…" />;
  if (msError) return <ErrorState message={msError} onRetry={reload} />;
  if (!milestones?.length) return <EmptyState icon="🏁" title="No milestones" message="No milestones defined for this project yet." />;

  const delivByMilestone = (deliverables ?? []).reduce((acc, d) => {
    (acc[d.milestoneId] = acc[d.milestoneId] || []).push(d);
    return acc;
  }, {});

  return (
    <div className={styles.container}>
      <Notice variant="info">
        Progress percentages and estimates are sample fixture values for demonstration.
        They are not calculated from actual time-tracking data.
      </Notice>

      {milestones.map((ms) => (
        <MilestoneCard
          key={ms.id}
          milestone={ms}
          deliverables={delivByMilestone[ms.id] ?? []}
        />
      ))}
    </div>
  );
}

function MilestoneCard({ milestone: ms, deliverables }) {
  return (
    <Card className={styles.msCard}>
      {/* Milestone header */}
      <div className={styles.msHeader}>
        <div className={styles.msLeft}>
          <div className={styles.msNumber}>M{ms.order}</div>
          <div>
            <h3 className={styles.msTitle}>{ms.title}</h3>
            <p className={styles.msDesc}>{ms.description}</p>
          </div>
        </div>
        <div className={styles.msRight}>
          <Badge status={ms.status} />
          <span className={styles.msDue}>Due {ms.dueDate}</span>
          {ms.completedAt && (
            <span className={styles.msCompleted}>✓ {ms.completedAt}</span>
          )}
        </div>
      </div>

      {/* Progress */}
      <ProgressBar value={ms.progressPct} label={`Milestone ${ms.order} progress`} />

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <>
          <Divider />
          <div className={styles.delivSection}>
            <h4 className={styles.delivHeading}>
              Deliverables ({deliverables.length})
            </h4>
            <div className={styles.delivGrid}>
              {deliverables.map((d) => (
                <DeliverableCard key={d.id} deliverable={d} />
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function DeliverableCard({ deliverable: d }) {
  return (
    <div className={styles.delivCard}>
      <div className={styles.delivTop}>
        <span className={styles.delivTitle}>{d.title}</span>
        <Badge status={d.status} />
      </div>
      <div className={styles.delivMeta}>
        <span>Due {d.dueDate}</span>
        {d.evidenceUrl ? (
          <a
            href={d.evidenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.evidenceLink}
            title="Evidence link (demo – not a real URL)"
          >
            🔗 Evidence
          </a>
        ) : (
          <span className={styles.noEvidence}>No evidence yet</span>
        )}
      </div>
      {d.notes && <p className={styles.delivNotes}>{d.notes}</p>}
    </div>
  );
}
