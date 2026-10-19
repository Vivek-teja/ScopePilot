import { useState, useCallback } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchChangeRequests, createChangeRequest, getDataSourceMode } from '../../services/scopePilotService.js';
import { useDemoSession } from '../../hooks/DemoContext.jsx';
import {
  Badge, Card, Button, LoadingState, ErrorState, EmptyState,
  Notice, FormField, Input, Textarea, Select,
} from '../../components/ui.jsx';
import styles from './ChangeRequestsTab.module.css';

export default function ChangeRequestsTab({ projectId, onOpenRequest }) {
  const [showForm, setShowForm] = useState(false);
  const { session } = useDemoSession();

  const fetchFn = useCallback(() => fetchChangeRequests(projectId), [projectId]);
  const { data: requests, loading, error, reload } = useAsync(fetchFn, [projectId]);

  if (loading) return <LoadingState message="Loading change requests..." />;
  if (error)   return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className={styles.container}>
      <div className={styles.tabHeader}>
        <div>
          <h2 className={styles.tabTitle}>
            Change Requests <span className={styles.countBadge}>[ {requests?.length ?? 0} ]</span>
          </h2>
          <div className={styles.purpleUnderline} />
        </div>
        {!showForm && (
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            + New Request ◊
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <CreateChangeRequestForm
          projectId={projectId}
          requestedBy={session?.id}
          onCreated={() => { reload(); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* List */}
      {!requests?.length && !showForm ? (
        <EmptyState
          title="No change requests"
          message="No scope changes have been requested for this project yet."
          action={<Button variant="secondary" onClick={() => setShowForm(true)}>Create first request</Button>}
        />
      ) : (
        <div className={styles.list}>
          {(requests ?? [])
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((cr) => (
              <ChangeRequestRow key={cr.id} cr={cr} onOpen={() => onOpenRequest(cr.id)} />
            ))}
        </div>
      )}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function ChangeRequestRow({ cr, onOpen }) {
  return (
    <Card className={styles.crCard} onClick={onOpen} surface="grey">
      <div className={styles.crHeader}>
        <div className={styles.crLeft}>
          <span className={styles.crId}>[ {cr.id} ]</span>
          <h3 className={styles.crTitle}>{cr.title}</h3>
        </div>
        <div className={styles.crBadges}>
          <Badge status={cr.status} />
          {cr.priority && <Badge status={cr.priority} label={cr.priority} variant={cr.priority === 'high' ? 'red' : cr.priority === 'medium' ? 'yellow' : 'gray'} />}
        </div>
      </div>
      <p className={styles.crSummary}>{cr.summary}</p>
      <div className={styles.crMeta}>
        <span>CREATED: {new Date(cr.createdAt).toLocaleDateString()}</span>
        {cr.estimatedEffortHours && (
          <span>ESTIMATED: ~{cr.estimatedEffortHours}h</span>
        )}
        <span className={styles.crOpen}>View details ◊</span>
      </div>
    </Card>
  );
}

// ── Create form ───────────────────────────────────────────────────────────────
const PRIORITIES = ['low', 'medium', 'high'];

function CreateChangeRequestForm({ projectId, requestedBy, onCreated, onCancel }) {
  const [values, setValues] = useState({
    title: '',
    summary: '',
    newWork: '',
    priority: 'medium',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  function set(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!values.title.trim()) {
      e.title = 'Title is required.';
    } else if (values.title.trim().length < 2) {
      e.title = 'Title must be at least 2 characters.';
    }

    if (!values.summary.trim()) {
      e.summary = 'Summary is required.';
    } else if (values.summary.trim().length < 5) {
      e.summary = 'Summary must be at least 5 characters.';
    }

    if (!values.newWork.trim()) {
      e.newWork = 'Description of new work is required.';
    } else if (values.newWork.trim().length < 5) {
      e.newWork = 'Description of new work must be at least 5 characters.';
    }

    return e;
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await createChangeRequest({
        projectId,
        requestedBy,
        title: values.title.trim(),
        summary: values.summary.trim(),
        newWork: values.newWork.trim(),
        priority: values.priority,
      });
      onCreated();
    } catch (err) {
      const msg = err.errors?.length
        ? `${err.message || 'Validation failed'}: ${err.errors.map((e) => (typeof e === 'string' ? e : e.message || e.field)).join(', ')}`
        : (err.message ?? 'Submission failed. Please try again.');
      setSubmitError(msg);
      setSubmitting(false);
    }
  }

  const isLive = getDataSourceMode() === 'live';

  return (
    <Card className={styles.formCard} surface="grey">
      <h3 className={styles.formTitle}>New Change Request</h3>
      {isLive ? (
        <Notice variant="info">
          Connected to live MongoDB backend. All project members will see this change request.
        </Notice>
      ) : (
        <Notice variant="demo">
          Saved locally in browser demo state. Sign in via Live Backend to persist across accounts.
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <FormField label="TITLE" htmlFor="cr-title" required error={errors.title}>
          <Input
            id="cr-title"
            placeholder="Brief title for the scope change"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
            disabled={submitting}
          />
        </FormField>

        <FormField
          label="PRIORITY"
          htmlFor="cr-priority"
          hint="Indicative priority for review"
        >
          <Select
            id="cr-priority"
            value={values.priority}
            onChange={(e) => set('priority', e.target.value)}
            disabled={submitting}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p.toUpperCase()}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="SUMMARY" htmlFor="cr-summary" required error={errors.summary}
          hint="Explain the rationale behind this change">
          <Textarea
            id="cr-summary"
            placeholder="Why is this scope change needed?"
            value={values.summary}
            onChange={(e) => set('summary', e.target.value)}
            error={errors.summary}
            disabled={submitting}
            rows={3}
          />
        </FormField>

        <FormField label="DESCRIPTION OF NEW WORK" htmlFor="cr-work" required error={errors.newWork}
          hint="Specify deliverables and components to be created or modified">
          <Textarea
            id="cr-work"
            placeholder="What specifically needs to be built?"
            value={values.newWork}
            onChange={(e) => set('newWork', e.target.value)}
            error={errors.newWork}
            disabled={submitting}
            rows={4}
          />
        </FormField>

        {submitError && (
          <Notice variant="warning">{submitError}</Notice>
        )}

        <div className={styles.formActions}>
          <Button type="submit" variant="primary" loading={submitting}>
            {submitting ? 'Submitting...' : 'Submit Request ◊'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
