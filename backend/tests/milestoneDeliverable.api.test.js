const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');
const User = require('../src/modules/auth/auth.model');
const Project = require('../src/modules/project/project.model');
const Milestone = require('../src/modules/milestone/milestone.model');
const Deliverable = require('../src/modules/deliverable/deliverable.model');
const { MILESTONE_STATUS, MILESTONE_DECISION } = require('../src/modules/milestone/milestone.constants');
const { DELIVERABLE_STATUS } = require('../src/modules/deliverable/deliverable.constants');

describe('Part 2: Milestone & Deliverable APIs, Services & Controllers', () => {
  const mockFreelancerId = new mongoose.Types.ObjectId().toString();
  const mockClientId = new mongoose.Types.ObjectId().toString();
  const mockUnrelatedUserId = new mongoose.Types.ObjectId().toString();
  const mockProjectId = new mongoose.Types.ObjectId().toString();
  const mockOtherProjectId = new mongoose.Types.ObjectId().toString();
  const mockMilestoneId = new mongoose.Types.ObjectId().toString();
  const mockDeliverableId = new mongoose.Types.ObjectId().toString();

  const freelancerToken = generateToken({ id: mockFreelancerId });
  const clientToken = generateToken({ id: mockClientId });
  const unrelatedUserToken = generateToken({ id: mockUnrelatedUserId });

  const mockFreelancerUser = {
    _id: new mongoose.Types.ObjectId(mockFreelancerId),
    name: 'Alex Freelancer',
    email: 'freelancer@test.com',
    role: 'freelancer',
  };

  const mockClientUser = {
    _id: new mongoose.Types.ObjectId(mockClientId),
    name: 'Sarah Client',
    email: 'client@test.com',
    role: 'client',
  };

  const mockUnrelatedUser = {
    _id: new mongoose.Types.ObjectId(mockUnrelatedUserId),
    name: 'Eve Intruder',
    email: 'eve@test.com',
    role: 'client',
  };

  const mockProjectDoc = {
    _id: new mongoose.Types.ObjectId(mockProjectId),
    title: 'E-Commerce Platform Redesign',
    status: 'active',
    freelancer: new mongoose.Types.ObjectId(mockFreelancerId),
    client: new mongoose.Types.ObjectId(mockClientId),
  };

  const mockOtherProjectDoc = {
    _id: new mongoose.Types.ObjectId(mockOtherProjectId),
    title: 'Unrelated CRM Platform',
    status: 'active',
    freelancer: new mongoose.Types.ObjectId(mockFreelancerId),
  };

  beforeEach(() => {
    jest.restoreAllMocks();

    // Default mock for User.findById (called in requireAuth middleware)
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      let userObj = null;
      if (idStr === mockFreelancerId) userObj = mockFreelancerUser;
      else if (idStr === mockClientId) userObj = mockClientUser;
      else if (idStr === mockUnrelatedUserId) userObj = mockUnrelatedUser;

      return {
        select: jest.fn().mockResolvedValue(userObj),
      };
    });

    // Default mock for Project.findById
    jest.spyOn(Project, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      if (idStr === mockProjectId) return Promise.resolve(mockProjectDoc);
      if (idStr === mockOtherProjectId) return Promise.resolve(mockOtherProjectDoc);
      return Promise.resolve(null);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. AUTHENTICATION GUARDS (401 Unauthorized)
  // =========================================================================
  describe('Authentication Guards', () => {
    it('POST /api/milestones should return 401 when token is missing', async () => {
      const res = await request(app).post('/api/milestones').send({
        projectId: mockProjectId,
        title: 'Sprint 1',
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/milestones/:id should return 401 when token is missing', async () => {
      const res = await request(app).get(`/api/milestones/${mockMilestoneId}`);
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/deliverables should return 401 when token is missing', async () => {
      const res = await request(app).post('/api/deliverables').send({
        projectId: mockProjectId,
        milestoneId: mockMilestoneId,
        title: 'Auth Module',
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/deliverables/:id should return 401 when token is missing', async () => {
      const res = await request(app).get(`/api/deliverables/${mockDeliverableId}`);
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/milestones/:id/evidence should return 401 when token is missing', async () => {
      const res = await request(app).post(`/api/milestones/${mockMilestoneId}/evidence`).send({
        comment: 'Work completed',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/milestones/:id/decision should return 401 when token is missing', async () => {
      const res = await request(app).post(`/api/milestones/${mockMilestoneId}/decision`).send({
        decision: 'approve',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/deliverables/:id/evidence should return 401 when token is missing', async () => {
      const res = await request(app).post(`/api/deliverables/${mockDeliverableId}/evidence`).send({
        comment: 'Deliverable completed',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // 2. CREATE MILESTONE (POST /api/milestones)
  // =========================================================================
  describe('POST /api/milestones', () => {
    it('should successfully create a milestone with projectId and return 201', async () => {
      const createdMilestoneDoc = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        projectId: mockProjectId,
        title: 'Sprint 1: Core Setup',
        description: 'Initialize DB and Auth',
        status: MILESTONE_STATUS.PENDING,
        dueDate: new Date('2026-11-15T00:00:00.000Z'),
        order: 1,
        deliverables: [],
        evidence: [],
        decisions: [],
      };

      jest.spyOn(Milestone, 'create').mockResolvedValue(createdMilestoneDoc);

      const res = await request(app)
        .post('/api/milestones')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          projectId: mockProjectId,
          title: 'Sprint 1: Core Setup',
          description: 'Initialize DB and Auth',
          dueDate: '2026-11-15T00:00:00.000Z',
          order: 1,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Milestone created successfully/i);
      expect(res.body.data.title).toBe('Sprint 1: Core Setup');
    });

    it('should accept legacy project field name and return 201', async () => {
      const createdMilestoneDoc = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        title: 'Sprint 2: UI Kit',
        status: MILESTONE_STATUS.PENDING,
        order: 2,
      };

      jest.spyOn(Milestone, 'create').mockResolvedValue(createdMilestoneDoc);

      const res = await request(app)
        .post('/api/milestones')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Sprint 2: UI Kit',
          order: 2,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 Bad Request when both projectId and project are missing', async () => {
      const res = await request(app)
        .post('/api/milestones')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          title: 'Orphaned Milestone',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should return 400 Bad Request when title is too short (< 2 chars)', async () => {
      const res = await request(app)
        .post('/api/milestones')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          projectId: mockProjectId,
          title: 'A',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 Not Found when referenced project does not exist', async () => {
      const nonExistentProjectId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/milestones')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          projectId: nonExistentProjectId,
          title: 'Valid Milestone Title',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Project not found/i);
    });
  });

  // =========================================================================
  // 3. RETRIEVE MILESTONE (GET /api/milestones/:id)
  // =========================================================================
  describe('GET /api/milestones/:id', () => {
    it('should return 200 OK with populated milestone data and deliverables', async () => {
      const mockMilestone = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        title: 'Sprint 1',
        project: mockProjectDoc,
        deliverables: [
          {
            _id: new mongoose.Types.ObjectId(mockDeliverableId),
            title: 'Design System',
            status: 'in_progress',
          },
        ],
        evidence: [],
        decisions: [],
      };

      const populateChain = {
        populate: jest.fn().mockReturnThis(),
      };
      populateChain.populate
        .mockReturnValueOnce(populateChain)
        .mockReturnValueOnce(populateChain)
        .mockReturnValueOnce(populateChain)
        .mockResolvedValueOnce(mockMilestone);

      jest.spyOn(Milestone, 'findById').mockReturnValue(populateChain);

      const res = await request(app)
        .get(`/api/milestones/${mockMilestoneId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Sprint 1');
      expect(res.body.data.deliverables.length).toBe(1);
    });

    it('should return 400 Bad Request when milestone ID format is invalid', async () => {
      const res = await request(app)
        .get('/api/milestones/not-a-valid-object-id')
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should return 404 Not Found when milestone does not exist', async () => {
      const populateChain = {
        populate: jest.fn().mockReturnThis(),
      };
      populateChain.populate
        .mockReturnValueOnce(populateChain)
        .mockReturnValueOnce(populateChain)
        .mockReturnValueOnce(populateChain)
        .mockResolvedValueOnce(null);

      jest.spyOn(Milestone, 'findById').mockReturnValue(populateChain);

      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/milestones/${nonExistentId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Milestone not found/i);
    });
  });

  // =========================================================================
  // 4. LIST MILESTONES (GET /api/milestones)
  // =========================================================================
  describe('GET /api/milestones', () => {
    it('should return 200 OK and list of milestones for a project', async () => {
      const mockList = [
        { _id: new mongoose.Types.ObjectId(), title: 'Milestone 1', order: 1 },
        { _id: new mongoose.Types.ObjectId(), title: 'Milestone 2', order: 2 },
      ];

      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockList),
      };
      jest.spyOn(Milestone, 'find').mockReturnValue(chain);

      const res = await request(app)
        .get(`/api/milestones?projectId=${mockProjectId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  // =========================================================================
  // 5. CREATE DELIVERABLE (POST /api/deliverables)
  // =========================================================================
  describe('POST /api/deliverables', () => {
    it('should successfully create a deliverable and update milestone relationship with 201', async () => {
      const mockMilestoneDoc = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        deliverables: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Milestone, 'findById').mockResolvedValue(mockMilestoneDoc);

      const mockDeliverableDoc = {
        _id: new mongoose.Types.ObjectId(mockDeliverableId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        milestone: new mongoose.Types.ObjectId(mockMilestoneId),
        title: 'Checkout Form Integration',
        description: 'Stripe element form components',
        status: DELIVERABLE_STATUS.PENDING,
        acceptanceCriteria: ['Valid card test passes'],
      };

      jest.spyOn(Deliverable, 'create').mockResolvedValue(mockDeliverableDoc);

      const res = await request(app)
        .post('/api/deliverables')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          projectId: mockProjectId,
          milestoneId: mockMilestoneId,
          title: 'Checkout Form Integration',
          description: 'Stripe element form components',
          acceptanceCriteria: ['Valid card test passes'],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Deliverable created successfully/i);
      expect(res.body.data.title).toBe('Checkout Form Integration');
      expect(mockMilestoneDoc.save).toHaveBeenCalled();
    });

    it('should return 400 Bad Request when milestone belongs to a different project', async () => {
      // Milestone belongs to mockOtherProjectId
      const mockMilestoneDoc = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockOtherProjectId),
        deliverables: [],
      };

      jest.spyOn(Milestone, 'findById').mockResolvedValue(mockMilestoneDoc);

      const res = await request(app)
        .post('/api/deliverables')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          projectId: mockProjectId, // mismatched project!
          milestoneId: mockMilestoneId,
          title: 'Cross Project Deliverable Attempt',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Milestone does not belong to the specified project/i);
    });

    it('should return 404 Not Found when referenced project does not exist', async () => {
      const nonExistentProjectId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/deliverables')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          projectId: nonExistentProjectId,
          milestoneId: mockMilestoneId,
          title: 'Valid Deliverable Title',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/Project not found/i);
    });

    it('should return 404 Not Found when referenced milestone does not exist', async () => {
      jest.spyOn(Milestone, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/deliverables')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          projectId: mockProjectId,
          milestoneId: mockMilestoneId,
          title: 'Valid Deliverable Title',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/Milestone not found/i);
    });

    it('should return 400 Bad Request when required title is missing', async () => {
      const res = await request(app)
        .post('/api/deliverables')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          projectId: mockProjectId,
          milestoneId: mockMilestoneId,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 6. RETRIEVE DELIVERABLE (GET /api/deliverables/:id)
  // =========================================================================
  describe('GET /api/deliverables/:id', () => {
    it('should return 200 OK with populated deliverable data', async () => {
      const mockDeliverable = {
        _id: new mongoose.Types.ObjectId(mockDeliverableId),
        title: 'API Gateway',
        project: mockProjectDoc,
        milestone: {
          _id: new mongoose.Types.ObjectId(mockMilestoneId),
          title: 'Sprint 1',
        },
        status: DELIVERABLE_STATUS.PENDING,
      };

      const populateChain = {
        populate: jest.fn().mockReturnThis(),
      };
      populateChain.populate
        .mockReturnValueOnce(populateChain)
        .mockReturnValueOnce(populateChain)
        .mockResolvedValueOnce(mockDeliverable);

      jest.spyOn(Deliverable, 'findById').mockReturnValue(populateChain);

      const res = await request(app)
        .get(`/api/deliverables/${mockDeliverableId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('API Gateway');
    });

    it('should return 400 Bad Request when ID is not a valid ObjectId', async () => {
      const res = await request(app)
        .get('/api/deliverables/bad-id-string')
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 Not Found when deliverable does not exist', async () => {
      const populateChain = {
        populate: jest.fn().mockReturnThis(),
      };
      populateChain.populate
        .mockReturnValueOnce(populateChain)
        .mockReturnValueOnce(populateChain)
        .mockResolvedValueOnce(null);

      jest.spyOn(Deliverable, 'findById').mockReturnValue(populateChain);

      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/deliverables/${nonExistentId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/Deliverable not found/i);
    });
  });

  // =========================================================================
  // 7. LIST DELIVERABLES (GET /api/deliverables)
  // =========================================================================
  describe('GET /api/deliverables', () => {
    it('should return 200 OK and list deliverables filtered by milestone', async () => {
      jest.spyOn(Milestone, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
      });

      const mockList = [
        { _id: new mongoose.Types.ObjectId(), title: 'Deliverable A' },
        { _id: new mongoose.Types.ObjectId(), title: 'Deliverable B' },
      ];

      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockList),
      };
      jest.spyOn(Deliverable, 'find').mockReturnValue(chain);

      const res = await request(app)
        .get(`/api/deliverables?milestoneId=${mockMilestoneId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  // =========================================================================
  // 8. EVIDENCE AND PROGRESS WORKFLOW
  // =========================================================================
  describe('Evidence and Progress Workflow', () => {
    it('POST /api/milestones/:id/evidence should add evidence with comment/fileUrls and update status to submitted', async () => {
      const mockMilestone = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        status: MILESTONE_STATUS.IN_PROGRESS,
        evidence: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Milestone, 'findById').mockResolvedValue(mockMilestone);

      const res = await request(app)
        .post(`/api/milestones/${mockMilestoneId}/evidence`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          comment: 'Completed Sprint 1 deliverables. Demo video attached.',
          fileUrls: ['https://storage.scopepilot.dev/demo.mp4'],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Milestone evidence submitted successfully/i);
      expect(mockMilestone.status).toBe(MILESTONE_STATUS.SUBMITTED);
      expect(mockMilestone.evidence.length).toBe(1);
      expect(mockMilestone.save).toHaveBeenCalled();
    });

    it('POST /api/milestones/:id/evidence should accept content and reference aliases', async () => {
      const mockMilestone = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        status: MILESTONE_STATUS.IN_PROGRESS,
        evidence: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Milestone, 'findById').mockResolvedValue(mockMilestone);

      const res = await request(app)
        .post(`/api/milestones/${mockMilestoneId}/evidence`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          content: 'Delivered prototype for client review',
          reference: 'https://staging.clientapp.com',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockMilestone.status).toBe(MILESTONE_STATUS.SUBMITTED);
      expect(mockMilestone.evidence[0].comment).toBe('Delivered prototype for client review');
    });

    it('POST /api/milestones/:id/evidence should return 400 when comment/content is missing', async () => {
      const res = await request(app)
        .post(`/api/milestones/${mockMilestoneId}/evidence`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          fileUrls: ['https://storage.scopepilot.dev/file.pdf'],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/deliverables/:id/evidence should add evidence to deliverable and return 200', async () => {
      const mockDeliverable = {
        _id: new mongoose.Types.ObjectId(mockDeliverableId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        status: DELIVERABLE_STATUS.IN_PROGRESS,
        evidence: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Deliverable, 'findById').mockResolvedValue(mockDeliverable);

      const res = await request(app)
        .post(`/api/deliverables/${mockDeliverableId}/evidence`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          comment: 'Storybook component library deployed and verified',
          fileUrls: ['https://storybook.example.com'],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Deliverable evidence submitted successfully/i);
      expect(mockDeliverable.evidence.length).toBe(1);
      expect(mockDeliverable.status).toBe(DELIVERABLE_STATUS.COMPLETED);
      expect(mockDeliverable.save).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. MILESTONE DECISION / REVIEW (POST /api/milestones/:id/decision)
  // =========================================================================
  describe('POST /api/milestones/:id/decision', () => {
    it('Client should successfully approve milestone and set status to approved', async () => {
      const mockMilestone = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        status: MILESTONE_STATUS.SUBMITTED,
        decisions: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Milestone, 'findById').mockResolvedValue(mockMilestone);

      const res = await request(app)
        .post(`/api/milestones/${mockMilestoneId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: MILESTONE_DECISION.APPROVE,
          comment: 'Outstanding quality on sprint deliverables.',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Milestone decision recorded successfully/i);
      expect(mockMilestone.status).toBe(MILESTONE_STATUS.APPROVED);
      expect(mockMilestone.decisions.length).toBe(1);
      expect(mockMilestone.decisions[0].decision).toBe('approve');
      expect(mockMilestone.decisions[0].decidedBy.toString()).toBe(mockClientId);
      expect(mockMilestone.save).toHaveBeenCalled();
    });

    it('Client should successfully reject milestone and set status to rejected', async () => {
      const mockMilestone = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        status: MILESTONE_STATUS.SUBMITTED,
        decisions: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Milestone, 'findById').mockResolvedValue(mockMilestone);

      const res = await request(app)
        .post(`/api/milestones/${mockMilestoneId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: MILESTONE_DECISION.REJECT,
          comment: 'Accessibility criteria not satisfied. Please revise.',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockMilestone.status).toBe(MILESTONE_STATUS.REJECTED);
      expect(mockMilestone.decisions[0].decision).toBe('reject');
    });

    it('Unrelated user should receive 403 Forbidden when attempting to record decision', async () => {
      const mockMilestone = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        status: MILESTONE_STATUS.SUBMITTED,
        decisions: [],
      };

      jest.spyOn(Milestone, 'findById').mockResolvedValue(mockMilestone);

      const res = await request(app)
        .post(`/api/milestones/${mockMilestoneId}/decision`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          decision: 'approve',
          comment: 'Intruder approval',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
    });

    it('should return 400 Bad Request when decision value is invalid', async () => {
      const res = await request(app)
        .post(`/api/milestones/${mockMilestoneId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: 'maybe',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  // =========================================================================
  // 10. UPDATE OPERATIONS (PATCH /api/milestones/:id & PATCH /api/deliverables/:id)
  // =========================================================================
  describe('Update Operations (PATCH)', () => {
    it('PATCH /api/milestones/:id should successfully update milestone details', async () => {
      const mockMilestone = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        title: 'Original Title',
        description: 'Original Description',
        order: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Milestone, 'findById').mockResolvedValue(mockMilestone);

      const res = await request(app)
        .patch(`/api/milestones/${mockMilestoneId}`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          title: 'Updated Milestone Title',
          description: 'Updated Scope Description',
          order: 2,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Milestone updated successfully/i);
      expect(mockMilestone.title).toBe('Updated Milestone Title');
      expect(mockMilestone.order).toBe(2);
      expect(mockMilestone.save).toHaveBeenCalled();
    });

    it('PATCH /api/milestones/:id should return 404 when milestone does not exist', async () => {
      jest.spyOn(Milestone, 'findById').mockResolvedValue(null);

      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/milestones/${nonExistentId}`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/Milestone not found/i);
    });

    it('PATCH /api/deliverables/:id should successfully update deliverable details', async () => {
      const mockDeliverable = {
        _id: new mongoose.Types.ObjectId(mockDeliverableId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        title: 'Original Deliverable Title',
        status: DELIVERABLE_STATUS.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Deliverable, 'findById').mockResolvedValue(mockDeliverable);

      const res = await request(app)
        .patch(`/api/deliverables/${mockDeliverableId}`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          title: 'Updated Deliverable Title',
          status: DELIVERABLE_STATUS.IN_PROGRESS,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDeliverable.title).toBe('Updated Deliverable Title');
      expect(mockDeliverable.status).toBe(DELIVERABLE_STATUS.IN_PROGRESS);
      expect(mockDeliverable.save).toHaveBeenCalled();
    });

    it('PATCH /api/deliverables/:id should return 404 when deliverable does not exist', async () => {
      jest.spyOn(Deliverable, 'findById').mockResolvedValue(null);

      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/deliverables/${nonExistentId}`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          title: 'Updated Deliverable Title',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/Deliverable not found/i);
    });
  });

  // =========================================================================
  // 11. CROSS-PROJECT SECURITY & AUTHORIZATION (403 Forbidden)
  // =========================================================================
  describe('Cross-Project Security & Authorization', () => {
    it('Unrelated user should receive 403 Forbidden when creating a milestone on another user\'s project', async () => {
      const res = await request(app)
        .post('/api/milestones')
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          projectId: mockProjectId,
          title: 'Unauthorized Milestone',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });

    it('Unrelated user should receive 403 Forbidden when retrieving a milestone of another project', async () => {
      const mockMilestone = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        title: 'Confidential Milestone',
        project: mockProjectDoc,
        deliverables: [],
        evidence: [],
        decisions: [],
      };

      const populateChain = {
        populate: jest.fn().mockReturnThis(),
      };
      populateChain.populate
        .mockReturnValueOnce(populateChain)
        .mockReturnValueOnce(populateChain)
        .mockReturnValueOnce(populateChain)
        .mockResolvedValueOnce(mockMilestone);

      jest.spyOn(Milestone, 'findById').mockReturnValue(populateChain);

      const res = await request(app)
        .get(`/api/milestones/${mockMilestoneId}`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });

    it('Unrelated user should receive 403 Forbidden when updating a milestone of another project', async () => {
      const mockMilestone = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        title: 'Original Title',
      };

      jest.spyOn(Milestone, 'findById').mockResolvedValue(mockMilestone);

      const res = await request(app)
        .patch(`/api/milestones/${mockMilestoneId}`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          title: 'Tampered Title',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });

    it('Unrelated user should receive 403 Forbidden when submitting evidence on another project\'s milestone', async () => {
      const mockMilestone = {
        _id: new mongoose.Types.ObjectId(mockMilestoneId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        status: MILESTONE_STATUS.IN_PROGRESS,
        evidence: [],
      };

      jest.spyOn(Milestone, 'findById').mockResolvedValue(mockMilestone);

      const res = await request(app)
        .post(`/api/milestones/${mockMilestoneId}/evidence`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          comment: 'Intruder evidence attempt',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });

    it('Unrelated user should receive 403 Forbidden when creating a deliverable on another project', async () => {
      const res = await request(app)
        .post('/api/deliverables')
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          projectId: mockProjectId,
          milestoneId: mockMilestoneId,
          title: 'Intruder Deliverable',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });

    it('Unrelated user should receive 403 Forbidden when retrieving a deliverable of another project', async () => {
      const mockDeliverable = {
        _id: new mongoose.Types.ObjectId(mockDeliverableId),
        title: 'Confidential Deliverable',
        project: mockProjectDoc,
        milestone: { _id: new mongoose.Types.ObjectId(mockMilestoneId), title: 'M1' },
      };

      const populateChain = {
        populate: jest.fn().mockReturnThis(),
      };
      populateChain.populate
        .mockReturnValueOnce(populateChain)
        .mockReturnValueOnce(populateChain)
        .mockResolvedValueOnce(mockDeliverable);

      jest.spyOn(Deliverable, 'findById').mockReturnValue(populateChain);

      const res = await request(app)
        .get(`/api/deliverables/${mockDeliverableId}`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });

    it('Unrelated user should receive 403 Forbidden when updating a deliverable of another project', async () => {
      const mockDeliverable = {
        _id: new mongoose.Types.ObjectId(mockDeliverableId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        title: 'Original Deliverable',
      };

      jest.spyOn(Deliverable, 'findById').mockResolvedValue(mockDeliverable);

      const res = await request(app)
        .patch(`/api/deliverables/${mockDeliverableId}`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          title: 'Tampered Deliverable',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });

    it('Unrelated user should receive 403 Forbidden when submitting evidence on another project\'s deliverable', async () => {
      const mockDeliverable = {
        _id: new mongoose.Types.ObjectId(mockDeliverableId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        status: DELIVERABLE_STATUS.IN_PROGRESS,
        evidence: [],
      };

      jest.spyOn(Deliverable, 'findById').mockResolvedValue(mockDeliverable);

      const res = await request(app)
        .post(`/api/deliverables/${mockDeliverableId}/evidence`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          comment: 'Intruder deliverable evidence',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });
  });
});
