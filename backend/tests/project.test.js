const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');
const User = require('../src/modules/auth/auth.model');
const Workspace = require('../src/modules/workspace/workspace.model');
const Project = require('../src/modules/project/project.model');
const { PROJECT_STATUS } = require('../src/modules/project/project.constants');

describe('Project Module (Abhtej) - Comprehensive Unit & Integration Tests', () => {
  const mockFreelancerId = new mongoose.Types.ObjectId().toString();
  const mockClientId = new mongoose.Types.ObjectId().toString();
  const mockUnrelatedUserId = new mongoose.Types.ObjectId().toString();
  const mockWorkspaceId = new mongoose.Types.ObjectId().toString();
  const mockProjectId = new mongoose.Types.ObjectId().toString();

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

  const mockWorkspace = {
    _id: new mongoose.Types.ObjectId(mockWorkspaceId),
    name: 'Acme Digital Labs',
    slug: 'acme-digital-labs',
    owner: new mongoose.Types.ObjectId(mockFreelancerId),
    members: [
      { user: new mongoose.Types.ObjectId(mockFreelancerId), role: 'owner' },
      { user: new mongoose.Types.ObjectId(mockClientId), role: 'client' },
    ],
  };

  const mockProjectDoc = {
    _id: new mongoose.Types.ObjectId(mockProjectId),
    workspace: {
      _id: new mongoose.Types.ObjectId(mockWorkspaceId),
      name: 'Acme Digital Labs',
      slug: 'acme-digital-labs',
      owner: new mongoose.Types.ObjectId(mockFreelancerId),
    },
    freelancer: {
      _id: new mongoose.Types.ObjectId(mockFreelancerId),
      name: 'Alex Freelancer',
      email: 'freelancer@test.com',
      role: 'freelancer',
    },
    client: {
      _id: new mongoose.Types.ObjectId(mockClientId),
      name: 'Sarah Client',
      email: 'client@test.com',
      role: 'client',
    },
    title: 'E-Commerce Platform Redesign',
    description: 'Full stack redesign of client store.',
    status: PROJECT_STATUS.DRAFT,
    currentApprovedProposal: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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

    // Default mock for Workspace.findById
    jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. AUTHENTICATION & ACCESS CONTROL GUARDS
  // =========================================================================
  describe('Authentication & Access Control', () => {
    it('should return 401 Unauthorized on POST /api/projects when no token is provided', async () => {
      const res = await request(app).post('/api/projects').send({
        workspace: mockWorkspaceId,
        title: 'New Web App',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    it('should return 401 Unauthorized on GET /api/projects/:id when token is missing', async () => {
      const res = await request(app).get(`/api/projects/${mockProjectId}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 Unauthorized when an invalid token is provided', async () => {
      const res = await request(app)
        .get(`/api/projects/${mockProjectId}`)
        .set('Authorization', 'Bearer invalid_signature_token');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid authentication token/i);
    });
  });

  // =========================================================================
  // 2. INPUT VALIDATION (ZOD)
  // =========================================================================
  describe('Input Validation (Zod)', () => {
    it('should return 400 Bad Request when workspace ID is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          title: 'Project Without Workspace',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      const fields = res.body.errors.map((e) => e.field);
      expect(fields).toContain('workspace');
    });

    it('should return 400 Bad Request when workspace ID has invalid ObjectId format', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          workspace: '123-not-an-object-id',
          title: 'Valid Title Here',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toMatch(/Invalid workspace ID format/i);
    });

    it('should return 400 Bad Request when title is too short (< 2 characters)', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          workspace: mockWorkspaceId,
          title: 'A',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].field).toBe('title');
      expect(res.body.errors[0].message).toMatch(/at least 2 characters/i);
    });

    it('should return 400 Bad Request when status is not a valid enum value', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          workspace: mockWorkspaceId,
          title: 'Valid Project Title',
          status: 'invalid_status_enum',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].field).toBe('status');
    });

    it('should return 400 Bad Request when GET /api/projects/:id receives an invalid ObjectId', async () => {
      const res = await request(app)
        .get('/api/projects/not-a-valid-hex-id')
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].field).toBe('id');
      expect(res.body.errors[0].message).toMatch(/Invalid project ID format/i);
    });
  });

  // =========================================================================
  // 3. WORKSPACE BOUNDARY & CROSS-WORKSPACE SECURITY
  // =========================================================================
  describe('Workspace Boundaries & Cross-Workspace Security', () => {
    it('should return 404 Not Found when creating a project under a non-existent workspace', async () => {
      jest.spyOn(Workspace, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          workspace: mockWorkspaceId,
          title: 'Brand New Portal',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Workspace not found');
    });

    it('should return 403 Forbidden when a user attempts to create a project in a workspace they do not belong to', async () => {
      // Mock workspace where user is not an owner and not in members
      jest.spyOn(Workspace, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockWorkspaceId),
        owner: new mongoose.Types.ObjectId(), // someone else
        members: [], // empty members
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          workspace: mockWorkspaceId,
          title: 'Unauthorized Project Attempt',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not belong to this workspace');
    });

    it('should return 400 Bad Request if specified client is not a member of the workspace', async () => {
      jest.spyOn(Workspace, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockWorkspaceId),
        owner: new mongoose.Types.ObjectId(mockFreelancerId),
        members: [{ user: new mongoose.Types.ObjectId(mockFreelancerId), role: 'owner' }],
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          workspace: mockWorkspaceId,
          client: mockUnrelatedUserId,
          title: 'Project With External Client',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Specified client is not a member of this workspace');
    });
  });

  // =========================================================================
  // 4. PROJECT CREATION (POST /api/projects)
  // =========================================================================
  describe('Project Creation (POST /api/projects)', () => {
    it('should successfully create a project with valid data and auto-assign freelancer ID', async () => {
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);
      jest.spyOn(Project, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockProjectId),
        workspace: mockWorkspaceId,
        freelancer: mockFreelancerId,
        client: mockClientId,
        title: 'Modern Headless Storefront',
        description: 'Next.js storefront with Stripe checkout.',
        status: PROJECT_STATUS.DRAFT,
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          workspace: mockWorkspaceId,
          client: mockClientId,
          title: 'Modern Headless Storefront',
          description: 'Next.js storefront with Stripe checkout.',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Project created successfully');
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.title).toBe('Modern Headless Storefront');
      expect(res.body.data.freelancer).toBe(mockFreelancerId);
      expect(res.body.data.workspace).toBe(mockWorkspaceId);
      expect(res.body.data.client).toBe(mockClientId);
      expect(res.body.data.status).toBe(PROJECT_STATUS.DRAFT);
    });

    it('should support workspaceId and clientId payload aliases seamlessly', async () => {
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);
      jest.spyOn(Project, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockProjectId),
        workspace: mockWorkspaceId,
        freelancer: mockFreelancerId,
        client: mockClientId,
        title: 'Payload Alias Verification',
        description: 'Using workspaceId and clientId aliases',
        status: PROJECT_STATUS.DRAFT,
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          workspaceId: mockWorkspaceId,
          clientId: mockClientId,
          title: 'Payload Alias Verification',
          description: 'Using workspaceId and clientId aliases',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workspace).toBe(mockWorkspaceId);
      expect(res.body.data.client).toBe(mockClientId);
    });
  });

  // =========================================================================
  // 5. PROJECT RETRIEVAL & ACCESS CONTROL (GET /api/projects/:id)
  // =========================================================================
  describe('Project Retrieval (GET /api/projects/:id)', () => {
    it('should return 404 Not Found when project does not exist', async () => {
      jest.spyOn(Project, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        then: jest.fn((callback) => callback(null)),
      });

      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Project not found');
    });

    it('should allow the assigned freelancer to retrieve project details', async () => {
      jest.spyOn(Project, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        then: jest.fn((callback) => callback(mockProjectDoc)),
      });

      const res = await request(app)
        .get(`/api/projects/${mockProjectId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(mockProjectDoc.title);
      expect(res.body.data.freelancer.name).toBe('Alex Freelancer');
      expect(res.body.data.client.name).toBe('Sarah Client');
    });

    it('should allow the assigned client to retrieve project details', async () => {
      jest.spyOn(Project, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        then: jest.fn((callback) => callback(mockProjectDoc)),
      });

      const res = await request(app)
        .get(`/api/projects/${mockProjectId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(mockProjectDoc.title);
    });

    it('should return 403 Forbidden when an unrelated user tries to retrieve a project from another workspace', async () => {
      jest.spyOn(Project, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        then: jest.fn((callback) => callback(mockProjectDoc)),
      });
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);

      const res = await request(app)
        .get(`/api/projects/${mockProjectId}`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have access to this project');
    });
  });

  // =========================================================================
  // 6. PROJECT LISTING (GET /api/projects)
  // =========================================================================
  describe('Project Listing (GET /api/projects)', () => {
    it('should list projects for an authorized workspace member', async () => {
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);
      jest.spyOn(Project, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockProjectDoc]),
      });

      const res = await request(app)
        .get(`/api/projects?workspaceId=${mockWorkspaceId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe(mockProjectDoc.title);
    });

    it('should return 403 Forbidden when listing projects for a workspace the user does not belong to', async () => {
      jest.spyOn(Workspace, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockWorkspaceId),
        owner: new mongoose.Types.ObjectId(),
        members: [],
      });

      const res = await request(app)
        .get(`/api/projects?workspaceId=${mockWorkspaceId}`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have access to this workspace');
    });
  });
});
