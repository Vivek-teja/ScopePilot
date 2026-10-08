const DELIVERABLE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

module.exports = {
  DELIVERABLE_STATUS,
  ALLOWED_DELIVERABLE_STATUSES: Object.values(DELIVERABLE_STATUS),
};
