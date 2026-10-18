const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');
const User = require('../src/modules/auth/auth.model');
const Workspace = require('../src/modules/workspace/workspace.model');
const Project = require('../src/modules/project/project.model');
const { Proposal, ProposalVersion } = require('../src/modules/proposal/proposal.model');
const ChangeRequest = require('../src/modules/changeRequest/changeRequest.model');

describe('Integration Query Routes (Workspaces, Proposals, Change Requests)', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockOutsiderId = new mongoose.Types.ObjectId().toString();
  const mockWorkspaceId = new mongoose.Types.ObjectId().toString();
  const mockProjectId = new mongoose.Types.ObjectId().toString();
  const mockProposalId = new mongoose.Types.ObjectId().toString();

  const userToken = generateToken({ id: mockUserId });
  const outsiderToken = generateToken({ id: mockOutsiderId });

  const mockUser = {
    _id: new mongoose.Types.ObjectId(mockUserId),
    name: 'Test Member',
    email: 'member@scopepilot.dev',
    role: 'freelancer',
  };

  const mockOutsider = {
    _id: new mongoose.Types.ObjectId(mockOutsiderId),
    name: 'Outsider User',
    email: 'outsider@scopepilot.dev',
    role: 'client',
  };

  const mockWorkspace = {
    _id: new mongoose.Types.ObjectId(mockWorkspaceId),
    name: 'Primary Studio',
    slug: 'primary-studio',
    owner: mockUser,
    members: [{ user: mockUser, role: 'owner' }],
  };

  const mockProject = {
    _id: new mongoose.Types.ObjectId(mockProjectId),
    title: 'Client Web Platform',
    workspace: mockWorkspace,
    freelancer: mockUser,
    client: null,
    status: 'active',
  };

  beforeEach(() => {
    jest.restoreAllMocks();

    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      let found = null;
      if (idStr === mockUserId) found = mockUser;
      else if (idStr === mockOutsiderId) found = mockOutsider;
      return {
        select: jest.fn().mockResolvedValue(found),
      };
    });
  });

  describe('GET /api/workspaces (List Workspaces)', () => {
    it('returns 401 when token is missing', async () => {
      const res = await request(app).get('/api/workspaces');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 and workspaces list for authenticated user', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockWorkspace]),
      };
      jest.spyOn(Workspace, 'find').mockReturnValue(mockQuery);

      const res = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Primary Studio');
    });
  });

  describe('GET /api/change-requests (List Change Requests by Project)', () => {
    it('returns 401 when token is missing', async () => {
      const res = await request(app).get(`/api/change-requests?projectId=${mockProjectId}`);
      expect(res.statusCode).toBe(401);
    });

    it('returns 400 when projectId query is omitted', async () => {
      const res = await request(app)
        .get('/api/change-requests')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/validation failed/i);
    });

    it('returns 403 when user does not have access to the project', async () => {
      jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/change-requests?projectId=${mockProjectId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/do not have access to this project/i);
    });

    it('returns 200 with change requests when authorized', async () => {
      jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

      const mockCr = {
        _id: new mongoose.Types.ObjectId(),
        project: mockProject,
        title: 'Add Analytics',
        description: 'Need Google Tag Manager and dashboard',
        status: 'draft',
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockCr]),
      };
      jest.spyOn(ChangeRequest, 'find').mockReturnValue(mockQuery);

      const res = await request(app)
        .get(`/api/change-requests?projectId=${mockProjectId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].title).toBe('Add Analytics');
    });
  });

  describe('GET /api/proposals (List Proposals by Project)', () => {
    it('returns 401 when token is missing', async () => {
      const res = await request(app).get(`/api/proposals?projectId=${mockProjectId}`);
      expect(res.statusCode).toBe(401);
    });

    it('returns 400 when projectId is omitted', async () => {
      const res = await request(app)
        .get('/api/proposals')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(400);
    });

    it('returns 403 when user is outsider to project', async () => {
      jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/proposals?projectId=${mockProjectId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('returns 200 with proposal list and version history when authorized', async () => {
      jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

      const mockProposalDoc = {
        _id: new mongoose.Types.ObjectId(mockProposalId),
        title: 'Scope Agreement',
        project: mockProjectId,
        currentVersionNumber: 1,
        toObject: () => ({
          _id: mockProposalId,
          title: 'Scope Agreement',
          project: mockProjectId,
          currentVersionNumber: 1,
        }),
      };

      const mockProposalQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockProposalDoc]),
      };
      jest.spyOn(Proposal, 'find').mockReturnValue(mockProposalQuery);

      const mockVersionDoc = {
        _id: new mongoose.Types.ObjectId(),
        proposal: mockProposalId,
        versionNumber: 1,
        title: 'Scope Agreement v1',
        totalBudget: 4500,
        currency: 'USD',
        status: 'approved',
      };
      const mockVersionQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([mockVersionDoc]),
      };
      jest.spyOn(ProposalVersion, 'find').mockReturnValue(mockVersionQuery);

      const res = await request(app)
        .get(`/api/proposals?projectId=${mockProjectId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].versions.length).toBe(1);
    });
  });
});
