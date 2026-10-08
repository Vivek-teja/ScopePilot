const { Router } = require('express');
const deliverableController = require('./deliverable.controller');
const {
  createDeliverableSchema,
  deliverableIdParamSchema,
} = require('./deliverable.validation');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createDeliverableSchema }), deliverableController.createDeliverable);
router.get('/:id', validate({ params: deliverableIdParamSchema }), deliverableController.getDeliverableById);

module.exports = router;
