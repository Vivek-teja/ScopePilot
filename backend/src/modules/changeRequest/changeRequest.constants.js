const CHANGE_REQUEST_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'pending_estimate',
  PENDING_ESTIMATE: 'pending_estimate',
  UNDER_REVIEW: 'pending_approval',
  PENDING_APPROVAL: 'pending_approval',
  ESTIMATED: 'pending_approval',
  APPROVED: 'approved',
  ACCEPTED: 'approved',
  REJECTED: 'rejected',
  IMPLEMENTED: 'implemented',
};

const CHANGE_REQUEST_DECISION = {
  APPROVE: 'approve',
  REJECT: 'reject',
  ACCEPT: 'accept',
};

const FINALIZED_CHANGE_REQUEST_STATUSES = [
  CHANGE_REQUEST_STATUS.APPROVED,
  CHANGE_REQUEST_STATUS.REJECTED,
  CHANGE_REQUEST_STATUS.IMPLEMENTED,
];

module.exports = {
  CHANGE_REQUEST_STATUS,
  ALLOWED_CHANGE_REQUEST_STATUSES: Array.from(new Set(Object.values(CHANGE_REQUEST_STATUS))),
  CHANGE_REQUEST_DECISION,
  ALLOWED_CHANGE_REQUEST_DECISIONS: Array.from(new Set(Object.values(CHANGE_REQUEST_DECISION))),
  FINALIZED_CHANGE_REQUEST_STATUSES,
};
