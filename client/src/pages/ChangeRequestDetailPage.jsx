import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import {
  fetchChangeRequest, fetchProject, fetchApprovedProposal,
  simulateHumanDecision,
} from '../services/scopePilotService.js';
import {
  Badge, Breadcrumb, Card, Button, LoadingState, ErrorState, NotFoundState,
  Notice, KVRow, KVGrid, Divider, FormField, Textarea,
} from '../components/ui.jsx';
import styles from './ChangeRequestDetailPage.module.css';

export default function ChangeRequestDetailPage() {
  const { projectId, crId } = useParams();
  const { session } = useDemoSession();

  const crFn      = useCallback(() => fetchChangeRequest(crId), [crId]);
  const projectFn = useCallback(() => fetchProject(projectId), [projectId]);

  const { data: cr,      loading: crLoading,  error: crError,  reload: reloadCr } = useAsync(crFn, [crId]);
  const { data: project, loading: projLoading, error: projError }                  = useAsync(projectFn, [projectId]);

  // Fetch approved proposal when CR is loaded
  const approvedFn = useCallback(
    () => project ? fetchApprovedProposal(project.approvedProposalId) : Promise.resolve(null),
    [project],
  );
  const { data: approvedProposal } = useAsync(approvedFn, [project]);

  if (crLoading || projLoading) return <LoadingState message="Loading change request…" />;
  if (crError?.includes('not found')) return <NotFoundState message={`Change request "${crId}" was not found.`} />;
  if (crError) return <ErrorState message={crError} onRetry={reloadCr} />;
  if (projError) return <ErrorState message={projError} />;

  return (
    <div className={styles.page}>
      <Breadcrumb
        items={[
          { label: 'Workspace', to: '/workspace' },
          { label: 'Projects', to: '/projects' },
          { label: project?.name ?? projectId, to: `/projects/${projectId}` },
          { label: 'Change Requests', to: `/projects/${projectId}` },
          { label: cr.title },
        ]}
      />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.crId}>{cr.id}</p>
            <h1 className={styles.crTitle}>{cr.title}</h1>
          </div>
          <div className={styles.headerBadges}>
            <Badge status={cr.status} />
            {cr.priority && (
              <Badge
                status={cr.priority}
                label={`${cr.priority} priority`}
                variant={cr.priority === 'high' ? 'red' : cr.priority === 'medium' ? 'yellow' : 'gray'}
              />
            )}
          </div>
        </div>
        <p className={styles.summary}>{cr.summary}</p>
        <div className={styles.metaRow}>
          <span>Requested by: <strong>{cr.requestedBy}</strong></span>
          <span>Created: {new Date(cr.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(cr.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className={styles.bodyGrid}>
        {/* Left column */}
        <div className={styles.leftCol}>
          {/* Scope comparison */}
          <ScopeComparison cr={cr} approvedProposal={approvedProposal} />

          {/* Impact estimates */}
          <ImpactSection cr={cr} />

          {/* AI Analysis area */}
          <AIAnalysisSection />
        </div>

        {/* Right column */}
        <div className={styles.rightCol}>
          {/* Human decision */}
          <HumanDecisionSection cr={cr} session={session} onDecided={reloadCr} />

          {/* Change request details */}
          <Card className={styles.detailsCard}>
            <h3>Request Details</h3>
            <Divider />
            <KVGrid>
              <KVRow label="ID"          value={cr.id} mono />
              <KVRow label="Status"      value={<Badge status={cr.status} />} />
              <KVRow label="Priority"    value={cr.priority ?? '—'} />
              <KVRow label="Requested"   value={cr.requestedBy} mono />
              <KVRow label="Created"     value={new Date(cr.createdAt).toLocaleDateString()} />
              <KVRow
                label="Affected milestones"
                value={cr.affectedMilestoneIds?.length ? cr.affectedMilestoneIds.join(', ') : '—'}
                mono
              />
              <KVRow
                label="Effort estimate"
                value={cr.estimatedEffortHours ? `~${cr.estimatedEffortHours} hours` : '—'}
              />
              <KVRow
                label="Schedule impact"
                value={cr.scheduleImpactDays ? `~${cr.scheduleImpactDays} days` : '—'}
              />
            </KVGrid>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Scope comparison ──────────────────────────────────────────────────────────
function ScopeComparison({ cr, approvedProposal }) {
  return (
    <Card className={styles.scopeCard}>
      <h3>Scope Comparison</h3>
      <p className={styles.scopeSubtitle}>
        Review the original approved scope against the newly requested work.
      </p>
      <Divider />
      <div className={styles.scopeColumns}>
        {/* Approved scope */}
        <div className={styles.scopeCol}>
          <div className={styles.scopeColHeader}>
            <span className={styles.scopeColBadge + ' ' + styles.scopeColBadgeApproved}>Approved scope</span>
          </div>
          {approvedProposal ? (
            <ul className={styles.scopeList}>
              {approvedProposal.agreedDeliverables.map((d, i) => (
                <li key={i} className={styles.scopeItem}>
                  <span className={styles.scopeCheck} aria-hidden="true">✓</span>
                  {d}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.scopeLoading}>Loading approved scope…</p>
          )}
        </div>

        {/* Requested work */}
        <div className={styles.scopeCol}>
          <div className={styles.scopeColHeader}>
            <span className={styles.scopeColBadge + ' ' + styles.scopeColBadgeNew}>Requested change</span>
          </div>
          <p className={styles.newWork}>{cr.newWork}</p>
          <Notice variant="warning" style={{ marginTop: 12 }}>
            This work is <strong>not</strong> part of the approved scope. It requires
            an explicit change-request approval before any work begins.
          </Notice>
        </div>
      </div>
    </Card>
  );
}

// ── Impact section ────────────────────────────────────────────────────────────
function ImpactSection({ cr }) {
  const hasEstimates = cr.estimatedEffortHours || cr.scheduleImpactDays;
  return (
    <Card className={styles.impactCard}>
      <h3>Estimated Impact</h3>
      <Divider />
      {hasEstimates ? (
        <div className={styles.impactGrid}>
          {cr.estimatedEffortHours && (
            <div className={styles.impactItem}>
              <span className={styles.impactIcon}>⏱️</span>
              <div>
                <div className={styles.impactLabel}>Effort estimate</div>
                <div className={styles.impactValue}>~{cr.estimatedEffortHours} hours</div>
                <div className={styles.impactNote}>Sample fixture value — not a final quote</div>
              </div>
            </div>
          )}
          {cr.scheduleImpactDays && (
            <div className={styles.impactItem}>
              <span className={styles.impactIcon}>📅</span>
              <div>
                <div className={styles.impactLabel}>Schedule impact</div>
                <div className={styles.impactValue}>~{cr.scheduleImpactDays} days</div>
                <div className={styles.impactNote}>Sample fixture value — not a binding timeline</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className={styles.unavailable}>
          ℹ️ Effort and schedule impact estimates are not available for this request yet.
          They would be added during the review process.
        </p>
      )}
    </Card>
  );
}

// ── AI analysis section ───────────────────────────────────────────────────────
function AIAnalysisSection() {
  return (
    <Card className={styles.aiCard}>
      <div className={styles.aiHeader}>
        <span className={styles.aiIcon}>🤖</span>
        <div>
          <h3 className={styles.aiTitle}>AI Scope Analysis</h3>
          <p className={styles.aiSubtitle}>Automated comparison of new work against approved scope</p>
        </div>
      </div>
      <Divider />
      <div className={styles.aiNotConnected}>
        <span className={styles.aiStatusDot} aria-hidden="true" />
        <div>
          <strong>AI analysis is not connected yet.</strong>
          <p>
            In Part 3, the AI backend will compare this request against the approved scope and
            surface overlaps, gaps, and complexity signals. No AI inference is performed in this demo.
          </p>
        </div>
      </div>
      <Notice variant="info">
        <strong>Part 3 integration point:</strong> The AI adapter will call the AI backend,
        receive a structured analysis, and render it here. The <code>aiAnalysis</code> field
        on the change request object is reserved for this data.
      </Notice>
    </Card>
  );
}

// ── Human decision section ────────────────────────────────────────────────────
function HumanDecisionSection({ cr, session, onDecided }) {
  const [showDecideForm, setShowDecideForm] = useState(false);
  const [note, setNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [decideError, setDecideError] = useState(null);

  const isFreelancer = session?.role === 'freelancer' || session?.role === 'owner';
  const isPending    = cr.humanDecision === 'pending';

  async function handleDecide(decision) {
    if (deciding) return;
    setDeciding(true);
    setDecideError(null);
    try {
      await simulateHumanDecision(cr.id, decision, note, session?.id);
      setShowDecideForm(false);
      onDecided();
    } catch (err) {
      setDecideError(err.message ?? 'Failed to record decision.');
      setDeciding(false);
    }
  }

  return (
    <Card className={styles.decisionCard}>
      <h3>Human Decision</h3>
      <Divider />

      {/* Current decision status */}
      <div className={styles.decisionStatus}>
        <KVGrid>
          <KVRow label="Decision" value={<Badge status={cr.humanDecision} />} />
          <KVRow label="Decided by" value={cr.humanDecisionBy ?? '—'} mono />
          <KVRow label="Decided on" value={cr.humanDecisionAt ? new Date(cr.humanDecisionAt).toLocaleDateString() : '—'} />
        </KVGrid>
        {cr.humanDecisionNote && (
          <div className={styles.decisionNote}>
            <span className={styles.decisionNoteLabel}>Note</span>
            <p>{cr.humanDecisionNote}</p>
          </div>
        )}
      </div>

      {/* Demo decision controls */}
      {isPending && isFreelancer && !showDecideForm && (
        <>
          <Notice variant="demo">
            <strong>Demo control:</strong> As the freelancer, you can simulate recording a decision.
            This is a local simulation only — not a real approval workflow.
          </Notice>
          <Button variant="secondary" size="sm" onClick={() => setShowDecideForm(true)}>
            Record decision (demo)
          </Button>
        </>
      )}

      {isPending && !isFreelancer && (
        <Notice variant="info">
          A decision is pending. In the live application, the authorized party will
          approve or reject this request through the backend workflow.
        </Notice>
      )}

      {!isPending && (
        <Notice variant="info">
          A decision has been recorded. In the live application, decisions are
          immutable and managed by the backend.
        </Notice>
      )}

      {/* Decision form */}
      {showDecideForm && (
        <div className={styles.decideForm}>
          <FormField label="Decision note (optional)" htmlFor="decision-note">
            <Textarea
              id="decision-note"
              placeholder="Add a note explaining the decision…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={deciding}
            />
          </FormField>
          {decideError && <Notice variant="warning">{decideError}</Notice>}
          <div className={styles.decideActions}>
            <Button
              variant="primary"
              size="sm"
              loading={deciding}
              onClick={() => handleDecide('approved')}
            >
              ✓ Approve (demo)
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deciding}
              onClick={() => handleDecide('rejected')}
            >
              ✕ Reject (demo)
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDecideForm(false)} disabled={deciding}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
