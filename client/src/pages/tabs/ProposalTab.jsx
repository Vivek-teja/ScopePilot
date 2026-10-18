import { useState, useCallback } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { useDemoSession } from '../../hooks/DemoContext.jsx';
import { fetchProposals, recordProposalDecision } from '../../services/scopePilotService.js';
import {
  Badge, Card, Button, LoadingState, ErrorState, EmptyState,
  SectionHeader, KVRow, KVGrid, Divider, Notice,
} from '../../components/ui.jsx';
import styles from './ProposalTab.module.css';

export default function ProposalTab({ projectId, proposalId: _proposalId }) {
  const { session } = useDemoSession();
  const fetchFn = useCallback(() => fetchProposals(projectId), [projectId]);
  const { data: proposals, loading, error, reload } = useAsync(fetchFn, [projectId]);

  if (loading) return <LoadingState message="Loading proposals…" />;
  if (error)   return <ErrorState message={error} onRetry={reload} />;
  if (!proposals?.length) return <EmptyState icon="📄" title="No proposals" message="No proposals found for this project." />;

  const approved = proposals.find((p) => p.status === 'approved');
  const pending  = proposals.find((p) => p.status === 'pending_approval');
  const others   = proposals.filter((p) => p.status !== 'approved' && p.status !== 'pending_approval').sort((a, b) => b.version - a.version);

  return (
    <div className={styles.container}>
      <Notice variant="info">
        Only the <strong>approved</strong> version represents the agreed scope of work.
        Draft and superseded versions are shown below for reference only.
      </Notice>

      {/* Pending proposal awaiting decision */}
      {pending && (
        <section>
          <SectionHeader
            title="Proposal Pending Review"
            subtitle={`Version ${pending.version} is currently awaiting client sign-off`}
          />
          <PendingProposalSection
            proposal={pending}
            session={session}
            onDecisionSuccess={reload}
          />
        </section>
      )}

      {/* Approved proposal */}
      {approved ? (
        <section>
          <SectionHeader title="Approved Scope" subtitle={`Version ${approved.version} · Approved ${approved.approvedAt ?? '—'}`} />
          <Card className={styles.approvedCard}>
            <div className={styles.proposalHeader}>
              <div>
                <h3 className={styles.proposalTitle}>{approved.title}</h3>
                <p className={styles.proposalNotes}>{approved.notes}</p>
              </div>
              <Badge status="approved" label="Approved" />
            </div>

            <Divider />

            <div className={styles.proposalBody}>
              {/* Key values */}
              <div className={styles.kvSection}>
                <h4 className={styles.subHeading}>Agreement Details</h4>
                <KVGrid>
                  <KVRow label="Version"        value={`v${approved.version}`} />
                  <KVRow label="Agreed price"   value={`${approved.agreedPrice.toLocaleString()} ${approved.currency}`} />
                  <KVRow label="Revisions"      value={`${approved.revisionsUsed} used / ${approved.revisionLimit} allowed`} />
                  <KVRow label="Start date"     value={approved.startDate} />
                  <KVRow label="End date"       value={approved.endDate} />
                  <KVRow label="Approved by"    value={approved.approvedBy ?? '—'} mono />
                  <KVRow label="Approved on"    value={approved.approvedAt ?? '—'} />
                </KVGrid>
              </div>

              {/* Deliverables */}
              <div className={styles.delivSection}>
                <h4 className={styles.subHeading}>Agreed Deliverables</h4>
                <ul className={styles.delivList}>
                  {approved.agreedDeliverables.map((d, i) => (
                    <li key={i} className={styles.delivItem}>
                      <span className={styles.delivCheck} aria-hidden="true">✓</span>
                      {d}
                    </li>
                  ))}
                </ul>

                {/* Revision progress */}
                <div className={styles.revisionBar}>
                  <span className={styles.revisionLabel}>Revisions used</span>
                  <div className={styles.revisionDots}>
                    {Array.from({ length: approved.revisionLimit }).map((_, i) => (
                      <span
                        key={i}
                        className={`${styles.revisionDot} ${i < approved.revisionsUsed ? styles.revisionDotUsed : ''}`}
                        title={i < approved.revisionsUsed ? 'Used' : 'Available'}
                      />
                    ))}
                  </div>
                  <span className={styles.revisionCount}>
                    {approved.revisionsUsed}/{approved.revisionLimit}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </section>
      ) : !pending ? (
        <Notice variant="warning">No approved proposal version found for this project.</Notice>
      ) : null}

      {/* Other versions */}
      {others.length > 0 && (
        <section>
          <SectionHeader title="Other Versions" subtitle="For reference only — not the agreed scope" />
          <div className={styles.otherList}>
            {others.map((p) => (
              <Card key={p.id} className={styles.otherCard}>
                <div className={styles.otherHeader}>
                  <span className={styles.otherTitle}>{p.title}</span>
                  <Badge status={p.status} />
                </div>
                <p className={styles.otherNotes}>{p.notes}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PendingProposalSection({ proposal: p, session, onDecisionSuccess }) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isClientOrAdmin = session?.role === 'client' || session?.role === 'admin';

  async function handleDecision(decision) {
    setSubmitting(true);
    setError(null);
    try {
      await recordProposalDecision(p.proposalId || p.id, decision, comment.trim());
      onDecisionSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to record decision');
      setSubmitting(false);
    }
  }

  return (
    <Card className={styles.pendingCard}>
      <div className={styles.proposalHeader}>
        <div>
          <h3 className={styles.proposalTitle}>{p.title} (v{p.version})</h3>
          <p className={styles.proposalNotes}>{p.notes || 'Pending scope approval.'}</p>
        </div>
        <Badge status="pending_approval" label="Pending Review" />
      </div>

      <Divider />

      <div className={styles.proposalBody}>
        <div className={styles.kvSection}>
          <h4 className={styles.subHeading}>Proposed Terms</h4>
          <KVGrid>
            <KVRow label="Version" value={`v${p.version}`} />
            <KVRow label="Proposed price" value={`${p.agreedPrice.toLocaleString()} ${p.currency}`} />
            <KVRow label="Proposed date" value={p.startDate} />
          </KVGrid>
        </div>
        <div className={styles.delivSection}>
          <h4 className={styles.subHeading}>Scope Deliverables</h4>
          <ul className={styles.delivList}>
            {p.agreedDeliverables.map((d, i) => (
              <li key={i} className={styles.delivItem}>
                <span className={styles.delivCheck} aria-hidden="true">•</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isClientOrAdmin ? (
        <div className={styles.pendingDecisionSection}>
          <span className={styles.decisionLabel}>Client Review Decision:</span>
          {error && <Notice variant="warning">{error}</Notice>}
          <textarea
            className={styles.commentInput}
            rows={2}
            placeholder="Optional decision notes or feedback for the freelancer..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
          />
          <div className={styles.decisionButtonGroup}>
            <Button
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={() => handleDecision('approve')}
            >
              ✓ Approve Scope (v{p.version})
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={submitting}
              onClick={() => handleDecision('reject')}
            >
              ✕ Reject Scope
            </Button>
          </div>
        </div>
      ) : (
        <Notice variant="info">
          This proposal version is awaiting client review. Note: Freelancers cannot self-approve proposals under ScopePilot governance rules.
        </Notice>
      )}
    </Card>
  );
}

