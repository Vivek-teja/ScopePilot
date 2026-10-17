const { connectDB, disconnectDB } = require('../config/db');
const User = require('../modules/auth/auth.model');
const Workspace = require('../modules/workspace/workspace.model');
const Project = require('../modules/project/project.model');
const { Proposal, ProposalVersion } = require('../modules/proposal/proposal.model');
const Milestone = require('../modules/milestone/milestone.model');
const Deliverable = require('../modules/deliverable/deliverable.model');
const { ROLES, WORKSPACE_ROLES } = require('../constants/roles');
const { PROJECT_STATUS } = require('../modules/project/project.constants');
const { PROPOSAL_STATUS } = require('../modules/proposal/proposal.constants');
const { MILESTONE_STATUS } = require('../modules/milestone/milestone.constants');
const { DELIVERABLE_STATUS } = require('../modules/deliverable/deliverable.constants');

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

    console.log('🧹 Cleared existing database records.');

    // 1. Create Users
    const defaultPassword = 'password123';
    const passwordHash = await User.hashPassword(defaultPassword);

    const freelancer = await User.create({
      name: 'Alex Developer',
      email: 'freelancer@scopepilot.dev',
      passwordHash,
      role: ROLES.FREELANCER,
      profileSlug: 'alex-developer',
    });

    const client = await User.create({
      name: 'Sarah Client',
      email: 'client@scopepilot.dev',
      passwordHash,
      role: ROLES.CLIENT,
      profileSlug: 'sarah-client',
    });

    const admin = await User.create({
      name: 'ScopePilot Admin',
      email: 'admin@scopepilot.dev',
      passwordHash,
      role: ROLES.ADMIN,
      profileSlug: 'admin',
    });

    console.log('👤 Created Users:');
    console.log(`   - Freelancer: ${freelancer.email} (Password: ${defaultPassword})`);
    console.log(`   - Client: ${client.email} (Password: ${defaultPassword})`);
    console.log(`   - Admin: ${admin.email} (Password: ${defaultPassword})`);

    // 2. Create Workspace
    const workspace = await Workspace.create({
      name: 'Acme Digital Labs',
      slug: 'acme-digital-labs',
      owner: freelancer._id,
      members: [
        { user: freelancer._id, role: WORKSPACE_ROLES.OWNER },
        { user: client._id, role: WORKSPACE_ROLES.CLIENT },
      ],
    });

    console.log(`🏢 Created Workspace: "${workspace.name}" (ID: ${workspace._id})`);

    // 3. Create Project
    const project = await Project.create({
      workspace: workspace._id,
      freelancer: freelancer._id,
      client: client._id,
      title: 'E-Commerce Platform Redesign',
      description: 'Full stack redesign of client web store with modern headless architecture.',
      status: PROJECT_STATUS.ACTIVE,
    });

    console.log(`📁 Created Project: "${project.title}" (ID: ${project._id})`);

    // 4. Create Proposal & Proposal Version 1
    const proposal = await Proposal.create({
      project: project._id,
      title: 'Initial Scope & Architecture Proposal',
      currentVersionNumber: 1,
      status: PROPOSAL_STATUS.APPROVED,
      createdBy: freelancer._id,
    });

    const proposalVersion = await ProposalVersion.create({
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
      decidedBy: client._id,
      decidedAt: new Date(),
      decisionComment: 'Scope and budget approved. Ready to proceed.',
    });

    proposal.activeVersion = proposalVersion._id;
    await proposal.save();

    // Link current approved proposal into project
    project.currentApprovedProposal = proposalVersion._id;
    await project.save();

    console.log(`📜 Created Approved Proposal Version: "${proposalVersion.title}"`);

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

    console.log('✨ Development seed completed successfully!');
  } catch (error) {
    console.error('❌ Error while seeding database:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

seedData();
