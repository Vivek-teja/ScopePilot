const { WORKSPACE_ROLES, ALLOWED_WORKSPACE_ROLES } = require('../../constants/roles');

const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
};

module.exports = {
  WORKSPACE_ROLES,
  ALLOWED_WORKSPACE_ROLES,
  INVITATION_STATUS,
  ALLOWED_INVITATION_STATUSES: Object.values(INVITATION_STATUS),
};
