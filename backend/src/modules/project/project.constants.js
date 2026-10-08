const PROJECT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

module.exports = {
  PROJECT_STATUS,
  ALLOWED_PROJECT_STATUSES: Object.values(PROJECT_STATUS),
};
