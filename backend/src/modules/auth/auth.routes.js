const { Router } = require('express');
const authController = require('./auth.controller');
const { registerSchema, loginSchema } = require('./auth.validation');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = Router();

router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
