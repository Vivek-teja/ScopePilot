const { Router } = require('express');
const milestoneController = require('./milestone.controller');
const {
  createMilestoneSchema,
  milestoneIdParamSchema,
  addEvidenceSchema,
  milestoneDecisionSchema,
} = require('./milestone.validation');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createMilestoneSchema }), milestoneController.createMilestone);
router.get('/:id', validate({ params: milestoneIdParamSchema }), milestoneController.getMilestoneById);
router.post(
  '/:id/evidence',
  validate({ params: milestoneIdParamSchema, body: addEvidenceSchema }),
  milestoneController.addEvidence
);
router.post(
  '/:id/decision',
  validate({ params: milestoneIdParamSchema, body: milestoneDecisionSchema }),
  milestoneController.recordDecision
);

module.exports = router;
