const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');
const User = require('../src/modules/auth/auth.model');
const Project = require('../src/modules/project/project.model');
const Workspace = require('../src/modules/workspace/workspace.model');
const { Proposal, ProposalVersion } = require('../src/modules/proposal/proposal.model');
const proposalService = require('../src/modules/proposal/proposal.service');
const {
  PROPOSAL_STATUS,
  PROPOSAL_DECISION,
} = require('../src/modules/proposal/proposal.constants');

const makePopulateQuery = (doc) => {
  const query = {
    populate: jest.fn().mockImplementation(() => query),
    sort: jest.fn().mockImplementation(() => query),
    then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
    catch: (reject) => Promise.resolve(doc).catch(reject),
  };
  return query;
};

describe('Proposal Security, Tenancy & Decisions Suite', () => {
  const mockFreelancerId = new mongoose.Types.ObjectId().toString();
  const mockClientId = new mongoose.Types.ObjectId().toString();
  const mockUnrelatedUserId = new mongoose.Types.ObjectId().toString();
  const mockWorkspaceOwnerId = new mongoose.Types.ObjectId().toString();
  const mockWorkspaceAdminId = new mongoose.Types.ObjectId().toString();
  const mockAdminId = new mongoose.Types.ObjectId().toString();

  const mockProjectId = new mongoose.Types.ObjectId().toString();
  const mockOtherProjectId = new mongoose.Types.ObjectId().toString();
  const mockWorkspaceId = new mongoose.Types.ObjectId().toString();
  const mockProposalId = new mongoose.Types.ObjectId().toString();
  const mockVersionId = new mongoose.Types.ObjectId().toString();

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
    title: 'ScopePilot SaaS Platform',
    status: 'active',
    freelancer: new mongoose.Types.ObjectId(mockFreelancerId),
    client: new mongoose.Types.ObjectId(mockClientId),
    workspace: new mongoose.Types.ObjectId(mockWorkspaceId),
  };

  const mockOtherProjectDoc = {
    _id: new mongoose.Types.ObjectId(mockOtherProjectId),
    title: 'Foreign Workspace Project',
    status: 'active',
    freelancer: new mongoose.Types.ObjectId(mockUnrelatedUserId),
    client: new mongoose.Types.ObjectId(mockUnrelatedUserId),
    workspace: new mongoose.Types.ObjectId(),
  };

  let mockProposalDoc;
  let mockVersionDoc;

  beforeEach(() => {
    jest.restoreAllMocks();

    mockVersionDoc = {
      _id: new mongoose.Types.ObjectId(mockVersionId),
      proposal: new mongoose.Types.ObjectId(mockProposalId),
      project: new mongoose.Types.ObjectId(mockProjectId),
      versionNumber: 1,
      title: 'Initial Contract Scope',
      scopeSummary: 'Detailed deliverables for MVP release',
      scopeItems: [
        {
          title: 'Authentication Module',
          description: 'OAuth & JWT',
          estimatedHours: 20,
          price: 2000,
        },
      ],
      totalBudget: 2000,
      currency: 'USD',
      status: PROPOSAL_STATUS.PENDING_APPROVAL,
      decidedBy: null,
      decidedAt: null,
      decisionComment: '',
      save: jest.fn().mockResolvedValue(true),
    };

    mockProposalDoc = {
      _id: new mongoose.Types.ObjectId(mockProposalId),
      project: {
        _id: new mongoose.Types.ObjectId(mockProjectId),
        title: 'ScopePilot SaaS Platform',
        status: 'active',
        freelancer: new mongoose.Types.ObjectId(mockFreelancerId),
        client: new mongoose.Types.ObjectId(mockClientId),
        workspace: new mongoose.Types.ObjectId(mockWorkspaceId),
      },
      title: 'Initial Contract Scope',
      currentVersionNumber: 1,
      activeVersion: new mongoose.Types.ObjectId(mockVersionId),
      status: PROPOSAL_STATUS.PENDING_APPROVAL,
      createdBy: {
        _id: new mongoose.Types.ObjectId(mockFreelancerId),
        name: 'Alex Freelancer',
        email: 'freelancer@test.com',
        role: 'freelancer',
      },
      save: jest.fn().mockResolvedValue(true),
    };

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

    // Mock Project.findByIdAndUpdate
    jest.spyOn(Project, 'findByIdAndUpdate').mockResolvedValue(mockProjectDoc);

    // Mock Workspace.findById
    jest.spyOn(Workspace, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      if (idStr === mockWorkspaceId) return Promise.resolve(mockWorkspaceDoc);
      return Promise.resolve(null);
    });

    // Mock Proposal.create
    jest.spyOn(Proposal, 'create').mockImplementation((data) =>
      Promise.resolve({
        _id: new mongoose.Types.ObjectId(mockProposalId),
        ...data,
        save: jest.fn().mockResolvedValue(true),
      })
    );

    // Mock ProposalVersion.create
    jest.spyOn(ProposalVersion, 'create').mockImplementation((data) =>
      Promise.resolve({
        _id: new mongoose.Types.ObjectId(mockVersionId),
        ...data,
        save: jest.fn().mockResolvedValue(true),
      })
    );

    // Mock Proposal.findById
    jest.spyOn(Proposal, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      if (idStr === mockProposalId) return makePopulateQuery(mockProposalDoc);
      return makePopulateQuery(null);
    });

    // Mock ProposalVersion.findById
    jest.spyOn(ProposalVersion, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      if (idStr === mockVersionId) return Promise.resolve(mockVersionDoc);
      return Promise.resolve(null);
    });

    // Mock ProposalVersion.find
    jest.spyOn(ProposalVersion, 'find').mockImplementation(() =>
      makePopulateQuery([mockVersionDoc])
    );
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. AUTHENTICATION & VALIDATION
  // =========================================================================
  describe('Authentication & Validation', () => {
    it('POST /api/proposals should return 401 when token is missing', async () => {
      const res = await request(app).post('/api/proposals').send({
        project: mockProjectId,
        title: 'MVP Scope',
        scopeSummary: 'Summary of the proposal',
        totalBudget: 5000,
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token/i);
    });

    it('GET /api/proposals/:id should return 401 when token is missing', async () => {
      const res = await request(app).get(`/api/proposals/${mockProposalId}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/proposals/:id/decision should return 401 when token is missing', async () => {
      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .send({ decision: PROPOSAL_DECISION.APPROVE });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/proposals should return 400 when body is empty', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('POST /api/proposals should return 400 when totalBudget is negative', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'MVP Scope',
          scopeSummary: 'Scope description for project',
          totalBudget: -500,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(
        res.body.errors.some((e) => /non-negative/i.test(e.message))
      ).toBe(true);
    });

    it('POST /api/proposals should return 400 when project ID format is invalid', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: 'invalid-id-format',
          title: 'MVP Scope',
          scopeSummary: 'Scope description for project',
          totalBudget: 1000,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(
        res.body.errors.some((e) => /Invalid project ID format/i.test(e.message))
      ).toBe(true);
    });

    it('GET /api/proposals/:id should return 400 when proposal ID format is invalid', async () => {
      const res = await request(app)
        .get('/api/proposals/not-an-objectid')
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(
        res.body.errors.some((e) => /Invalid proposal ID format/i.test(e.message))
      ).toBe(true);
    });

    it('POST /api/proposals/:id/decision should return 400 when decision is invalid', async () => {
      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ decision: 'maybe_approve' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(
        res.body.errors.some((e) => /Invalid enum value/i.test(e.message))
      ).toBe(true);
    });
  });

  // =========================================================================
  // 2. PROPOSAL CREATION (POST /api/proposals)
  // =========================================================================
  describe('Proposal Creation Authorization', () => {
    it('should allow assigned freelancer to create proposal with project field', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockProjectId,
          title: 'Platform Architecture MVP',
          scopeSummary: 'Detailed requirements for Phase 1 release',
          totalBudget: 4500,
          currency: 'USD',
          scopeItems: [
            {
              title: 'Database Setup',
              description: 'Mongo schema setup',
              estimatedHours: 10,
              price: 1500,
            },
          ],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Proposal created successfully');
      expect(res.body.data).toHaveProperty('proposal');
      expect(res.body.data).toHaveProperty('version');
    });

    it('should allow assigned freelancer to create proposal using projectId alias', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          projectId: mockProjectId,
          title: 'Platform Architecture MVP',
          scopeSummary: 'Detailed requirements for Phase 1 release',
          totalBudget: 4500,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when project does not exist', async () => {
      const nonExistentProjectId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: nonExistentProjectId,
          title: 'Non-existent Project Scope',
          scopeSummary: 'Description',
          totalBudget: 3000,
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/project not found/i);
    });

    it('should forbid client from creating proposals (role boundary)', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          project: mockProjectId,
          title: 'Client Proposed Scope',
          scopeSummary: 'Clients should review, not formulate proposals',
          totalBudget: 2500,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to create a proposal/i);
    });

    it('should forbid outsider from creating proposals on foreign project', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({
          project: mockProjectId,
          title: 'Intruder Proposal',
          scopeSummary: 'Attacker attempting to inject scope',
          totalBudget: 9999,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to create a proposal/i);
    });

    it('should forbid freelancer from creating proposals on a project where they are not assigned', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          project: mockOtherProjectId,
          title: 'Unauthorized Cross-Project Scope',
          scopeSummary: 'Attempting to inject proposal on unassigned project',
          totalBudget: 8000,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to create a proposal/i);
    });

    it('should allow workspace owner to create proposal for project', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${workspaceOwnerToken}`)
        .send({
          project: mockProjectId,
          title: 'Workspace Owner Scope Formulation',
          scopeSummary: 'Owner drafting proposal for workspace project',
          totalBudget: 6000,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should allow workspace admin to create proposal for project', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${workspaceAdminToken}`)
        .send({
          project: mockProjectId,
          title: 'Workspace Admin Scope Formulation',
          scopeSummary: 'Admin drafting proposal for workspace project',
          totalBudget: 5500,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should allow system admin to create proposal for project', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project: mockProjectId,
          title: 'System Admin Scope Formulation',
          scopeSummary: 'System admin override formulation',
          totalBudget: 7000,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // 3. PROPOSAL RETRIEVAL (GET /api/proposals/:id)
  // =========================================================================
  describe('Proposal Retrieval Tenancy & Access', () => {
    it('should allow assigned freelancer to retrieve proposal', async () => {
      const res = await request(app)
        .get(`/api/proposals/${mockProposalId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.proposal).toBeDefined();
      expect(res.body.data.versions).toBeDefined();
    });

    it('should allow assigned client to retrieve proposal', async () => {
      const res = await request(app)
        .get(`/api/proposals/${mockProposalId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow workspace owner to retrieve proposal', async () => {
      const res = await request(app)
        .get(`/api/proposals/${mockProposalId}`)
        .set('Authorization', `Bearer ${workspaceOwnerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should forbid outsider from reading proposal (tenancy isolation)', async () => {
      const res = await request(app)
        .get(`/api/proposals/${mockProposalId}`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not have access to this project/i);
    });

    it('should return 404 when proposal does not exist', async () => {
      const nonExistentProposalId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/proposals/${nonExistentProposalId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/proposal not found/i);
    });
  });

  // =========================================================================
  // 4. PROPOSAL DECISION & SELF-APPROVAL PREVENTION
  // =========================================================================
  describe('Proposal Decision Authorization & Self-Approval Prevention', () => {
    it('should strictly forbid assigned freelancer from approving proposal (self-approval forbidden)', async () => {
      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          decision: PROPOSAL_DECISION.APPROVE,
          comment: 'Freelancer attempting self-approval',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
      expect(mockVersionDoc.save).not.toHaveBeenCalled();
    });

    it('should strictly forbid assigned freelancer from rejecting proposal', async () => {
      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          decision: PROPOSAL_DECISION.REJECT,
          comment: 'Freelancer attempting to reject proposal',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
    });

    it('should forbid any user with freelancer role from approving proposals', async () => {
      const otherFreelancerId = new mongoose.Types.ObjectId().toString();
      const otherFreelancerToken = generateToken({ id: otherFreelancerId });
      jest.spyOn(User, 'findById').mockImplementation((id) => {
        if (id && id.toString() === otherFreelancerId) {
          return {
            select: jest.fn().mockResolvedValue({
              _id: new mongoose.Types.ObjectId(otherFreelancerId),
              name: 'Other Freelancer',
              role: 'freelancer',
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue(null) };
      });

      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${otherFreelancerToken}`)
        .send({ decision: PROPOSAL_DECISION.APPROVE });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
    });

    it('should forbid outsider from recording a decision on proposal', async () => {
      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${unrelatedUserToken}`)
        .send({ decision: PROPOSAL_DECISION.APPROVE });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
    });

    it('should allow assigned client to approve proposal and link approved version to project', async () => {
      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: PROPOSAL_DECISION.APPROVE,
          comment: 'Scope looks solid. Approved for development.',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Proposal decision recorded successfully');
      expect(mockVersionDoc.status).toBe(PROPOSAL_STATUS.APPROVED);
      expect(mockVersionDoc.decidedBy.toString()).toBe(mockClientId);
      expect(mockVersionDoc.decisionComment).toBe('Scope looks solid. Approved for development.');
      expect(mockVersionDoc.save).toHaveBeenCalled();
      expect(mockProposalDoc.status).toBe(PROPOSAL_STATUS.APPROVED);
      expect(mockProposalDoc.save).toHaveBeenCalled();
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProposalDoc.project._id,
        { currentApprovedProposal: mockVersionDoc._id }
      );
    });

    it('should allow assigned client to reject proposal without linking to project', async () => {
      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: PROPOSAL_DECISION.REJECT,
          comment: 'Budget too high. Please revise.',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockVersionDoc.status).toBe(PROPOSAL_STATUS.REJECTED);
      expect(mockVersionDoc.decisionComment).toBe('Budget too high. Please revise.');
      expect(mockVersionDoc.save).toHaveBeenCalled();
      expect(mockProposalDoc.status).toBe(PROPOSAL_STATUS.REJECTED);
      expect(mockProposalDoc.save).toHaveBeenCalled();
      expect(Project.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should allow workspace owner to approve proposal', async () => {
      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${workspaceOwnerToken}`)
        .send({
          decision: PROPOSAL_DECISION.APPROVE,
          comment: 'Owner approved on behalf of client',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockVersionDoc.status).toBe(PROPOSAL_STATUS.APPROVED);
    });

    it('should allow workspace admin to approve proposal', async () => {
      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${workspaceAdminToken}`)
        .send({
          decision: PROPOSAL_DECISION.APPROVE,
          comment: 'Workspace admin approved',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockVersionDoc.status).toBe(PROPOSAL_STATUS.APPROVED);
    });

    it('should allow system admin to approve proposal', async () => {
      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: PROPOSAL_DECISION.APPROVE,
          comment: 'System admin emergency approval',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockVersionDoc.status).toBe(PROPOSAL_STATUS.APPROVED);
    });

    it('should forbid workspace owner from self-approving a proposal they created', async () => {
      mockProposalDoc.createdBy = {
        _id: new mongoose.Types.ObjectId(mockWorkspaceOwnerId),
        name: 'Oliver Owner',
        email: 'owner@test.com',
      };

      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${workspaceOwnerToken}`)
        .send({
          decision: PROPOSAL_DECISION.APPROVE,
          comment: 'Workspace owner attempting self-approval',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
      expect(mockVersionDoc.save).not.toHaveBeenCalled();
    });

    it('should forbid non-admin workspace member from recording decision on proposal', async () => {
      const regularMemberId = new mongoose.Types.ObjectId().toString();
      const regularMemberToken = generateToken({ id: regularMemberId });
      jest.spyOn(User, 'findById').mockImplementation((id) => {
        if (id && id.toString() === regularMemberId) {
          return {
            select: jest.fn().mockResolvedValue({
              _id: new mongoose.Types.ObjectId(regularMemberId),
              name: 'Regular Member',
              role: 'client',
            }),
          };
        }
        if (id && id.toString() === mockFreelancerId) return { select: jest.fn().mockResolvedValue(mockFreelancerUser) };
        if (id && id.toString() === mockClientId) return { select: jest.fn().mockResolvedValue(mockClientUser) };
        return { select: jest.fn().mockResolvedValue(null) };
      });

      const workspaceWithMember = {
        ...mockWorkspaceDoc,
        members: [
          ...mockWorkspaceDoc.members,
          { user: new mongoose.Types.ObjectId(regularMemberId), role: 'member' },
        ],
      };
      jest.spyOn(Workspace, 'findById').mockResolvedValue(workspaceWithMember);

      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${regularMemberToken}`)
        .send({ decision: PROPOSAL_DECISION.APPROVE });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized to record a decision/i);
    });

    it('should successfully record decision when proposal.project is a raw unpopulated ObjectId', async () => {
      mockProposalDoc.project = new mongoose.Types.ObjectId(mockProjectId);

      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: PROPOSAL_DECISION.APPROVE,
          comment: 'Approved with unpopulated project ObjectId',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockVersionDoc.status).toBe(PROPOSAL_STATUS.APPROVED);
    });

    it('should return 409 Conflict when attempting decision on already approved and locked proposal', async () => {
      mockVersionDoc.status = PROPOSAL_STATUS.APPROVED;

      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          decision: PROPOSAL_DECISION.APPROVE,
          comment: 'Attempting duplicate approval',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('This proposal version is already approved and locked.');
    });

    it('should return 404 when proposal does not exist', async () => {
      const nonExistentProposalId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/proposals/${nonExistentProposalId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ decision: PROPOSAL_DECISION.APPROVE });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/proposal not found/i);
    });

    it('should return 404 when active version is missing on proposal', async () => {
      jest.spyOn(ProposalVersion, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/proposals/${mockProposalId}/decision`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ decision: PROPOSAL_DECISION.APPROVE });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/active proposal version not found/i);
    });
  });

  // =========================================================================
  // 5. HELPER FUNCTION UNIT TESTS
  // =========================================================================
  describe('Proposal Authorization Helper Unit Tests', () => {
    it('checkProjectAccess should return true for freelancer, client, and admin', async () => {
      expect(
        await proposalService.checkProjectAccess(mockProjectDoc, mockFreelancerId)
      ).toBe(true);
      expect(
        await proposalService.checkProjectAccess(mockProjectDoc, mockClientId)
      ).toBe(true);
      expect(
        await proposalService.checkProjectAccess(mockProjectDoc, mockAdminId, { role: 'admin' })
      ).toBe(true);
      expect(
        await proposalService.checkProjectAccess(mockProjectDoc, mockUnrelatedUserId)
      ).toBe(false);
      expect(
        await proposalService.checkProjectAccess(null, mockFreelancerId)
      ).toBe(false);
    });

    it('checkCreationAccess should enforce correct creation roles', async () => {
      // Freelancer
      expect(
        await proposalService.checkCreationAccess(mockProjectDoc, mockFreelancerId, { role: 'freelancer' })
      ).toBe(true);

      // System Admin
      expect(
        await proposalService.checkCreationAccess(mockProjectDoc, mockAdminId, { role: 'admin' })
      ).toBe(true);

      // Client role rejected
      expect(
        await proposalService.checkCreationAccess(mockProjectDoc, mockClientId, { role: 'client' })
      ).toBe(false);

      // Assigned client rejected
      expect(
        await proposalService.checkCreationAccess(mockProjectDoc, mockClientId)
      ).toBe(false);

      // Outsider rejected
      expect(
        await proposalService.checkCreationAccess(mockProjectDoc, mockUnrelatedUserId)
      ).toBe(false);

      // Null check
      expect(
        await proposalService.checkCreationAccess(null, mockFreelancerId)
      ).toBe(false);
    });

    it('checkDecisionAccess should enforce reviewer boundaries and forbid self-approval', async () => {
      // Assigned client authorized
      expect(
        await proposalService.checkDecisionAccess(mockProjectDoc, mockClientId, { role: 'client' }, mockProposalDoc)
      ).toBe(true);

      // System admin authorized
      expect(
        await proposalService.checkDecisionAccess(mockProjectDoc, mockAdminId, { role: 'admin' }, mockProposalDoc)
      ).toBe(true);

      // Assigned freelancer forbidden
      expect(
        await proposalService.checkDecisionAccess(mockProjectDoc, mockFreelancerId, { role: 'freelancer' }, mockProposalDoc)
      ).toBe(false);

      // Freelancer role forbidden
      expect(
        await proposalService.checkDecisionAccess(mockProjectDoc, mockUnrelatedUserId, { role: 'freelancer' }, mockProposalDoc)
      ).toBe(false);

      // Creator self-approval forbidden
      expect(
        await proposalService.checkDecisionAccess(mockProjectDoc, mockFreelancerId, { role: 'client' }, mockProposalDoc)
      ).toBe(false);

      // Workspace owner who created the proposal cannot self-approve
      const ownerAuthoredProposal = {
        createdBy: new mongoose.Types.ObjectId(mockWorkspaceOwnerId),
      };
      expect(
        await proposalService.checkDecisionAccess(
          mockProjectDoc,
          mockWorkspaceOwnerId,
          { role: 'client' },
          ownerAuthoredProposal
        )
      ).toBe(false);

      // Outsider forbidden
      expect(
        await proposalService.checkDecisionAccess(mockProjectDoc, mockUnrelatedUserId, { role: 'client' }, mockProposalDoc)
      ).toBe(false);

      // Null check
      expect(
        await proposalService.checkDecisionAccess(null, mockClientId)
      ).toBe(false);
    });
  });
});
