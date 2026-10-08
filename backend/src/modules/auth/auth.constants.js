const { ROLES, ALLOWED_USER_ROLES } = require('../../constants/roles');

module.exports = {
  AUTH_ROLES: ROLES,
  ALLOWED_USER_ROLES,
  SALT_ROUNDS: 10,
};
