const { Router } = require('express');
const projectController = require('./project.controller');
const { createProjectSchema, projectIdParamSchema } = require('./project.validation');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createProjectSchema }), projectController.createProject);
router.get('/:id', validate({ params: projectIdParamSchema }), projectController.getProjectById);

module.exports = router;
