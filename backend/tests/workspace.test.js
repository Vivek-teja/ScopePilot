const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');
const User = require('../src/modules/auth/auth.model');
const Workspace = require('../src/modules/workspace/workspace.model');
const { WORKSPACE_ROLES } = require('../src/constants/roles');

const makePopulateQuery = (doc) => {
  const query = Promise.resolve(doc);
  query.populate = jest.fn().mockImplementation(() => query);
  return query;
};

describe('Workspace Module & Multi-Tenancy (Task 2)', () => {
  const mockOwnerId = new mongoose.Types.ObjectId().toString();
  const mockAdminMemberId = new mongoose.Types.ObjectId().toString();
  const mockRegularMemberId = new mongoose.Types.ObjectId().toString();
  const mockOutsiderId = new mongoose.Types.ObjectId().toString();
  const mockWorkspaceId = new mongoose.Types.ObjectId().toString();

  const ownerToken = generateToken({ id: mockOwnerId });
  const adminMemberToken = generateToken({ id: mockAdminMemberId });
  const regularMemberToken = generateToken({ id: mockRegularMemberId });
  const outsiderToken = generateToken({ id: mockOutsiderId });

  const mockOwnerUser = {
    _id: new mongoose.Types.ObjectId(mockOwnerId),
    name: 'Oliver Owner',
    email: 'owner@scopepilot.dev',
    role: 'client',
  };

  const mockAdminMemberUser = {
    _id: new mongoose.Types.ObjectId(mockAdminMemberId),
    name: 'Adam AdminMember',
    email: 'admin@scopepilot.dev',
    role: 'client',
  };

  const mockRegularMemberUser = {
    _id: new mongoose.Types.ObjectId(mockRegularMemberId),
    name: 'Randy RegularMember',
    email: 'regular@scopepilot.dev',
    role: 'freelancer',
  };

  const mockOutsiderUser = {
    _id: new mongoose.Types.ObjectId(mockOutsiderId),
    name: 'Eve Intruder',
    email: 'eve@outsider.dev',
    role: 'freelancer',
  };

  const mockWorkspaceDoc = {
    _id: new mongoose.Types.ObjectId(mockWorkspaceId),
    name: 'Acme Studios Workspace',
    slug: 'acme-studios-workspace',
    owner: mockOwnerUser,
    members: [
      {
        user: mockOwnerUser,
        role: WORKSPACE_ROLES.OWNER,
        joinedAt: new Date(),
      },
      {
        user: mockAdminMemberUser,
        role: WORKSPACE_ROLES.ADMIN,
        joinedAt: new Date(),
      },
      {
        user: mockRegularMemberUser,
        role: WORKSPACE_ROLES.MEMBER,
        joinedAt: new Date(),
      },
    ],
    invitations: [],
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.restoreAllMocks();

    // Mock User.findById for requireAuth middleware
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      let userObj = null;
      if (idStr === mockOwnerId) userObj = mockOwnerUser;
      else if (idStr === mockAdminMemberId) userObj = mockAdminMemberUser;
      else if (idStr === mockRegularMemberId) userObj = mockRegularMemberUser;
      else if (idStr === mockOutsiderId) userObj = mockOutsiderUser;

      return {
        select: jest.fn().mockResolvedValue(userObj),
      };
    });

    // Default mock for Workspace.findById
    jest.spyOn(Workspace, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      if (idStr === mockWorkspaceId) {
        return makePopulateQuery(mockWorkspaceDoc);
      }
      return makePopulateQuery(null);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. AUTHENTICATION & INPUT VALIDATION
  // =========================================================================
  describe('Authentication & Input Validation', () => {
    it('POST /api/workspaces should return 401 when token is missing', async () => {
      const res = await request(app).post('/api/workspaces').send({
        name: 'New Workspace',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    it('GET /api/workspaces/:id should return 401 when token is missing', async () => {
      const res = await request(app).get(`/api/workspaces/${mockWorkspaceId}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/workspaces/:id/members should return 401 when token is missing', async () => {
      const res = await request(app).get(`/api/workspaces/${mockWorkspaceId}/members`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/workspaces/:id/invitations should return 401 when token is missing', async () => {
      const res = await request(app)
        .post(`/api/workspaces/${mockWorkspaceId}/invitations`)
        .send({ email: 'newmember@test.dev' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/workspaces/:id should return 400 when ID format is invalid', async () => {
      const res = await request(app)
        .get('/api/workspaces/bad-id-123')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /Invalid workspace ID format/i.test(e.message))).toBe(true);
    });

    it('GET /api/workspaces/:id/members should return 400 when ID format is invalid', async () => {
      const res = await request(app)
        .get('/api/workspaces/invalid-id/members')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('POST /api/workspaces/:id/invitations should return 400 when ID format is invalid', async () => {
      const res = await request(app)
        .post('/api/workspaces/invalid-id/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'invitee@test.dev' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('POST /api/workspaces should return 400 when name is missing or too short', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'A' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /at least 2 characters/i.test(e.message))).toBe(true);
    });

    it('POST /api/workspaces should return 400 when name exceeds 120 characters', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'W'.repeat(121) });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('POST /api/workspaces/:id/invitations should return 400 when email is invalid', async () => {
      const res = await request(app)
        .post(`/api/workspaces/${mockWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'not-an-email' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /valid email/i.test(e.message))).toBe(true);
    });

    it('POST /api/workspaces/:id/invitations should return 400 when role is invalid', async () => {
      const res = await request(app)
        .post(`/api/workspaces/${mockWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'valid@scopepilot.dev',
          role: 'superuser',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  // =========================================================================
  // 2. WORKSPACE CREATION (POST /api/workspaces)
  // =========================================================================
  describe('Workspace Creation (POST /api/workspaces)', () => {
    it('should create workspace, set creator as owner, and auto-derive slug', async () => {
      const createdWorkspace = {
        _id: new mongoose.Types.ObjectId(mockWorkspaceId),
        name: 'Design Collective',
        slug: 'design-collective',
        owner: new mongoose.Types.ObjectId(mockOwnerId),
        members: [
          {
            user: new mongoose.Types.ObjectId(mockOwnerId),
            role: WORKSPACE_ROLES.OWNER,
          },
        ],
      };

      jest.spyOn(Workspace, 'create').mockResolvedValue(createdWorkspace);

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Design Collective',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/created successfully/i);
      expect(res.body.data.name).toBe('Design Collective');
      expect(res.body.data.slug).toBe('design-collective');
      expect(res.body.data.owner.toString()).toBe(mockOwnerId);
      expect(res.body.data.members[0].role).toBe(WORKSPACE_ROLES.OWNER);
    });

    it('should respect custom slug when provided', async () => {
      const createdWorkspace = {
        _id: new mongoose.Types.ObjectId(mockWorkspaceId),
        name: 'Design Collective',
        slug: 'custom-slug-abc',
        owner: new mongoose.Types.ObjectId(mockOwnerId),
        members: [
          {
            user: new mongoose.Types.ObjectId(mockOwnerId),
            role: WORKSPACE_ROLES.OWNER,
          },
        ],
      };

      jest.spyOn(Workspace, 'create').mockResolvedValue(createdWorkspace);

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Design Collective',
          slug: 'custom-slug-abc',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('custom-slug-abc');
    });
  });

  // =========================================================================
  // 3. WORKSPACE RETRIEVAL & TENANCY (GET /api/workspaces/:id)
  // =========================================================================
  describe('Workspace Retrieval & Tenancy Boundaries (GET /api/workspaces/:id)', () => {
    it('should return 404 Not Found when workspace does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/workspaces/${nonExistentId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Workspace not found/i);
    });

    it('Workspace owner should successfully retrieve workspace', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${mockWorkspaceId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acme Studios Workspace');
      expect(res.body.data.owner.email).toBe('owner@scopepilot.dev');
    });

    it('Workspace member should successfully retrieve workspace', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${mockWorkspaceId}`)
        .set('Authorization', `Bearer ${regularMemberToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acme Studios Workspace');
    });

    it('Outsider user from another workspace should receive 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${mockWorkspaceId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You do not have access to this workspace/i);
    });
  });

  // =========================================================================
  // 4. WORKSPACE MEMBERS LISTING (GET /api/workspaces/:id/members)
  // =========================================================================
  describe('Workspace Members Listing (GET /api/workspaces/:id/members)', () => {
    it('should return 404 Not Found when workspace does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/workspaces/${nonExistentId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Workspace not found/i);
    });

    it('Workspace owner should successfully view all workspace members', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${mockWorkspaceId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('Workspace member should successfully view workspace members', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${mockWorkspaceId}/members`)
        .set('Authorization', `Bearer ${adminMemberToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('Outsider user should receive 403 Forbidden when attempting to list members', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${mockWorkspaceId}/members`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You do not have access to this workspace/i);
    });
  });

  // =========================================================================
  // 5. WORKSPACE INVITATIONS & AUTHORIZATION (POST /api/workspaces/:id/invitations)
  // =========================================================================
  describe('Workspace Invitations & Role Permissions (POST /api/workspaces/:id/invitations)', () => {
    it('should return 404 Not Found when workspace does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/workspaces/${nonExistentId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'newuser@scopepilot.dev' });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Workspace not found/i);
    });

    it('Workspace owner should successfully invite a new member with default role "member"', async () => {
      const mockWorkspace = {
        ...mockWorkspaceDoc,
        invitations: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);

      const res = await request(app)
        .post(`/api/workspaces/${mockWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'colleague@scopepilot.dev' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Invitation sent successfully/i);
      expect(mockWorkspace.invitations.length).toBe(1);
      expect(mockWorkspace.invitations[0].email).toBe('colleague@scopepilot.dev');
      expect(mockWorkspace.invitations[0].role).toBe(WORKSPACE_ROLES.MEMBER);
      expect(mockWorkspace.invitations[0].invitedBy.toString()).toBe(mockOwnerId);
      expect(mockWorkspace.save).toHaveBeenCalled();
    });

    it('Workspace owner should successfully invite a user with "client" role', async () => {
      const mockWorkspace = {
        ...mockWorkspaceDoc,
        invitations: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);

      const res = await request(app)
        .post(`/api/workspaces/${mockWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'clientpartner@scopepilot.dev',
          role: WORKSPACE_ROLES.CLIENT,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockWorkspace.invitations.length).toBe(1);
      expect(mockWorkspace.invitations[0].role).toBe(WORKSPACE_ROLES.CLIENT);
      expect(mockWorkspace.invitations[0].invitedBy.toString()).toBe(mockOwnerId);
      expect(mockWorkspace.save).toHaveBeenCalled();
    });

    it('Workspace admin should successfully invite a regular member', async () => {
      const mockWorkspace = {
        ...mockWorkspaceDoc,
        invitations: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);

      const res = await request(app)
        .post(`/api/workspaces/${mockWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${adminMemberToken}`)
        .send({
          email: 'teammate@scopepilot.dev',
          role: WORKSPACE_ROLES.MEMBER,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockWorkspace.invitations.length).toBe(1);
      expect(mockWorkspace.invitations[0].email).toBe('teammate@scopepilot.dev');
      expect(mockWorkspace.invitations[0].role).toBe(WORKSPACE_ROLES.MEMBER);
      expect(mockWorkspace.invitations[0].invitedBy.toString()).toBe(mockAdminMemberId);
      expect(mockWorkspace.save).toHaveBeenCalled();
    });

    it('Workspace admin attempting to invite a user with "client" role should be rejected with 403 Forbidden', async () => {
      const mockWorkspace = {
        ...mockWorkspaceDoc,
        invitations: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);

      const res = await request(app)
        .post(`/api/workspaces/${mockWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${adminMemberToken}`)
        .send({
          email: 'forbiddenclient@scopepilot.dev',
          role: WORKSPACE_ROLES.CLIENT,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot invite users with the client role/i);
      expect(mockWorkspace.invitations.length).toBe(0);
      expect(mockWorkspace.save).not.toHaveBeenCalled();
    });

    it('Outsider user should receive 403 Forbidden when attempting to invite into foreign workspace', async () => {
      const mockWorkspace = {
        ...mockWorkspaceDoc,
        invitations: [],
      };

      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);

      const res = await request(app)
        .post(`/api/workspaces/${mockWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ email: 'intruderinvitee@test.dev' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You do not have access to this workspace/i);
    });

    it('Standard workspace member (non-owner/non-admin) should receive 403 Forbidden when attempting to invite', async () => {
      const mockWorkspace = {
        ...mockWorkspaceDoc,
        invitations: [],
      };

      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);

      const res = await request(app)
        .post(`/api/workspaces/${mockWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${regularMemberToken}`)
        .send({ email: 'friend@test.dev' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You do not have permission to invite members/i);
    });

    it('should return 409 Conflict when a pending invitation for the email already exists', async () => {
      const mockWorkspace = {
        ...mockWorkspaceDoc,
        invitations: [
          {
            email: 'existing@scopepilot.dev',
            role: WORKSPACE_ROLES.MEMBER,
            status: 'pending',
          },
        ],
      };

      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);

      const res = await request(app)
        .post(`/api/workspaces/${mockWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'existing@scopepilot.dev' });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/A pending invitation for this email already exists/i);
    });
  });
});
