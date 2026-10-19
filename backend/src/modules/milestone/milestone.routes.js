const { Router } = require('express');
const milestoneController = require('./milestone.controller');
const {
  createMilestoneSchema,
  updateMilestoneSchema,
  milestoneIdParamSchema,
  addEvidenceSchema,
  milestoneDecisionSchema,
  listMilestonesQuerySchema,
} = require('./milestone.validation');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createMilestoneSchema }), milestoneController.createMilestone);
router.get('/', validate({ query: listMilestonesQuerySchema }), milestoneController.listMilestones);
router.get('/:id', validate({ params: milestoneIdParamSchema }), milestoneController.getMilestoneById);
router.patch(
  '/:id',
  validate({ params: milestoneIdParamSchema, body: updateMilestoneSchema }),
  milestoneController.updateMilestone
);
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
