import { useCallback } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchMilestones, fetchDeliverables } from '../../services/scopePilotService.js';
import {
  Badge, Card, LoadingState, ErrorState, EmptyState,
  CircularProgress, Notice, Divider,
} from '../../components/ui.jsx';
import styles from './MilestonesTab.module.css';

/**
 * MilestonesTab:
 * Implements Reference Image 4 & design.txt:
 * - Milestone cards in chamfered octagon geometry with white borders.
 * - Circular radial progress gauge positioned on the left side of the card:
 *   - Circle with purple outline going around it depending on progress.
 *   - Inside is the percentage number in crisp white.
 * - To the right of the gauge: all milestone data, due dates, and deliverables.
 * - Deliverables acceptance statuses in wide diamond badges.
 */
export default function MilestonesTab({ projectId }) {
  const msFn  = useCallback(() => fetchMilestones(projectId), [projectId]);
  const delFn = useCallback(() => fetchDeliverables(projectId), [projectId]);

  const { data: milestones, loading: msLoading, error: msError, reload } = useAsync(msFn, [projectId]);
  const { data: deliverables, loading: delLoading } = useAsync(delFn, [projectId]);

  if (msLoading || delLoading) return <LoadingState message="Loading milestones..." />;
  if (msError) return <ErrorState message={msError} onRetry={reload} />;
  if (!milestones?.length) return <EmptyState title="No milestones found" message="No milestones defined for this project yet." />;

  const delivByMilestone = (deliverables ?? []).reduce((acc, d) => {
    (acc[d.milestoneId] = acc[d.milestoneId] || []).push(d);
    return acc;
  }, {});

  return (
    <div className={styles.container}>
      <Notice variant="info">
        Milestone progress indicators and effort estimates are demo fixture values.
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
    <Card className={styles.msCard} surface="grey">
      {/* Top Row: Circular Radial Progress Gauge on LEFT, data to the RIGHT (design.txt) */}
      <div className={styles.msRowLayout}>
        {/* Left Side: Circular Radial Progress */}
        <div className={styles.gaugeColumn}>
          <CircularProgress
            value={ms.progressPct}
            max={100}
            size={48}
            strokeWidth={3}
            label={`Milestone ${ms.order} progress`}
          />
          <span className={styles.msOrderTag}>[ M{ms.order} ]</span>
        </div>

        {/* Right Side: Milestone Title, Description, and Dates */}
        <div className={styles.msInfoColumn}>
          <div className={styles.msHeaderTop}>
            <div>
              <h3 className={styles.msTitle}>{ms.title}</h3>
              <p className={styles.msDesc}>{ms.description}</p>
            </div>
            <div className={styles.statusBadgeWrap}>
              <Badge status={ms.status} />
            </div>
          </div>

          <div className={styles.datesRow}>
            <span>DUE: {ms.dueDate}</span>
            {ms.completedAt && (
              <span className={styles.msCompleted}>COMPLETED: {ms.completedAt}</span>
            )}
          </div>
        </div>
      </div>

      {/* Deliverables Section */}
      {deliverables.length > 0 && (
        <>
          <Divider />
          <div className={styles.delivSection}>
            <h4 className={styles.delivHeading}>
              DELIVERABLES [ {deliverables.length} ]
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
      <div className={styles.delivCardInner}>
        <div className={styles.delivTop}>
          <span className={styles.delivTitle}>{d.title}</span>
          <Badge status={d.status} />
        </div>
        <div className={styles.delivMeta}>
          <span>DUE: {d.dueDate}</span>
          {d.evidenceUrl ? (
            <a
              href={d.evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.evidenceLink}
              title="Evidence link"
            >
              [ EVIDENCE ↗ ]
            </a>
          ) : (
            <span className={styles.noEvidence}>No evidence yet</span>
          )}
        </div>
        {d.notes && <p className={styles.delivNotes}>{d.notes}</p>}
      </div>
    </div>
  );
}
