import { useCallback } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchProposals } from '../../services/scopePilotService.js';
import {
  Badge, Card, LoadingState, ErrorState, EmptyState,
  KVRow, KVGrid, Divider, Notice,
} from '../../components/ui.jsx';
import styles from './ProposalTab.module.css';

export default function ProposalTab({ projectId, proposalId: _proposalId }) {
  const fetchFn = useCallback(() => fetchProposals(projectId), [projectId]);
  const { data: proposals, loading, error, reload } = useAsync(fetchFn, [projectId]);

  if (loading) return <LoadingState message="Loading proposals..." />;
  if (error)   return <ErrorState message={error} onRetry={reload} />;
  if (!proposals?.length) return <EmptyState title="No proposals found" message="No proposals recorded for this project." />;

  const approved = proposals.find((p) => p.status === 'approved');
  const others   = proposals.filter((p) => p.status !== 'approved').sort((a, b) => b.version - a.version);

  return (
    <div className={styles.container}>
      <Notice variant="info">
        Only the <strong>approved</strong> version represents the agreed contractual scope. Draft and superseded versions are maintained below for historical reference.
      </Notice>

      {/* Approved Scope Card */}
      {approved ? (
        <section className={styles.section}>
          <div className={styles.sectionHeadingLine}>
            <h2 className={styles.sectionTitle}>
              Approved Scope <span className={styles.versionTag}>[ v{approved.version} ]</span>
            </h2>
            <div className={styles.purpleUnderline} />
          </div>

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
              {/* Key Values */}
              <div className={styles.kvSection}>
                <h4 className={styles.subHeading}>AGREEMENT METRICS</h4>
                <KVGrid>
                  <KVRow label="VERSION"      value={`v${approved.version}`} />
                  <KVRow label="AGREED PRICE" value={`${approved.agreedPrice.toLocaleString()} ${approved.currency}`} />
                  <KVRow label="REVISIONS"    value={`${approved.revisionsUsed} used / ${approved.revisionLimit} allowed`} />
                  <KVRow label="START DATE"   value={approved.startDate} />
                  <KVRow label="END DATE"     value={approved.endDate} />
                  <KVRow label="APPROVER"     value={approved.approvedBy ?? '—'} mono />
                  <KVRow label="SIGN DATE"    value={approved.approvedAt ?? '—'} />
                </KVGrid>
              </div>

              {/* Agreed Deliverables List */}
              <div className={styles.delivSection}>
                <h4 className={styles.subHeading}>AGREED DELIVERABLES</h4>
                <ul className={styles.delivList}>
                  {approved.agreedDeliverables.map((d, i) => (
                    <li key={i} className={styles.delivItem}>
                      <span className={styles.diamondCheck} aria-hidden="true">◊</span>
                      <span className={styles.delivText}>{d}</span>
                    </li>
                  ))}
                </ul>

                {/* Revision Limit Tracking with Diamonds */}
                <div className={styles.revisionBar}>
                  <span className={styles.revisionLabel}>REVISIONS:</span>
                  <div className={styles.revisionDots}>
                    {Array.from({ length: approved.revisionLimit }).map((_, i) => (
                      <span
                        key={i}
                        className={`${styles.revisionDiamond} ${i < approved.revisionsUsed ? styles.revisionDiamondUsed : ''}`}
                        title={i < approved.revisionsUsed ? 'Used' : 'Available'}
                      >
                        ◊
                      </span>
                    ))}
                  </div>
                  <span className={styles.revisionCount}>
                    [ {approved.revisionsUsed} / {approved.revisionLimit} ]
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </section>
      ) : (
        <Notice variant="warning">No approved proposal version found for this project.</Notice>
      )}

      {/* Other Versions Section */}
      {others.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeadingLine}>
            <h2 className={styles.sectionTitle}>Archived / Previous Versions</h2>
            <div className={styles.purpleUnderline} />
          </div>

          <div className={styles.otherList}>
            {others.map((p) => (
              <Card key={p.id} className={styles.otherCard} surface="grey">
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
