const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');
const User = require('../src/modules/auth/auth.model');
const Project = require('../src/modules/project/project.model');
const Workspace = require('../src/modules/workspace/workspace.model');
const Milestone = require('../src/modules/milestone/milestone.model');
const Deliverable = require('../src/modules/deliverable/deliverable.model');
const ChangeRequest = require('../src/modules/changeRequest/changeRequest.model');
const {
  CHANGE_REQUEST_STATUS,
  CHANGE_REQUEST_DECISION,
} = require('../src/modules/changeRequest/changeRequest.constants');

const makePopulateQuery = (doc) => {
  const query = Promise.resolve(doc);
  query.populate = jest.fn().mockImplementation(() => query);
  return query;
};

describe('Change Request Security & Tenancy (Task 1)', () => {
  const mockFreelancerId = new mongoose.Types.ObjectId().toString();
  const mockClientId = new mongoose.Types.ObjectId().toString();
  const mockUnrelatedUserId = new mongoose.Types.ObjectId().toString();
  const mockWorkspaceOwnerId = new mongoose.Types.ObjectId().toString();
  const mockWorkspaceAdminId = new mongoose.Types.ObjectId().toString();
  const mockAdminId = new mongoose.Types.ObjectId().toString();

  const mockProjectId = new mongoose.Types.ObjectId().toString();
  const mockOtherProjectId = new mongoose.Types.ObjectId().toString();
  const mockWorkspaceId = new mongoose.Types.ObjectId().toString();
  const mockChangeRequestId = new mongoose.Types.ObjectId().toString();
  const mockMilestoneId = new mongoose.Types.ObjectId().toString();
  const mockForeignMilestoneId = new mongoose.Types.ObjectId().toString();
  const mockDeliverableId = new mongoose.Types.ObjectId().toString();
  const mockForeignDeliverableId = new mongoose.Types.ObjectId().toString();

  const freelancerToken = generateToken({ id: mockFreelancerId });
  const clientToken = generateToken({ id: mockClientId });
  const unrelatedUserToken = generateToken({ id: mockUnrelatedUserId });
  const workspaceOwnerToken = generateToken({ id: mockWorkspaceOwnerId });
  const workspaceAdminToken = generateToken({ id: mockWorkspaceAdminId });
  const adminToken = generateToken({ id: mockAdminId });

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

  const mockWorkspaceOwnerUser = {
    _id: new mongoose.Types.ObjectId(mockWorkspaceOwnerId),
    name: 'Oliver Owner',
    email: 'owner@test.com',
    role: 'client',
  };

  const mockWorkspaceAdminUser = {
    _id: new mongoose.Types.ObjectId(mockWorkspaceAdminId),
    name: 'Adam Admin',
    email: 'wsadmin@test.com',
    role: 'client',
  };

  const mockAdminUser = {
    _id: new mongoose.Types.ObjectId(mockAdminId),
    name: 'System Admin',
    email: 'admin@test.com',
    role: 'admin',
  };

  const mockWorkspaceDoc = {
    _id: new mongoose.Types.ObjectId(mockWorkspaceId),
    name: 'Acme Workspace',
    owner: new mongoose.Types.ObjectId(mockWorkspaceOwnerId),
    members: [
      { user: new mongoose.Types.ObjectId(mockWorkspaceOwnerId), role: 'owner' },
      { user: new mongoose.Types.ObjectId(mockWorkspaceAdminId), role: 'admin' },
      { user: new mongoose.Types.ObjectId(mockFreelancerId), role: 'member' },
      { user: new mongoose.Types.ObjectId(mockClientId), role: 'member' },
    ],
  };

  const mockProjectDoc = {
    _id: new mongoose.Types.ObjectId(mockProjectId),
    title: 'ScopePilot Mobile Application',
    status: 'active',
    freelancer: new mongoose.Types.ObjectId(mockFreelancerId),
    client: new mongoose.Types.ObjectId(mockClientId),
    workspace: new mongoose.Types.ObjectId(mockWorkspaceId),
  };

  const mockOtherProjectDoc = {
    _id: new mongoose.Types.ObjectId(mockOtherProjectId),
    title: 'Different Project Platform',
    status: 'active',
    freelancer: new mongoose.Types.ObjectId(mockUnrelatedUserId),
    client: new mongoose.Types.ObjectId(mockUnrelatedUserId),
  };

  beforeEach(() => {
    jest.restoreAllMocks();

    // Mock User.findById for requireAuth middleware
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      let userObj = null;
      if (idStr === mockFreelancerId) userObj = mockFreelancerUser;
      else if (idStr === mockClientId) userObj = mockClientUser;
      else if (idStr === mockUnrelatedUserId) userObj = mockUnrelatedUser;
      else if (idStr === mockWorkspaceOwnerId) userObj = mockWorkspaceOwnerUser;
      else if (idStr === mockWorkspaceAdminId) userObj = mockWorkspaceAdminUser;
      else if (idStr === mockAdminId) userObj = mockAdminUser;

      return {
        select: jest.fn().mockResolvedValue(userObj),
      };
    });

    // Mock Project.findById
    jest.spyOn(Project, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      if (idStr === mockProjectId) return Promise.resolve(mockProjectDoc);
      if (idStr === mockOtherProjectId) return Promise.resolve(mockOtherProjectDoc);
      return Promise.resolve(null);
    });

    // Mock Workspace.findById
    jest.spyOn(Workspace, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      if (idStr === mockWorkspaceId) return Promise.resolve(mockWorkspaceDoc);
      return Promise.resolve(null);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. AUTHENTICATION & INPUT VALIDATION
  // =========================================================================
  describe('Authentication & Validation', () => {
    it('POST /api/change-requests should return 401 when token is missing', async () => {
      const res = await request(app).post('/api/change-requests').send({
        project: mockProjectId,
        title: 'Feature addition',
        description: 'Adding dark mode support',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token/i);
    });

    it('GET /api/change-requests/:id should return 401 when token is missing', async () => {
      const res = await request(app).get(`/api/change-requests/${mockChangeRequestId}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/change-requests/:id/decision should return 401 when token is missing', async () => {
      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .send({ decision: CHANGE_REQUEST_DECISION.APPROVE });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/change-requests/:id should return 400 when ID format is invalid', async () => {
      const res = await request(app)
        .get('/api/change-requests/not-a-valid-id')
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /Invalid change request ID format/i.test(e.message))).toBe(true);
    });

    it('POST /api/change-requests/:id/decision should return 400 when ID format is invalid', async () => {
      const res = await request(app)
        .post('/api/change-requests/invalid-hex-id/decision')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ decision: CHANGE_REQUEST_DECISION.APPROVE });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /Invalid change request ID format/i.test(e.message))).toBe(true);
    });

    it('POST /api/change-requests/:id/decision should return 400 when decision value is invalid', async () => {
      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ decision: 'maybe' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /Decision must be either/i.test(e.message))).toBe(true);
    });

    it('POST /api/change-requests should return 400 when title is missing or too short', async () => {
      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'A',
          description: 'Valid description here',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /at least 2 characters/i.test(e.message))).toBe(true);
    });

    it('POST /api/change-requests should return 400 when description is missing or too short', async () => {
      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Valid Title',
          description: 'tiny',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /at least 5 characters/i.test(e.message))).toBe(true);
    });

    it('POST /api/change-requests should return 400 when project reference is missing', async () => {
      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          title: 'Missing Project Reference',
          description: 'Change request without project reference',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /Project reference is required/i.test(e.message))).toBe(true);
    });

    it('POST /api/change-requests should return 400 when project reference has invalid format', async () => {
      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: 'invalid-id-format',
          title: 'Invalid Project Format',
          description: 'Valid description here',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /Invalid project ID format/i.test(e.message))).toBe(true);
    });
  });

  // =========================================================================
  // 2. CREATION & RESOURCE AUTHORIZATION
  // =========================================================================
  describe('Creation & Resource Authorization', () => {
    it('Assigned freelancer should successfully create a change request', async () => {
      const createdDoc = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        title: 'Add Payment Integration',
        description: 'Stripe gateway integration for automated billing',
        status: CHANGE_REQUEST_STATUS.PENDING_ESTIMATE,
        effortEstimate: 16,
        priceAdjustment: 1200,
      };

      jest.spyOn(ChangeRequest, 'create').mockResolvedValue(createdDoc);

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Add Payment Integration',
          description: 'Stripe gateway integration for automated billing',
          effortEstimate: 16,
          priceAdjustment: 1200,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Add Payment Integration');
      expect(res.body.message).toMatch(/submitted successfully/i);
    });

    it('Should accept projectId alias as project reference', async () => {
      const createdDoc = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        title: 'Push Notifications',
        description: 'Integrate FCM push notification service',
        status: CHANGE_REQUEST_STATUS.PENDING_ESTIMATE,
      };

      jest.spyOn(ChangeRequest, 'create').mockResolvedValue(createdDoc);

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          projectId: mockProjectId,
          title: 'Push Notifications',
          description: 'Integrate FCM push notification service',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Push Notifications');
    });

    it('Should return 404 Not Found when target project does not exist', async () => {
      const nonExistentProjectId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: nonExistentProjectId,
          title: 'Phantom Project CR',
          description: 'This project does not exist in DB',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Project not found/i);
    });

    it('Outsider user should receive 403 Forbidden when attempting to create CR on unassigned project', async () => {
      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          project: mockProjectId,
          title: 'Unauthorized Intrusion',
          description: 'Attempting to inject CR into another tenant project',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });

    it('Should return 400 Bad Request if affectedMilestones references a milestone belonging to another project', async () => {
      jest.spyOn(Milestone, 'find').mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(mockForeignMilestoneId),
          project: new mongoose.Types.ObjectId(mockOtherProjectId), // foreign project!
        },
      ]);

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Cross Project Injection',
          description: 'Attempting to link milestone from another project',
          affectedMilestones: [mockForeignMilestoneId],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not belong to this project/i);
    });

    it('Should return 400 Bad Request if affectedMilestones contains non-existent milestone ID', async () => {
      jest.spyOn(Milestone, 'find').mockResolvedValue([]); // not found

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Missing Milestone Link',
          description: 'Attempting to link nonexistent milestone',
          affectedMilestones: [mockMilestoneId],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not belong to this project/i);
    });

    it('Should return 400 Bad Request if relatedDeliverables references a deliverable belonging to another project', async () => {
      jest.spyOn(Deliverable, 'find').mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(mockForeignDeliverableId),
          project: new mongoose.Types.ObjectId(mockOtherProjectId), // foreign project!
        },
      ]);

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Foreign Deliverable Link',
          description: 'Attempting to link foreign deliverable',
          relatedDeliverables: [mockForeignDeliverableId],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not belong to this project/i);
    });

    it('Should return 400 Bad Request if relatedDeliverables contains non-existent deliverable ID', async () => {
      jest.spyOn(Deliverable, 'find').mockResolvedValue([]);

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Missing Deliverable Link',
          description: 'Attempting to link nonexistent deliverable',
          relatedDeliverables: [mockDeliverableId],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not belong to this project/i);
    });

    it('Should succeed when valid in-project milestones and deliverables are referenced', async () => {
      jest.spyOn(Milestone, 'find').mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(mockMilestoneId),
          project: new mongoose.Types.ObjectId(mockProjectId),
        },
      ]);

      jest.spyOn(Deliverable, 'find').mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(mockDeliverableId),
          project: new mongoose.Types.ObjectId(mockProjectId),
        },
      ]);

      const createdDoc = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: new mongoose.Types.ObjectId(mockProjectId),
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        title: 'Scoped Change Request',
        description: 'Properly scoped to project milestones and deliverables',
        affectedMilestones: [mockMilestoneId],
        relatedDeliverables: [mockDeliverableId],
      };

      jest.spyOn(ChangeRequest, 'create').mockResolvedValue(createdDoc);

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Scoped Change Request',
          description: 'Properly scoped to project milestones and deliverables',
          affectedMilestones: [mockMilestoneId],
          relatedDeliverables: [mockDeliverableId],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Scoped Change Request');
    });
  });

  // =========================================================================
  // 3. RETRIEVAL & TENANCY SCOPING
  // =========================================================================
  describe('Retrieval & Tenancy Scoping', () => {
    it('Assigned freelancer should successfully retrieve change request', async () => {
      const mockChangeRequestDoc = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: mockFreelancerUser,
        title: 'Payment Integration',
        description: 'Stripe gateway integration',
        status: CHANGE_REQUEST_STATUS.PENDING_ESTIMATE,
      };

      jest
        .spyOn(ChangeRequest, 'findById')
        .mockReturnValue(makePopulateQuery(mockChangeRequestDoc));

      const res = await request(app)
        .get(`/api/change-requests/${mockChangeRequestId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Payment Integration');
    });

    it('Assigned client should successfully retrieve change request', async () => {
      const mockChangeRequestDoc = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: mockFreelancerUser,
        title: 'Payment Integration',
        description: 'Stripe gateway integration',
        status: CHANGE_REQUEST_STATUS.PENDING_ESTIMATE,
      };

      jest
        .spyOn(ChangeRequest, 'findById')
        .mockReturnValue(makePopulateQuery(mockChangeRequestDoc));

      const res = await request(app)
        .get(`/api/change-requests/${mockChangeRequestId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Workspace owner should successfully retrieve change request', async () => {
      const mockChangeRequestDoc = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: mockFreelancerUser,
        title: 'Payment Integration',
      };

      jest
        .spyOn(ChangeRequest, 'findById')
        .mockReturnValue(makePopulateQuery(mockChangeRequestDoc));

      const res = await request(app)
        .get(`/api/change-requests/${mockChangeRequestId}`)
        .set('Authorization', `Bearer ${workspaceOwnerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('System Admin should successfully retrieve change request', async () => {
      const mockChangeRequestDoc = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: mockFreelancerUser,
        title: 'Payment Integration',
      };

      jest
        .spyOn(ChangeRequest, 'findById')
        .mockReturnValue(makePopulateQuery(mockChangeRequestDoc));

      const res = await request(app)
        .get(`/api/change-requests/${mockChangeRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Outsider user should receive 403 Forbidden when attempting to retrieve change request', async () => {
      const mockChangeRequestDoc = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: mockFreelancerUser,
        title: 'Payment Integration',
      };

      jest
        .spyOn(ChangeRequest, 'findById')
        .mockReturnValue(makePopulateQuery(mockChangeRequestDoc));

      const res = await request(app)
        .get(`/api/change-requests/${mockChangeRequestId}`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });

    it('Should return 404 Not Found when change request does not exist', async () => {
      jest.spyOn(ChangeRequest, 'findById').mockReturnValue(makePopulateQuery(null));

      const res = await request(app)
        .get(`/api/change-requests/${mockChangeRequestId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Change request not found/i);
    });
  });

  // =========================================================================
  // 4. DECISION RECORDING & SELF-APPROVAL PREVENTION
  // =========================================================================
  describe('Decision Recording & Self-Approval Prevention', () => {
    it('Assigned client should successfully approve a change request', async () => {
      const mockChangeRequest = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockChangeRequest);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
          comment: 'Approved for sprint 2 execution',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/decision recorded successfully/i);
      expect(mockChangeRequest.status).toBe(CHANGE_REQUEST_STATUS.APPROVED);
      expect(mockChangeRequest.clientDecision).toBeDefined();
      expect(mockChangeRequest.clientDecision.decision).toBe('approve');
      expect(mockChangeRequest.clientDecision.comment).toBe('Approved for sprint 2 execution');
      expect(mockChangeRequest.clientDecision.decidedBy.toString()).toBe(mockClientId);
      expect(mockChangeRequest.save).toHaveBeenCalled();
    });

    it('Assigned client should successfully reject a change request', async () => {
      const mockChangeRequest = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockChangeRequest);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.REJECT,
          comment: 'Cost adjustment exceeds budget limit',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockChangeRequest.status).toBe(CHANGE_REQUEST_STATUS.REJECTED);
      expect(mockChangeRequest.clientDecision.decision).toBe('reject');
      expect(mockChangeRequest.clientDecision.comment).toBe('Cost adjustment exceeds budget limit');
      expect(mockChangeRequest.save).toHaveBeenCalled();
    });

    it('Freelancer role should receive 403 Forbidden when attempting to approve a change request', async () => {
      const mockChangeRequest = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockChangeRequest);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
          comment: 'Attempting self-approval as freelancer',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
    });

    it('Assigned project freelancer should receive 403 Forbidden when attempting to reject a change request', async () => {
      const mockChangeRequest = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockChangeRequest);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.REJECT,
          comment: 'Self rejection attempt',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
    });

    it('Requester self-approval should be rejected with 403 Forbidden even if user is client', async () => {
      // Suppose client created the change request
      const mockClientRequestedCR = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockClientId), // client requested it
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockClientRequestedCR);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
          comment: 'Client trying to self-approve own CR',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
    });

    it('Outsider user should receive 403 Forbidden when attempting to record decision', async () => {
      const mockChangeRequest = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockChangeRequest);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
          comment: 'Intruder approval',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
    });

    it('Workspace owner should successfully approve a change request', async () => {
      const mockChangeRequest = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockChangeRequest);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${workspaceOwnerToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
          comment: 'Workspace owner authorized approval',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockChangeRequest.status).toBe(CHANGE_REQUEST_STATUS.APPROVED);
      expect(mockChangeRequest.clientDecision.decidedBy.toString()).toBe(mockWorkspaceOwnerId);
    });

    it('Workspace admin should successfully approve a change request', async () => {
      const mockChangeRequest = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockChangeRequest);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${workspaceAdminToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
          comment: 'Workspace admin authorized approval',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockChangeRequest.status).toBe(CHANGE_REQUEST_STATUS.APPROVED);
      expect(mockChangeRequest.clientDecision.decidedBy.toString()).toBe(mockWorkspaceAdminId);
    });

    it('System Admin should successfully approve a change request', async () => {
      const mockChangeRequest = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockChangeRequest);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
          comment: 'System admin override approval',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockChangeRequest.status).toBe(CHANGE_REQUEST_STATUS.APPROVED);
      expect(mockChangeRequest.clientDecision.decidedBy.toString()).toBe(mockAdminId);
    });

    it('Should return 404 Not Found when change request to decide on does not exist', async () => {
      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Change request not found/i);
    });

    it('Should return 404 Not Found when associated project does not exist during decision', async () => {
      const nonExistentProjId = new mongoose.Types.ObjectId().toString();
      const mockCRWithMissingProject = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: new mongoose.Types.ObjectId(nonExistentProjId),
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockCRWithMissingProject);
      jest.spyOn(Project, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Project not found/i);
    });
  });

  // =========================================================================
  // 5. MASS-ASSIGNMENT & IDENTITY SAFEGUARDS
  // =========================================================================
  describe('Mass-Assignment & Identity Safeguards', () => {
    it('Client-supplied requester identity cannot override authenticated identity', async () => {
      let capturedCreationPayload = null;
      jest.spyOn(ChangeRequest, 'create').mockImplementation((payload) => {
        capturedCreationPayload = payload;
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(mockChangeRequestId),
          ...payload,
        });
      });

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Tampering Requester Test',
          description: 'Attempting to inject a different requestedBy ID',
          requestedBy: mockUnrelatedUserId, // spoofed requester!
        });

      expect(res.statusCode).toBe(201);
      expect(capturedCreationPayload).toBeDefined();
      expect(capturedCreationPayload.requestedBy.toString()).toBe(mockFreelancerId);
      expect(capturedCreationPayload.requestedBy.toString()).not.toBe(mockUnrelatedUserId);
    });

    it('Protected status "approved" cannot be mass-assigned on creation', async () => {
      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Pre-Approved Exploit',
          description: 'Attempting to bypass review via status injection',
          status: 'approved',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('Protected status "rejected" cannot be mass-assigned on creation', async () => {
      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Pre-Rejected Exploit',
          description: 'Attempting to set rejected status on creation',
          status: 'rejected',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Protected decision fields in create payload are not assigned on creation', async () => {
      let capturedCreationPayload = null;
      jest.spyOn(ChangeRequest, 'create').mockImplementation((payload) => {
        capturedCreationPayload = payload;
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(mockChangeRequestId),
          ...payload,
        });
      });

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Decision Injection Attempt',
          description: 'Attempting to insert clientDecision at creation time',
          decision: { decision: 'approve', decidedBy: mockClientId },
          clientDecision: { decision: 'approve', decidedBy: mockClientId },
        });

      expect(res.statusCode).toBe(201);
      expect(capturedCreationPayload.decision).toBeUndefined();
      expect(capturedCreationPayload.clientDecision).toBeUndefined();
    });
  });

  // =========================================================================
  // 6. NUMERIC & VALUE VALIDATION
  // =========================================================================
  describe('Numeric & Value Validation', () => {
    it('Should reject negative effortEstimate with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Negative Effort Test',
          description: 'Testing invalid negative effort estimate',
          effortEstimate: -10,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /effort/i.test(e.field) || /negative/i.test(e.message))).toBe(true);
    });

    it('Should reject negative priceAdjustment with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Negative Price Test',
          description: 'Testing invalid negative price adjustment',
          priceAdjustment: -500,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /price/i.test(e.field) || /negative/i.test(e.message))).toBe(true);
    });

    it('Should reject non-numeric effortEstimate with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'String Effort Test',
          description: 'Testing string passed to numeric effort',
          effortEstimate: 'fourteen days',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 7. LIFECYCLE TRANSITIONS & FINALIZED STATE GUARDS
  // =========================================================================
  describe('Lifecycle Transitions & Finalized State Guards', () => {
    it('Should reject decision on an already APPROVED change request with 409 Conflict', async () => {
      const mockApprovedCR = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.APPROVED,
        clientDecision: { decision: 'approve', decidedAt: new Date(), decidedBy: mockClientId },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockApprovedCR);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.REJECT,
          comment: 'Attempting to reverse approved decision',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/finalized/i);
      expect(mockApprovedCR.save).not.toHaveBeenCalled();
    });

    it('Should reject decision on an already REJECTED change request with 409 Conflict', async () => {
      const mockRejectedCR = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.REJECTED,
        clientDecision: { decision: 'reject', decidedAt: new Date(), decidedBy: mockClientId },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockRejectedCR);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
          comment: 'Attempting to flip rejected to approved',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/finalized/i);
    });

    it('Should reject decision on an already IMPLEMENTED change request with 409 Conflict', async () => {
      const mockImplementedCR = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.IMPLEMENTED,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockImplementedCR);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.REJECT,
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/finalized/i);
    });

    it('Should reject decision on a DRAFT change request with 400 Bad Request', async () => {
      const mockDraftCR = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.DRAFT,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockDraftCR);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: CHANGE_REQUEST_DECISION.APPROVE,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/draft/i);
    });

    it('Accepts "accept" keyword as valid decision outcome resulting in approved status', async () => {
      const mockCR = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectDoc,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        status: CHANGE_REQUEST_STATUS.PENDING_APPROVAL,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ChangeRequest, 'findById').mockResolvedValue(mockCR);

      const res = await request(app)
        .post(`/api/change-requests/${mockChangeRequestId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: 'accept',
          comment: 'Accepted using alternative keyword',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockCR.status).toBe(CHANGE_REQUEST_STATUS.APPROVED);
      expect(mockCR.clientDecision.decision).toBe('approve');
      expect(mockCR.decision.decision).toBe('approve');
      expect(mockCR.decision.decidedBy.toString()).toBe(mockClientId);
      expect(mockCR.decision.decidedAt).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // 8. PROJECT-SCOPED LISTING & QUERYING
  // =========================================================================
  describe('Project-Scoped Change Request Listing', () => {
    it('Authorized project participant can list change requests for their project', async () => {
      const mockList = [
        {
          _id: new mongoose.Types.ObjectId(),
          project: mockProjectDoc,
          requestedBy: mockFreelancerUser,
          title: 'Request 1',
          status: CHANGE_REQUEST_STATUS.PENDING_ESTIMATE,
        },
      ];

      const findQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockList),
      };

      jest.spyOn(ChangeRequest, 'find').mockReturnValue(findQuery);

      const res = await request(app)
        .get(`/api/change-requests?projectId=${mockProjectId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/retrieved successfully/i);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('Outsider cannot list change requests for unrelated project', async () => {
      const res = await request(app)
        .get(`/api/change-requests?projectId=${mockProjectId}`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You do not have access to this project/i);
    });

    it('Listing without projectId query parameter is rejected for non-admin', async () => {
      const res = await request(app)
        .get('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/projectId query parameter is required/i);
    });

    it('System Admin can list change requests without projectId filter', async () => {
      const mockList = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Admin Global View',
          status: CHANGE_REQUEST_STATUS.PENDING_ESTIMATE,
        },
      ];

      const findQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockList),
      };

      jest.spyOn(ChangeRequest, 'find').mockReturnValue(findQuery);

      const res = await request(app)
        .get('/api/change-requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // =========================================================================
  // 9. PROPOSAL SCOPE INTEGRITY (ORIGINAL PROPOSAL UNCHANGED)
  // =========================================================================
  describe('Proposal Scope Integrity', () => {
    it('Creating and deciding a change request leaves original approved proposal untouched', async () => {
      const mockProposalId = new mongoose.Types.ObjectId();
      const mockProjectWithProposal = {
        ...mockProjectDoc,
        currentApprovedProposal: mockProposalId,
      };

      jest.spyOn(Project, 'findById').mockResolvedValue(mockProjectWithProposal);

      const createdDoc = {
        _id: new mongoose.Types.ObjectId(mockChangeRequestId),
        project: mockProjectWithProposal._id,
        requestedBy: new mongoose.Types.ObjectId(mockFreelancerId),
        title: 'Non-destructive change request',
        description: 'Verifying original approved proposal is preserved',
        status: CHANGE_REQUEST_STATUS.PENDING_ESTIMATE,
      };

      jest.spyOn(ChangeRequest, 'create').mockResolvedValue(createdDoc);

      const res = await request(app)
        .post('/api/change-requests')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Non-destructive change request',
          description: 'Verifying original approved proposal is preserved',
        });

      expect(res.statusCode).toBe(201);
      // Project's currentApprovedProposal was not mutated
      expect(mockProjectWithProposal.currentApprovedProposal).toBe(mockProposalId);
    });
  });
});
