const { Router } = require('express');
const changeRequestController = require('./changeRequest.controller');
const {
  createChangeRequestSchema,
  changeRequestIdParamSchema,
  changeRequestDecisionSchema,
} = require('./changeRequest.validation');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createChangeRequestSchema }), changeRequestController.createChangeRequest);
router.get('/:id', validate({ params: changeRequestIdParamSchema }), changeRequestController.getChangeRequestById);
router.post(
  '/:id/decision',
  validate({ params: changeRequestIdParamSchema, body: changeRequestDecisionSchema }),
  changeRequestController.recordDecision
);

module.exports = router;
