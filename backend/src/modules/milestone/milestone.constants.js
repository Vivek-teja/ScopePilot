const MILESTONE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const MILESTONE_DECISION = {
  APPROVE: 'approve',
  REJECT: 'reject',
};

module.exports = {
  MILESTONE_STATUS,
  ALLOWED_MILESTONE_STATUSES: Object.values(MILESTONE_STATUS),
  MILESTONE_DECISION,
  ALLOWED_MILESTONE_DECISIONS: Object.values(MILESTONE_DECISION),
};
