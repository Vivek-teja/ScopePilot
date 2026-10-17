const mongoose = require('mongoose');
const Milestone = require('../src/modules/milestone/milestone.model');
const Deliverable = require('../src/modules/deliverable/deliverable.model');
const { MILESTONE_STATUS } = require('../src/modules/milestone/milestone.constants');
const { DELIVERABLE_STATUS } = require('../src/modules/deliverable/deliverable.constants');
const {
  createMilestoneSchema,
  updateMilestoneSchema,
  milestoneIdParamSchema,
  listMilestonesQuerySchema,
} = require('../src/modules/milestone/milestone.validation');
const {
  createDeliverableSchema,
  updateDeliverableSchema,
  deliverableIdParamSchema,
  listDeliverablesQuerySchema,
} = require('../src/modules/deliverable/deliverable.validation');

describe('Part 1: Milestone & Deliverable Models and Validations', () => {
  const validProjectId = new mongoose.Types.ObjectId().toString();
  const validMilestoneId = new mongoose.Types.ObjectId().toString();
  const validDeliverableId = new mongoose.Types.ObjectId().toString();

  // =========================================================================
  // 1. MILESTONE MONGOOSE MODEL TESTS
  // =========================================================================
  describe('Milestone Mongoose Model', () => {
    it('should instantiate a valid Milestone with projectId alias and default values', () => {
      const milestone = new Milestone({
        projectId: validProjectId,
        title: 'Sprint 1: Core Framework',
        description: 'Initial backend setup and foundational models.',
        dueDate: new Date('2026-11-01'),
      });

      expect(milestone.project.toString()).toBe(validProjectId);
      expect(milestone.projectId.toString()).toBe(validProjectId);
      expect(milestone.title).toBe('Sprint 1: Core Framework');
      expect(milestone.description).toBe('Initial backend setup and foundational models.');
      expect(milestone.status).toBe(MILESTONE_STATUS.PENDING);
      expect(milestone.order).toBe(1);
      expect(Array.isArray(milestone.deliverables)).toBe(true);

      const json = milestone.toJSON();
      expect(json.projectId).toBeDefined();
      expect(json.project).toBeDefined();
    });

    it('should support instantiation with project field for backward compatibility', () => {
      const milestone = new Milestone({
        project: validProjectId,
        title: 'Sprint 2: Authentication',
      });

      expect(milestone.project.toString()).toBe(validProjectId);
      expect(milestone.projectId.toString()).toBe(validProjectId);
    });

    it('should fail Mongoose validation when project/projectId is missing', () => {
      const milestone = new Milestone({
        title: 'Orphaned Milestone',
      });

      const validationError = milestone.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.project).toBeDefined();
      expect(validationError.errors.project.message).toMatch(/Project reference is required/i);
    });

    it('should fail Mongoose validation when title is missing', () => {
      const milestone = new Milestone({
        projectId: validProjectId,
      });

      const validationError = milestone.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.title).toBeDefined();
      expect(validationError.errors.title.message).toMatch(/Milestone title is required/i);
    });

    it('should fail Mongoose validation when status is not an allowed value', () => {
      const milestone = new Milestone({
        projectId: validProjectId,
        title: 'Sprint 3',
        status: 'non_existent_status',
      });

      const validationError = milestone.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.status).toBeDefined();
      expect(validationError.errors.status.message).toMatch(/not a valid milestone status/i);
    });

    it('should fail Mongoose validation when order is less than 1', () => {
      const milestone = new Milestone({
        projectId: validProjectId,
        title: 'Sprint 4',
        order: 0,
      });

      const validationError = milestone.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.order).toBeDefined();
    });

    it('should define model name as Milestone and register properly in Mongoose', () => {
      expect(mongoose.models.Milestone).toBeDefined();
      expect(Milestone.modelName).toBe('Milestone');
    });
  });

  // =========================================================================
  // 2. DELIVERABLE MONGOOSE MODEL TESTS
  // =========================================================================
  describe('Deliverable Mongoose Model', () => {
    it('should instantiate a valid Deliverable with projectId and milestoneId aliases and defaults', () => {
      const deliverable = new Deliverable({
        projectId: validProjectId,
        milestoneId: validMilestoneId,
        title: 'JWT Authentication Module',
        description: 'Secure token issuance and verification middleware.',
      });

      expect(deliverable.project.toString()).toBe(validProjectId);
      expect(deliverable.projectId.toString()).toBe(validProjectId);
      expect(deliverable.milestone.toString()).toBe(validMilestoneId);
      expect(deliverable.milestoneId.toString()).toBe(validMilestoneId);
      expect(deliverable.title).toBe('JWT Authentication Module');
      expect(deliverable.description).toBe('Secure token issuance and verification middleware.');
      expect(deliverable.status).toBe(DELIVERABLE_STATUS.PENDING);
      expect(Array.isArray(deliverable.acceptanceCriteria)).toBe(true);

      const json = deliverable.toJSON();
      expect(json.projectId).toBeDefined();
      expect(json.milestoneId).toBeDefined();
    });

    it('should support instantiation with project and milestone fields for backward compatibility', () => {
      const deliverable = new Deliverable({
        project: validProjectId,
        milestone: validMilestoneId,
        title: 'Database Schema Design',
        scopeReference: 'REF-001',
      });

      expect(deliverable.project.toString()).toBe(validProjectId);
      expect(deliverable.milestone.toString()).toBe(validMilestoneId);
      expect(deliverable.scopeReference).toBe('REF-001');
    });

    it('should fail Mongoose validation when project reference is missing', () => {
      const deliverable = new Deliverable({
        milestoneId: validMilestoneId,
        title: 'Missing Project Deliverable',
      });

      const validationError = deliverable.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.project).toBeDefined();
      expect(validationError.errors.project.message).toMatch(/Project reference is required/i);
    });

    it('should fail Mongoose validation when milestone reference is missing', () => {
      const deliverable = new Deliverable({
        projectId: validProjectId,
        title: 'Missing Milestone Deliverable',
      });

      const validationError = deliverable.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.milestone).toBeDefined();
      expect(validationError.errors.milestone.message).toMatch(/Milestone reference is required/i);
    });

    it('should fail Mongoose validation when title is missing', () => {
      const deliverable = new Deliverable({
        projectId: validProjectId,
        milestoneId: validMilestoneId,
      });

      const validationError = deliverable.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.title).toBeDefined();
      expect(validationError.errors.title.message).toMatch(/Deliverable title is required/i);
    });

    it('should fail Mongoose validation when status is invalid', () => {
      const deliverable = new Deliverable({
        projectId: validProjectId,
        milestoneId: validMilestoneId,
        title: 'Deliverable with Invalid Status',
        status: 'unknown_status',
      });

      const validationError = deliverable.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.status).toBeDefined();
      expect(validationError.errors.status.message).toMatch(/not a valid deliverable status/i);
    });

    it('should define model name as Deliverable and register properly in Mongoose', () => {
      expect(mongoose.models.Deliverable).toBeDefined();
      expect(Deliverable.modelName).toBe('Deliverable');
    });
  });

  // =========================================================================
  // 3. MODEL RELATIONSHIPS (Project -> Milestones -> Deliverables)
  // =========================================================================
  describe('Model Relationships and Schema Integrity', () => {
    it('Milestone schema should reference Project in its project field', () => {
      const projectRef = Milestone.schema.path('project').options.ref;
      expect(projectRef).toBe('Project');
    });

    it('Milestone schema should reference Deliverable in its deliverables array', () => {
      const deliverablesRef = Milestone.schema.path('deliverables').caster.options.ref;
      expect(deliverablesRef).toBe('Deliverable');
    });

    it('Deliverable schema should reference Project in its project field', () => {
      const projectRef = Deliverable.schema.path('project').options.ref;
      expect(projectRef).toBe('Project');
    });

    it('Deliverable schema should reference Milestone in its milestone field', () => {
      const milestoneRef = Deliverable.schema.path('milestone').options.ref;
      expect(milestoneRef).toBe('Milestone');
    });

    it('Deliverable and Milestone should have timestamps enabled', () => {
      expect(Milestone.schema.options.timestamps).toBe(true);
      expect(Deliverable.schema.options.timestamps).toBe(true);
    });
  });

  // =========================================================================
  // 4. ZOD VALIDATION: MILESTONES
  // =========================================================================
  describe('Zod Validation - createMilestoneSchema', () => {
    it('should accept a valid milestone payload with projectId and ISO dueDate', () => {
      const payload = {
        projectId: validProjectId,
        title: 'Milestone 1: Prototype',
        description: 'Complete clickable prototype',
        status: MILESTONE_STATUS.IN_PROGRESS,
        dueDate: '2026-11-15T00:00:00.000Z',
        order: 1,
      };

      const result = createMilestoneSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.projectId).toBe(validProjectId);
      expect(result.data.title).toBe('Milestone 1: Prototype');
      expect(result.data.order).toBe(1);
    });

    it('should accept a valid milestone payload with YYYY-MM-DD date and project field', () => {
      const payload = {
        project: validProjectId,
        title: 'Milestone 2: Beta',
        dueDate: '2026-12-01',
      };

      const result = createMilestoneSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.project).toBe(validProjectId);
      expect(result.data.order).toBe(1); // default order applied
    });

    it('should accept a Date instance in dueDate', () => {
      const payload = {
        projectId: validProjectId,
        title: 'Milestone 3: Launch',
        dueDate: new Date(),
      };

      const result = createMilestoneSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject when both project and projectId are missing', () => {
      const payload = {
        title: 'Missing Project Milestone',
      };

      const result = createMilestoneSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const errors = result.error.errors.map((e) => e.message);
      expect(errors.some((m) => /Project reference is required/i.test(m))).toBe(true);
    });

    it('should reject invalid projectId format', () => {
      const payload = {
        projectId: 'not-a-valid-object-id',
        title: 'Invalid ID Milestone',
      };

      const result = createMilestoneSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /Invalid project ID format/i.test(e.message))).toBe(true);
    });

    it('should reject title shorter than 2 characters or missing', () => {
      const payload = {
        projectId: validProjectId,
        title: 'A',
      };

      const result = createMilestoneSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /at least 2 characters/i.test(e.message))).toBe(true);
    });

    it('should reject invalid status in milestone payload', () => {
      const payload = {
        projectId: validProjectId,
        title: 'Valid Title',
        status: 'invalid_status_value',
      };

      const result = createMilestoneSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /Status must be one of/i.test(e.message))).toBe(true);
    });

    it('should reject invalid dueDate format', () => {
      const payload = {
        projectId: validProjectId,
        title: 'Valid Title',
        dueDate: 'invalid-date-string',
      };

      const result = createMilestoneSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject non-positive or non-integer order', () => {
      const payload = {
        projectId: validProjectId,
        title: 'Valid Title',
        order: -1,
      };

      const result = createMilestoneSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /greater than 0/i.test(e.message))).toBe(true);
    });

    it('milestoneIdParamSchema should validate route params correctly', () => {
      expect(milestoneIdParamSchema.safeParse({ id: validMilestoneId }).success).toBe(true);
      expect(milestoneIdParamSchema.safeParse({ id: 'invalid-id' }).success).toBe(false);
    });
  });

  describe('Zod Validation - updateMilestoneSchema', () => {
    it('should accept an empty object for partial updates', () => {
      const result = updateMilestoneSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept valid partial milestone updates', () => {
      const result = updateMilestoneSchema.safeParse({
        title: 'Updated Milestone Title',
        description: 'Updated description',
        status: MILESTONE_STATUS.IN_PROGRESS,
        dueDate: '2026-12-15',
        order: 2,
      });
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Updated Milestone Title');
      expect(result.data.status).toBe(MILESTONE_STATUS.IN_PROGRESS);
    });

    it('should accept null to clear dueDate', () => {
      const result = updateMilestoneSchema.safeParse({ dueDate: null });
      expect(result.success).toBe(true);
      expect(result.data.dueDate).toBeNull();
    });

    it('should reject title shorter than 2 characters', () => {
      const result = updateMilestoneSchema.safeParse({ title: 'A' });
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /at least 2 characters/i.test(e.message))).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = updateMilestoneSchema.safeParse({ status: 'invalid_status' });
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /Status must be one of/i.test(e.message))).toBe(true);
    });

    it('should reject invalid dueDate format', () => {
      const result = updateMilestoneSchema.safeParse({ dueDate: 'not-a-date' });
      expect(result.success).toBe(false);
    });

    it('should reject non-positive or non-integer order', () => {
      expect(updateMilestoneSchema.safeParse({ order: 0 }).success).toBe(false);
      expect(updateMilestoneSchema.safeParse({ order: -3 }).success).toBe(false);
      expect(updateMilestoneSchema.safeParse({ order: 1.5 }).success).toBe(false);
    });
  });

  // =========================================================================
  // 5. ZOD VALIDATION: DELIVERABLES
  // =========================================================================
  describe('Zod Validation - createDeliverableSchema', () => {
    it('should accept a valid deliverable payload with projectId and milestoneId', () => {
      const payload = {
        projectId: validProjectId,
        milestoneId: validMilestoneId,
        title: 'Stripe Integration',
        description: 'Payment gateway webhooks and checkout sessions',
        status: DELIVERABLE_STATUS.IN_PROGRESS,
        acceptanceCriteria: ['Unit test coverage > 90%', 'Webhook signature verified'],
      };

      const result = createDeliverableSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.projectId).toBe(validProjectId);
      expect(result.data.milestoneId).toBe(validMilestoneId);
      expect(result.data.title).toBe('Stripe Integration');
      expect(result.data.acceptanceCriteria.length).toBe(2);
    });

    it('should accept legacy project and milestone field names', () => {
      const payload = {
        project: validProjectId,
        milestone: validMilestoneId,
        title: 'Responsive Header Navigation',
      };

      const result = createDeliverableSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.project).toBe(validProjectId);
      expect(result.data.milestone).toBe(validMilestoneId);
    });

    it('should reject when projectId is missing', () => {
      const payload = {
        milestoneId: validMilestoneId,
        title: 'Missing Project Deliverable',
      };

      const result = createDeliverableSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /Project reference is required/i.test(e.message))).toBe(true);
    });

    it('should reject when milestoneId is missing', () => {
      const payload = {
        projectId: validProjectId,
        title: 'Missing Milestone Deliverable',
      };

      const result = createDeliverableSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /Milestone reference is required/i.test(e.message))).toBe(true);
    });

    it('should reject invalid projectId format', () => {
      const payload = {
        projectId: 'bad-id',
        milestoneId: validMilestoneId,
        title: 'Valid Title',
      };

      const result = createDeliverableSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /Invalid project ID format/i.test(e.message))).toBe(true);
    });

    it('should reject invalid milestoneId format', () => {
      const payload = {
        projectId: validProjectId,
        milestoneId: 'bad-id',
        title: 'Valid Title',
      };

      const result = createDeliverableSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /Invalid milestone ID format/i.test(e.message))).toBe(true);
    });

    it('should reject deliverable title shorter than 2 characters or missing', () => {
      const payload = {
        projectId: validProjectId,
        milestoneId: validMilestoneId,
        title: 'X',
      };

      const result = createDeliverableSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /at least 2 characters/i.test(e.message))).toBe(true);
    });

    it('should reject invalid deliverable status', () => {
      const payload = {
        projectId: validProjectId,
        milestoneId: validMilestoneId,
        title: 'Valid Deliverable Title',
        status: 'not_allowed_status',
      };

      const result = createDeliverableSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /Status must be one of/i.test(e.message))).toBe(true);
    });

    it('deliverableIdParamSchema should validate route params correctly', () => {
      expect(deliverableIdParamSchema.safeParse({ id: validDeliverableId }).success).toBe(true);
      expect(deliverableIdParamSchema.safeParse({ id: 'invalid-id' }).success).toBe(false);
    });

    it('listMilestonesQuerySchema should require projectId or project and validate status enum', () => {
      expect(listMilestonesQuerySchema.safeParse({ projectId: validProjectId }).success).toBe(true);
      expect(listMilestonesQuerySchema.safeParse({ project: validProjectId, status: 'pending' }).success).toBe(true);
      expect(listMilestonesQuerySchema.safeParse({}).success).toBe(false);
      expect(listMilestonesQuerySchema.safeParse({ status: 'pending' }).success).toBe(false);
      expect(listMilestonesQuerySchema.safeParse({ projectId: 'bad-id' }).success).toBe(false);
      expect(listMilestonesQuerySchema.safeParse({ projectId: validProjectId, status: 'unknown' }).success).toBe(false);
    });

    it('listDeliverablesQuerySchema should require projectId or milestoneId and validate status enum', () => {
      expect(listDeliverablesQuerySchema.safeParse({ projectId: validProjectId }).success).toBe(true);
      expect(listDeliverablesQuerySchema.safeParse({ milestoneId: validMilestoneId }).success).toBe(true);
      expect(listDeliverablesQuerySchema.safeParse({ project: validProjectId, milestone: validMilestoneId }).success).toBe(true);
      expect(listDeliverablesQuerySchema.safeParse({}).success).toBe(false);
      expect(listDeliverablesQuerySchema.safeParse({ status: 'completed' }).success).toBe(false);
      expect(listDeliverablesQuerySchema.safeParse({ projectId: 'bad-id' }).success).toBe(false);
      expect(listDeliverablesQuerySchema.safeParse({ milestoneId: 'bad-id' }).success).toBe(false);
      expect(listDeliverablesQuerySchema.safeParse({ projectId: validProjectId, status: 'unknown' }).success).toBe(false);
    });
  });

  describe('Zod Validation - updateDeliverableSchema', () => {
    it('should accept an empty object for partial updates', () => {
      const result = updateDeliverableSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept valid partial deliverable updates', () => {
      const result = updateDeliverableSchema.safeParse({
        title: 'Updated Deliverable Title',
        description: 'Updated deliverable description',
        scopeReference: 'Section 4.1',
        status: DELIVERABLE_STATUS.COMPLETED,
        acceptanceCriteria: ['Passes integration tests', 'Reviewed by tech lead'],
      });
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Updated Deliverable Title');
      expect(result.data.status).toBe(DELIVERABLE_STATUS.COMPLETED);
      expect(result.data.acceptanceCriteria.length).toBe(2);
    });

    it('should reject title shorter than 2 characters', () => {
      const result = updateDeliverableSchema.safeParse({ title: 'X' });
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /at least 2 characters/i.test(e.message))).toBe(true);
    });

    it('should reject invalid deliverable status', () => {
      const result = updateDeliverableSchema.safeParse({ status: 'invalid_status' });
      expect(result.success).toBe(false);
      expect(result.error.errors.some((e) => /Status must be one of/i.test(e.message))).toBe(true);
    });

    it('should reject non-string items in acceptanceCriteria', () => {
      const result = updateDeliverableSchema.safeParse({ acceptanceCriteria: [123] });
      expect(result.success).toBe(false);
    });
  });
});
