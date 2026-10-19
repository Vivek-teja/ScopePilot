const PROPOSAL_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUPERSEDED: 'superseded',
};

const PROPOSAL_DECISION = {
  APPROVE: 'approve',
  REJECT: 'reject',
};

module.exports = {
  PROPOSAL_STATUS,
  ALLOWED_PROPOSAL_STATUSES: Object.values(PROPOSAL_STATUS),
  PROPOSAL_DECISION,
  ALLOWED_PROPOSAL_DECISIONS: Object.values(PROPOSAL_DECISION),
};
