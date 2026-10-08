const ROLES = {
  FREELANCER: 'freelancer',
  CLIENT: 'client',
  ADMIN: 'admin',
};

const WORKSPACE_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  CLIENT: 'client',
};

module.exports = {
  ROLES,
  WORKSPACE_ROLES,
  ALLOWED_USER_ROLES: Object.values(ROLES),
  ALLOWED_WORKSPACE_ROLES: Object.values(WORKSPACE_ROLES),
};
