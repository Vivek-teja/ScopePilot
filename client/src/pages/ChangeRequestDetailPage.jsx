import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import {
  fetchChangeRequest,
  fetchProject,
  fetchApprovedProposal,
  fetchDeliverables,
  recordChangeRequestDecision,
  requestAiAnalysis,
} from '../services/scopePilotService.js';
import {
  Badge,
  Breadcrumb,
  Card,
  Button,
  LoadingState,
  ErrorState,
  NotFoundState,
  Notice,
  KVRow,
  KVGrid,
  Divider,
  FormField,
  Textarea,
} from '../components/ui.jsx';
import styles from './ChangeRequestDetailPage.module.css';

export default function ChangeRequestDetailPage() {
  const { projectId, crId } = useParams();
  const { session } = useDemoSession();

  const crFn = useCallback(() => fetchChangeRequest(crId), [crId]);
  const projectFn = useCallback(() => fetchProject(projectId), [projectId]);
  const delivFn = useCallback(() => fetchDeliverables(projectId), [projectId]);

  const { data: cr, loading: crLoading, error: crError, reload: reloadCr } = useAsync(crFn, [crId]);
  const { data: project, loading: projLoading, error: projError } = useAsync(projectFn, [projectId]);
  const { data: deliverables } = useAsync(delivFn, [projectId]);

  const approvedFn = useCallback(
    () => (project ? fetchApprovedProposal(project.approvedProposalId) : Promise.resolve(null)),
    [project]
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
          <AIAnalysisSection
            projectId={projectId}
            project={project}
            approvedProposal={approvedProposal}
            deliverables={deliverables}
            cr={cr}
          />
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
              <KVRow label="ID" value={cr.id} mono />
              <KVRow label="Status" value={<Badge status={cr.status} />} />
              <KVRow label="Priority" value={cr.priority ?? '—'} />
              <KVRow label="Requested" value={cr.requestedBy} mono />
              <KVRow label="Created" value={new Date(cr.createdAt).toLocaleDateString()} />
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
                <div className={styles.impactNote}>Calculated impact from change submission</div>
              </div>
            </div>
          )}
          {cr.scheduleImpactDays && (
            <div className={styles.impactItem}>
              <span className={styles.impactIcon}>📅</span>
              <div>
                <div className={styles.impactLabel}>Schedule impact</div>
                <div className={styles.impactValue}>~{cr.scheduleImpactDays} days</div>
                <div className={styles.impactNote}>Estimated milestone deadline adjustment</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className={styles.unavailable}>
          ℹ️ Effort and schedule impact estimates are not available for this request yet.
          They will be calculated during the review process.
        </p>
      )}
    </Card>
  );
}

// ── AI analysis section ───────────────────────────────────────────────────────
function AIAnalysisSection({ projectId, approvedProposal, deliverables, cr }) {
  const [analysis, setAnalysis] = useState(cr.aiAnalysis || null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  async function handleRunAnalysis() {
    setAnalyzing(true);
    setError(null);

    const safeDeliverables = (deliverables && deliverables.length > 0 ? deliverables : [
      {
        id: 'del-fallback-1',
        title: 'Core Platform Architecture',
        scopeReference: 'PROP-V1-ITEM-1',
        description: 'Core platform deliverables from approved baseline',
        acceptanceCriteria: ['Pass unit tests', 'Deploy to staging'],
      },
    ]).map((d) => ({
      id: (d.id || d._id || 'del-1').toString(),
      title: d.title || 'Platform Deliverable',
      scopeReference: d.scopeReference || 'PROP-V1-ITEM-1',
      description: d.description || '',
      acceptanceCriteria: d.acceptanceCriteria || [],
    }));

    const input = {
      projectId: (projectId || 'proj-001').toString(),
      approvedProposalVersion: {
        versionNumber: approvedProposal?.version || 1,
        title: approvedProposal?.title || 'Approved Project Proposal',
        scopeSummary: approvedProposal?.notes || approvedProposal?.title || 'Approved baseline scope',
        scopeItems: (approvedProposal?.scopeItems && approvedProposal.scopeItems.length > 0)
          ? approvedProposal.scopeItems
          : (approvedProposal?.agreedDeliverables || ['Core Platform Scope']).map((title) => ({
              title,
              description: title,
              estimatedHours: 20,
              price: 2000,
            })),
      },
      deliverables: safeDeliverables,
      newClientRequest: {
        title: cr.title,
        description: cr.newWork || cr.summary || cr.title,
        requestedBy: cr.requestedBy,
      },
    };

    try {
      const result = await requestAiAnalysis(input);
      setAnalysis(result);
    } catch (err) {
      setError(err.message || 'AI analysis request failed.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <Card className={styles.aiCard}>
      <div className={styles.aiHeader}>
        <span className={styles.aiIcon}>🤖</span>
        <div>
          <h3 className={styles.aiTitle}>AI Scope Analysis (Advisory)</h3>
          <p className={styles.aiSubtitle}>
            Deterministic mock analysis comparing request against approved scope baseline
          </p>
        </div>
      </div>
      <Divider />

      {!analysis && !analyzing && (
        <div className={styles.aiNotConnected}>
          <span className={styles.aiStatusDot} aria-hidden="true" />
          <div>
            <strong>Scope Analysis Available</strong>
            <p style={{ marginTop: 4, marginBottom: 12 }}>
              Run the rule-based analysis engine to classify scope boundaries, detect out-of-scope work, and generate risk signals.
            </p>
            <Button variant="primary" size="sm" onClick={handleRunAnalysis}>
              ⚡ Run Advisory AI Scope Analysis
            </Button>
          </div>
        </div>
      )}

      {analyzing && (
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <LoadingState message="Analyzing change request against approved scope…" />
        </div>
      )}

      {error && (
        <Notice variant="warning" style={{ marginTop: 12 }}>
          {error}
        </Notice>
      )}

      {analysis && !analyzing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review Status: </span>
              <strong style={{ textTransform: 'uppercase', color: 'var(--accent)' }}>
                {analysis.reviewStatus?.replace(/_/g, ' ')}
              </strong>
            </div>
            <span style={{ fontSize: '0.82rem', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
              Confidence: {Math.round((analysis.confidenceScore || 0) * 100)}%
            </span>
          </div>

          <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
            {analysis.summary}
          </p>

          {analysis.outOfScopeItems?.length > 0 && (
            <div style={{ background: '#fef2f2', padding: 12, borderRadius: 6, border: '1px solid #fecaca' }}>
              <strong style={{ color: '#991b1b', fontSize: '0.85rem' }}>Out-of-Scope Items Detected ({analysis.outOfScopeItems.length}):</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.82rem', color: '#7f1d1d' }}>
                {analysis.outOfScopeItems.map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <strong>{item.item}</strong> — {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.uncertainItems?.length > 0 && (
            <div style={{ background: '#fffbeb', padding: 12, borderRadius: 6, border: '1px solid #fde68a' }}>
              <strong style={{ color: '#92400e', fontSize: '0.85rem' }}>Items Requiring Clarification:</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.82rem', color: '#78350f' }}>
                {analysis.uncertainItems.map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <strong>{item.item}</strong>: {item.question}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.recommendations?.length > 0 && (
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Recommendations:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.82rem' }}>
                {analysis.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <Notice variant="info" style={{ fontSize: '0.78rem', marginTop: 4 }}>
            {analysis.disclaimer || 'AI analysis is an advisory draft only. Human decision is required.'}
          </Notice>

          <Button variant="ghost" size="sm" onClick={handleRunAnalysis} style={{ alignSelf: 'flex-start' }}>
            ↻ Re-run Analysis
          </Button>
        </div>
      )}
    </Card>
  );
}

// ── Human decision section ────────────────────────────────────────────────────
function HumanDecisionSection({ cr, session, onDecided }) {
  const [showDecideForm, setShowDecideForm] = useState(false);
  const [note, setNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [decideError, setDecideError] = useState(null);

  // Client-only decision authority: Freelancers and request authors cannot approve.
  const isFreelancer = session?.role === 'freelancer';
  const isRequester = (cr.requestedBy && (cr.requestedBy === session?.name || cr.requestedBy === session?.email || cr.requestedBy === session?.id));
  const isAuthorizedClient = (session?.role === 'client' || session?.role === 'admin' || session?.role === 'owner') && !isRequester;
  const isPending = cr.humanDecision === 'pending' || cr.status === 'submitted' || cr.status === 'draft' || cr.status === 'pending_estimate';

  async function handleDecide(decision) {
    if (deciding) return;
    setDeciding(true);
    setDecideError(null);
    try {
      await recordChangeRequestDecision(cr.id, decision, note);
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
          <KVRow
            label="Decided on"
            value={cr.humanDecisionAt ? new Date(cr.humanDecisionAt).toLocaleDateString() : '—'}
          />
        </KVGrid>
        {cr.humanDecisionNote && (
          <div className={styles.decisionNote}>
            <span className={styles.decisionNoteLabel}>Note</span>
            <p>{cr.humanDecisionNote}</p>
          </div>
        )}
      </div>

      {/* Decision controls */}
      {isPending && isAuthorizedClient && !showDecideForm && (
        <>
          <Notice variant="info">
            As the client or authorized reviewer, you have authority to approve or reject this change request.
          </Notice>
          <Button variant="primary" size="sm" onClick={() => setShowDecideForm(true)}>
            Record Decision
          </Button>
        </>
      )}

      {isPending && (isFreelancer || isRequester) && (
        <Notice variant="warning">
          <strong>Decision Guard:</strong> Under ScopePilot security policy, freelancers and request authors cannot self-approve change requests. Decision authority rests with the client.
        </Notice>
      )}

      {!isPending && (
        <Notice variant="info">
          A decision has been recorded. In the live application, decisions are immutable and managed by the backend.
        </Notice>
      )}

      {/* Decision form */}
      {showDecideForm && (
        <div className={styles.decideForm}>
          <FormField label="Decision note (optional)" htmlFor="decision-note">
            <Textarea
              id="decision-note"
              placeholder="Add an explanation for approval or rejection…"
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
              ✓ Approve Request
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deciding}
              onClick={() => handleDecide('rejected')}
            >
              ✕ Reject Request
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
