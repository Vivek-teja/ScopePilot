const { Router } = require('express');
const proposalController = require('./proposal.controller');
const {
  createProposalSchema,
  proposalIdParamSchema,
  proposalDecisionSchema,
  createProposalVersionSchema,
  proposalVersionParamSchema,
} = require('./proposal.validation');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createProposalSchema }), proposalController.createProposal);
router.get('/:id', validate({ params: proposalIdParamSchema }), proposalController.getProposalById);
router.post(
  '/:id/decision',
  validate({ params: proposalIdParamSchema, body: proposalDecisionSchema }),
  proposalController.recordDecision
);
router.post(
  '/:id/versions',
  validate({ params: proposalIdParamSchema, body: createProposalVersionSchema }),
  proposalController.createProposalVersion
);
router.get(
  '/:id/versions/:versionNumber',
  validate({ params: proposalVersionParamSchema }),
  proposalController.getProposalVersionByNumber
);

module.exports = router;
