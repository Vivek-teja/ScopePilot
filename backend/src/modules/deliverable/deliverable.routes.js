const { Router } = require('express');
const deliverableController = require('./deliverable.controller');
const {
  createDeliverableSchema,
  updateDeliverableSchema,
  deliverableIdParamSchema,
  addEvidenceSchema,
  listDeliverablesQuerySchema,
} = require('./deliverable.validation');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createDeliverableSchema }), deliverableController.createDeliverable);
router.get('/', validate({ query: listDeliverablesQuerySchema }), deliverableController.listDeliverables);
router.get('/:id', validate({ params: deliverableIdParamSchema }), deliverableController.getDeliverableById);
router.patch(
  '/:id',
  validate({ params: deliverableIdParamSchema, body: updateDeliverableSchema }),
  deliverableController.updateDeliverable
);
router.post(
  '/:id/evidence',
  validate({ params: deliverableIdParamSchema, body: addEvidenceSchema }),
  deliverableController.addEvidence
);

module.exports = router;
