const CHANGE_REQUEST_STATUS = {
  DRAFT: 'draft',
  PENDING_ESTIMATE: 'pending_estimate',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IMPLEMENTED: 'implemented',
};

const CHANGE_REQUEST_DECISION = {
  APPROVE: 'approve',
  REJECT: 'reject',
};

module.exports = {
  CHANGE_REQUEST_STATUS,
  ALLOWED_CHANGE_REQUEST_STATUSES: Object.values(CHANGE_REQUEST_STATUS),
  CHANGE_REQUEST_DECISION,
  ALLOWED_CHANGE_REQUEST_DECISIONS: Object.values(CHANGE_REQUEST_DECISION),
};
