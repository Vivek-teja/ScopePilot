import { useState, useCallback } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchMilestones, fetchDeliverables, createMilestone } from '../../services/scopePilotService.js';
import {
  Badge, Card, LoadingState, ErrorState, EmptyState,
  CircularProgress, Notice, Divider, Button, FormField, Input, Textarea,
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
  const [showNewMsForm, setShowNewMsForm] = useState(false);
  const msFn  = useCallback(() => fetchMilestones(projectId), [projectId]);
  const delFn = useCallback(() => fetchDeliverables(projectId), [projectId]);

  const { data: milestones, loading: msLoading, error: msError, reload } = useAsync(msFn, [projectId]);
  const { data: deliverables, loading: delLoading } = useAsync(delFn, [projectId]);

  if (msLoading || delLoading) return <LoadingState message="Loading milestones..." />;
  if (msError) return <ErrorState message={msError} onRetry={reload} />;

  const delivByMilestone = (deliverables ?? []).reduce((acc, d) => {
    (acc[d.milestoneId] = acc[d.milestoneId] || []).push(d);
    return acc;
  }, {});

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Notice variant="info" style={{ margin: 0, flex: 1, marginRight: '16px' }}>
          Milestones represent agreed project execution phases with deliverables and completion tracking.
        </Notice>
        {!showNewMsForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowNewMsForm(true)}>
            + Assign Milestone ◊
          </Button>
        )}
      </div>

      {showNewMsForm && (
        <CreateMilestoneForm
          projectId={projectId}
          nextOrder={(milestones?.length || 0) + 1}
          onCancel={() => setShowNewMsForm(false)}
          onCreated={() => {
            setShowNewMsForm(false);
            reload();
          }}
        />
      )}

      {!milestones?.length && !showNewMsForm && (
        <EmptyState
          title="No Milestones Found"
          message="No delivery milestones defined for this project yet. Click '+ Assign Milestone ◊' above to define Phase 1."
        />
      )}

      {milestones?.map((ms) => (
        <MilestoneCard
          key={ms.id}
          milestone={ms}
          deliverables={delivByMilestone[ms.id] ?? []}
        />
      ))}
    </div>
  );
}

function CreateMilestoneForm({ projectId, nextOrder = 1, onCancel, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(nextOrder);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 2) {
      setError('Milestone title must be at least 2 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        projectId,
        title: title.trim(),
        description: description.trim(),
        order: Number(order) || 1,
      };
      if (dueDate) payload.dueDate = dueDate;
      await createMilestone(payload);
      onCreated();
    } catch (err) {
      setError(err.message || 'Failed to create milestone.');
      setSubmitting(false);
    }
  }

  return (
    <Card surface="grey" style={{ padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-white)', fontFamily: 'var(--font-display)' }}>
        Assign New Delivery Milestone (M{order})
      </h3>
      {error && <Notice variant="warning">{error}</Notice>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="MILESTONE TITLE" htmlFor="ms-title" required>
          <Input
            id="ms-title"
            placeholder="e.g. M1: Architecture & Core API Engine"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
        </FormField>
        <FormField label="PHASE DESCRIPTION" htmlFor="ms-desc">
          <Textarea
            id="ms-desc"
            placeholder="Key objectives, technical requirements, and completion criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={3}
          />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <FormField label="SEQUENCE ORDER" htmlFor="ms-order">
            <Input
              id="ms-order"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              disabled={submitting}
            />
          </FormField>
          <FormField label="TARGET DUE DATE" htmlFor="ms-due">
            <Input
              id="ms-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={submitting}
            />
          </FormField>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <Button type="submit" variant="primary" size="sm" loading={submitting}>
            Assign Milestone ◊
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
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
