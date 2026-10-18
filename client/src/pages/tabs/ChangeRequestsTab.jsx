import { useState, useCallback } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchChangeRequests, createChangeRequest } from '../../services/scopePilotService.js';
import { useDemoSession } from '../../hooks/DemoContext.jsx';
import {
  Badge, Card, Button, SectionHeader, LoadingState, ErrorState, EmptyState,
  Notice, FormField, Input, Textarea, Select,
} from '../../components/ui.jsx';
import styles from './ChangeRequestsTab.module.css';

export default function ChangeRequestsTab({ projectId, onOpenRequest }) {
  const [showForm, setShowForm] = useState(false);
  const { session } = useDemoSession();

  const fetchFn = useCallback(() => fetchChangeRequests(projectId), [projectId]);
  const { data: requests, loading, error, reload } = useAsync(fetchFn, [projectId]);

  if (loading) return <LoadingState message="Loading change requests…" />;
  if (error)   return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className={styles.container}>
      <SectionHeader
        title="Change Requests"
        subtitle={`${requests?.length ?? 0} request${requests?.length !== 1 ? 's' : ''}`}
        action={
          !showForm && (
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              + New request
            </Button>
          )
        }
      />

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
          icon="🔄"
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
    <Card className={styles.crCard} onClick={onOpen}>
      <div className={styles.crHeader}>
        <div className={styles.crLeft}>
          <span className={styles.crId}>{cr.id}</span>
          <h3 className={styles.crTitle}>{cr.title}</h3>
        </div>
        <div className={styles.crBadges}>
          <Badge status={cr.status} />
          {cr.priority && <Badge status={cr.priority} label={cr.priority} variant={cr.priority === 'high' ? 'red' : cr.priority === 'medium' ? 'yellow' : 'gray'} />}
        </div>
      </div>
      <p className={styles.crSummary}>{cr.summary}</p>
      <div className={styles.crMeta}>
        <span>Created {new Date(cr.createdAt).toLocaleDateString()}</span>
        {cr.estimatedEffortHours && (
          <span>~{cr.estimatedEffortHours}h estimated</span>
        )}
        <span className={styles.crOpen}>View details →</span>
      </div>
    </Card>
  );
}

// ── Create form ───────────────────────────────────────────────────────────────
const PRIORITIES = ['low', 'medium', 'high'];

function CreateChangeRequestForm({ projectId, requestedBy, onCreated, onCancel }) {
  const { mode } = useDemoSession();
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
    if (!values.title.trim())   e.title   = 'Title is required.';
    if (!values.summary.trim()) e.summary = 'Summary is required.';
    if (!values.newWork.trim()) e.newWork  = 'Description of new work is required.';
    return e;
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (submitting) return;  // prevent duplicate submission

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
      // Preserve entered values on failure
      setSubmitError(err.message ?? 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <Card className={styles.formCard}>
      <h3 className={styles.formTitle}>New Change Request</h3>
      <Notice variant={mode === 'live' ? 'info' : 'demo'}>
        {mode === 'live'
          ? 'This request will be sent to the live ScopePilot backend API and saved in MongoDB.'
          : 'This will be saved locally in your browser for this demo session.'}
      </Notice>

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <FormField label="Title" htmlFor="cr-title" required error={errors.title}>
          <Input
            id="cr-title"
            placeholder="Brief title for the change request"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
            disabled={submitting}
          />
        </FormField>

        <FormField
          label="Priority"
          htmlFor="cr-priority"
          hint="Indicative — final priority is agreed with all parties."
        >
          <Select
            id="cr-priority"
            value={values.priority}
            onChange={(e) => set('priority', e.target.value)}
            disabled={submitting}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Summary" htmlFor="cr-summary" required error={errors.summary}
          hint="One or two sentences explaining why this change is needed.">
          <Textarea
            id="cr-summary"
            placeholder="Why is this change needed?"
            value={values.summary}
            onChange={(e) => set('summary', e.target.value)}
            error={errors.summary}
            disabled={submitting}
            rows={3}
          />
        </FormField>

        <FormField label="Description of new work" htmlFor="cr-work" required error={errors.newWork}
          hint="Describe what would need to be built or changed. Be specific.">
          <Textarea
            id="cr-work"
            placeholder="What specifically needs to be built or changed?"
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
            {submitting ? 'Submitting…' : 'Submit request'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
