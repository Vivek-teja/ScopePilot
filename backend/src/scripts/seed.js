const { connectDB, disconnectDB } = require('../config/db');
const User = require('../modules/auth/auth.model');
const Workspace = require('../modules/workspace/workspace.model');
const Project = require('../modules/project/project.model');
const { Proposal, ProposalVersion } = require('../modules/proposal/proposal.model');
const Milestone = require('../modules/milestone/milestone.model');
const Deliverable = require('../modules/deliverable/deliverable.model');
const ChangeRequest = require('../modules/changeRequest/changeRequest.model');
const { ROLES, WORKSPACE_ROLES } = require('../constants/roles');
const { PROJECT_STATUS } = require('../modules/project/project.constants');
const { PROPOSAL_STATUS } = require('../modules/proposal/proposal.constants');
const { MILESTONE_STATUS } = require('../modules/milestone/milestone.constants');
const { DELIVERABLE_STATUS } = require('../modules/deliverable/deliverable.constants');
const { CHANGE_REQUEST_STATUS } = require('../modules/changeRequest/changeRequest.constants');

const seedData = async () => {
  try {
    console.log('🌱 Starting ScopePilot development seed...');
    await connectDB();

    // Clear existing development collections
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Project.deleteMany({});
    await Proposal.deleteMany({});
    await ProposalVersion.deleteMany({});
    await Milestone.deleteMany({});
    await Deliverable.deleteMany({});
    await ChangeRequest.deleteMany({});

    console.log('🧹 Cleared existing database records.');

    // 1. Create Users (5 Demo accounts + legacy aliases)
    const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'password123';
    const passwordHash = await User.hashPassword(defaultPassword);

    const demo1 = await User.create({
      name: 'Demo 1 (Freelancer)',
      email: 'demo1@scopepilot.dev',
      passwordHash,
      role: ROLES.FREELANCER,
      profileSlug: 'demo1-freelancer',
    });

    const demo2 = await User.create({
      name: 'Demo 2 (Client)',
      email: 'demo2@scopepilot.dev',
      passwordHash,
      role: ROLES.CLIENT,
      profileSlug: 'demo2-client',
    });

    const demo3 = await User.create({
      name: 'Demo 3 (Freelancer)',
      email: 'demo3@scopepilot.dev',
      passwordHash,
      role: ROLES.FREELANCER,
      profileSlug: 'demo3-freelancer',
    });

    const demo4 = await User.create({
      name: 'Demo 4 (Client)',
      email: 'demo4@scopepilot.dev',
      passwordHash,
      role: ROLES.CLIENT,
      profileSlug: 'demo4-client',
    });

    const demo5 = await User.create({
      name: 'Demo 5 (Admin)',
      email: 'demo5@scopepilot.dev',
      passwordHash,
      role: ROLES.ADMIN,
      profileSlug: 'demo5-admin',
    });

    // Also create legacy alias accounts for convenience
    await User.create({
      name: 'Alex Freelancer',
      email: 'freelancer@scopepilot.dev',
      passwordHash,
      role: ROLES.FREELANCER,
      profileSlug: 'alex-freelancer',
    });

    await User.create({
      name: 'Sarah Client',
      email: 'client@scopepilot.dev',
      passwordHash,
      role: ROLES.CLIENT,
      profileSlug: 'sarah-client',
    });

    console.log('👤 Created 5 Demo Accounts (Password: password123):');
    console.log(`   - ${demo1.name}: ${demo1.email} [role: ${demo1.role}]`);
    console.log(`   - ${demo2.name}: ${demo2.email} [role: ${demo2.role}]`);
    console.log(`   - ${demo3.name}: ${demo3.email} [role: ${demo3.role}]`);
    console.log(`   - ${demo4.name}: ${demo4.email} [role: ${demo4.role}]`);
    console.log(`   - ${demo5.name}: ${demo5.email} [role: ${demo5.role}]`);

    // 2. Create Workspace
    const workspace = await Workspace.create({
      name: 'Acme Digital Labs',
      slug: 'acme-digital-labs',
      owner: demo1._id,
      members: [
        { user: demo1._id, role: WORKSPACE_ROLES.OWNER },
        { user: demo2._id, role: WORKSPACE_ROLES.CLIENT },
        { user: demo3._id, role: WORKSPACE_ROLES.MEMBER },
        { user: demo4._id, role: WORKSPACE_ROLES.CLIENT },
        { user: demo5._id, role: WORKSPACE_ROLES.ADMIN },
      ],
    });

    console.log(`🏢 Created Workspace: "${workspace.name}" (ID: ${workspace._id})`);

    // 3. Create Project
    const project = await Project.create({
      workspace: workspace._id,
      freelancer: demo1._id,
      client: demo2._id,
      title: 'E-Commerce Platform Redesign',
      description: 'Full stack redesign of client web store with modern headless architecture.',
      status: PROJECT_STATUS.ACTIVE,
    });

    console.log(`📁 Created Project: "${project.title}" (ID: ${project._id})`);

    // 4. Create Proposal with Version 1 (Approved) AND Version 2 (Pending Review)
    const proposal = await Proposal.create({
      project: project._id,
      title: 'Initial Scope & Architecture Proposal',
      currentVersionNumber: 2,
      status: PROPOSAL_STATUS.PENDING_APPROVAL,
      createdBy: demo1._id,
    });

    const proposalVersion1 = await ProposalVersion.create({
      proposal: proposal._id,
      project: project._id,
      versionNumber: 1,
      title: 'Initial Scope & Architecture Proposal - v1',
      scopeSummary: 'Setup modern frontend store, product catalog APIs, and Stripe checkout integration.',
      scopeItems: [
        {
          title: 'Design System & UI Components',
          description: 'Responsive React component library matching client branding guidelines.',
          estimatedHours: 40,
          price: 4000,
        },
        {
          title: 'Catalog API & Cart Service',
          description: 'Node.js/Express microservices with MongoDB database indexing.',
          estimatedHours: 50,
          price: 5000,
        },
        {
          title: 'Payment Gateway Integration',
          description: 'Stripe webhook listener and customer invoice generation.',
          estimatedHours: 30,
          price: 3000,
        },
      ],
      totalBudget: 12000,
      currency: 'USD',
      status: PROPOSAL_STATUS.APPROVED,
      decidedBy: demo2._id,
      decidedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      decisionComment: 'Scope and budget approved for Phase 1. Ready to proceed.',
      createdBy: demo1._id,
    });

    const proposalVersion2 = await ProposalVersion.create({
      proposal: proposal._id,
      project: project._id,
      versionNumber: 2,
      title: 'Phase 2 Expansion Proposal - v2',
      scopeSummary: 'Add mobile responsive performance optimizations and multi-currency payment checkout.',
      scopeItems: [
        {
          title: 'Design System & UI Components',
          description: 'Responsive React component library matching client branding guidelines.',
          estimatedHours: 40,
          price: 4000,
        },
        {
          title: 'Catalog API & Cart Service',
          description: 'Node.js/Express microservices with MongoDB database indexing.',
          estimatedHours: 50,
          price: 5000,
        },
        {
          title: 'Payment Gateway Integration',
          description: 'Stripe webhook listener and customer invoice generation.',
          estimatedHours: 30,
          price: 3000,
        },
        {
          title: 'Multi-Currency & Regional Tax Calculation',
          description: 'Automatic FX rate conversion and VAT/sales tax automation.',
          estimatedHours: 35,
          price: 4000,
        },
      ],
      totalBudget: 16000,
      currency: 'USD',
      status: PROPOSAL_STATUS.PENDING_APPROVAL,
      createdBy: demo1._id,
    });

    proposal.activeVersion = proposalVersion2._id;
    await proposal.save();

    // Link approved v1 as baseline
    project.currentApprovedProposal = proposalVersion1._id;
    await project.save();

    console.log(`📜 Created Proposal: v1 (Approved) & v2 (Pending Client Review)`);

    // 5. Create Milestone & Deliverable
    const milestone = await Milestone.create({
      project: project._id,
      title: 'Milestone 1: Core Architecture & Design System',
      description: 'Deliver responsive foundation and backend authentication/catalog scaffolding.',
      status: MILESTONE_STATUS.IN_PROGRESS,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 days
      order: 1,
    });

    const deliverable = await Deliverable.create({
      project: project._id,
      milestone: milestone._id,
      title: 'Design System UI Kit',
      description: 'Complete Figma to React component translation with Storybook docs.',
      scopeReference: 'PROP-V1-ITEM-1',
      status: DELIVERABLE_STATUS.IN_PROGRESS,
      acceptanceCriteria: [
        '100% test coverage on critical form components',
        'Storybook documentation deployed',
        'WCAG AA accessibility verified',
      ],
    });

    milestone.deliverables.push(deliverable._id);
    await milestone.save();

    console.log(`🎯 Created Milestone: "${milestone.title}"`);
    console.log(`📦 Created Deliverable: "${deliverable.title}" (Scope Ref: ${deliverable.scopeReference})`);

    // 6. Create Change Request created by Client (Demo 2)
    const changeRequest = await ChangeRequest.create({
      project: project._id,
      requestedBy: demo2._id,
      title: 'Cryptocurrency Wallet Integration & Web3 Checkout',
      description: 'Client requests integration of Web3 / Metamask crypto wallet checkout in addition to standard credit card processing.',
      status: CHANGE_REQUEST_STATUS.SUBMITTED,
      effortEstimate: 24,
      affectedMilestones: [milestone._id],
      relatedDeliverables: [deliverable._id],
    });

    console.log(`🔄 Created Change Request by Client: "${changeRequest.title}" (ID: ${changeRequest._id})`);

    console.log('✨ Development seed completed successfully!');
  } catch (error) {
    console.error('❌ Error while seeding database:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

seedData();
