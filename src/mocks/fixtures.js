/**
 * ScopePilot – Demo Fixture Data
 *
 * IMPORTANT: These are LOCAL SAMPLE DATA for the Part 1 demo only.
 * Field names, statuses, and relationships are PROVISIONAL UI MODELS
 * and are NOT agreed backend contracts. Real API adapters (Part 2)
 * will translate backend responses into the view-model shapes used here.
 *
 * IDs, versions, and dates are kept internally consistent for the demo journey:
 *   Login → Workspace → Projects → Freelance Website → Approved Scope →
 *   Milestones → Create "Analytics Dashboard" change request → Review it.
 *
 * The approved scope does NOT include an analytics dashboard;
 * that is explicitly the new work being requested.
 */

// ── Workspace ────────────────────────────────────────────────────────────────
export const WORKSPACE = {
  id: 'ws-001',
  name: 'Taran Creative Studio',
  slug: 'taran-creative',
  description: 'Design & development workspace for freelance client projects.',
  members: [
    { id: 'usr-001', name: 'Taran Thalla',    role: 'owner',    avatar: 'TT' },
    { id: 'usr-002', name: 'Priya Mehta',     role: 'freelancer', avatar: 'PM' },
    { id: 'usr-003', name: 'Kenji Watanabe',  role: 'client',   avatar: 'KW' },
    { id: 'usr-004', name: 'Sofia Reyes',     role: 'client',   avatar: 'SR' },
  ],
  createdAt: '2025-08-01',
};

// ── Demo Users (for role switcher) ──────────────────────────────────────────
export const DEMO_USERS = [
  { id: 'usr-001', name: 'Taran Thalla',   role: 'freelancer', avatar: 'TT', email: 'taran@demo.local' },
  { id: 'usr-003', name: 'Kenji Watanabe', role: 'client',     avatar: 'KW', email: 'kenji@demo.local' },
];

// ── Projects ─────────────────────────────────────────────────────────────────
export const PROJECTS = [
  {
    id: 'proj-001',
    workspaceId: 'ws-001',
    name: 'Freelance Portfolio Website',
    clientId: 'usr-003',
    freelancerId: 'usr-001',
    status: 'active',          // active | completed | paused | archived
    summary: "A responsive portfolio site with custom CMS for Kenji's design practice.",
    startDate: '2025-09-01',
    estimatedEndDate: '2025-12-15',
    tags: ['web', 'design', 'react'],
    approvedProposalId: 'prop-001',
    activeProposalVersion: 2,
  },
  {
    id: 'proj-002',
    workspaceId: 'ws-001',
    name: 'Brand Identity Refresh',
    clientId: 'usr-004',
    freelancerId: 'usr-002',
    status: 'paused',
    summary: 'Logo, palette, and typography overhaul for an artisan bakery brand.',
    startDate: '2025-10-01',
    estimatedEndDate: '2026-02-28',
    tags: ['branding', 'design'],
    approvedProposalId: 'prop-002',
    activeProposalVersion: 1,
  },
  {
    id: 'proj-003',
    workspaceId: 'ws-001',
    name: 'E-commerce Integration',
    clientId: 'usr-003',
    freelancerId: 'usr-001',
    status: 'completed',
    summary: 'Stripe + Shopify headless storefront integration for an existing React site.',
    startDate: '2025-05-01',
    estimatedEndDate: '2025-08-30',
    tags: ['web', 'ecommerce', 'api'],
    approvedProposalId: 'prop-003',
    activeProposalVersion: 3,
  },
];

// ── Proposals ────────────────────────────────────────────────────────────────
export const PROPOSALS = [
  // proj-001: two versions; v1 superseded, v2 approved
  {
    id: 'prop-001-v1',
    proposalId: 'prop-001',
    projectId: 'proj-001',
    version: 1,
    status: 'superseded',          // draft | pending | approved | superseded | rejected
    title: 'Freelance Portfolio Website – Proposal v1',
    agreedDeliverables: [
      'Homepage with hero section',
      'About / CV page',
      'Contact form',
    ],
    revisionLimit: 2,
    revisionsUsed: 2,
    agreedPrice: 2800,
    currency: 'USD',
    startDate: '2025-09-01',
    endDate: '2025-11-30',
    approvedBy: null,
    approvedAt: null,
    notes: 'Client requested scope expansion; superseded by v2.',
  },
  {
    id: 'prop-001-v2',
    proposalId: 'prop-001',
    projectId: 'proj-001',
    version: 2,
    status: 'approved',
    title: 'Freelance Portfolio Website – Proposal v2 (Approved)',
    agreedDeliverables: [
      'Homepage with animated hero section',
      'About / CV page with timeline component',
      'Portfolio gallery with lightbox (up to 20 projects)',
      'Contact form with email notification',
      'Blog (up to 10 initial posts) with a headless CMS',
      'SEO metadata and Open Graph tags',
      'Mobile-responsive layout (375 px – 1440 px)',
    ],
    revisionLimit: 3,
    revisionsUsed: 1,
    agreedPrice: 4200,
    currency: 'USD',
    startDate: '2025-09-15',
    endDate: '2025-12-15',
    approvedBy: 'usr-003',
    approvedAt: '2025-09-14',
    notes:
      'Scope expanded to include blog and CMS. No further free revisions after deliverable sign-off.',
  },

  // proj-002: single approved v1
  {
    id: 'prop-002-v1',
    proposalId: 'prop-002',
    projectId: 'proj-002',
    version: 1,
    status: 'approved',
    title: 'Brand Identity Refresh – Proposal v1 (Approved)',
    agreedDeliverables: [
      'Logo redesign (3 concepts, 1 final)',
      'Colour palette & typography system',
      'Brand guidelines PDF',
      'Social media asset templates (6 sizes)',
    ],
    revisionLimit: 2,
    revisionsUsed: 0,
    agreedPrice: 1800,
    currency: 'USD',
    startDate: '2025-10-01',
    endDate: '2026-02-28',
    approvedBy: 'usr-004',
    approvedAt: '2025-09-28',
    notes: 'On hold pending client asset handoff.',
  },

  // proj-003: v3 approved (completed project)
  {
    id: 'prop-003-v3',
    proposalId: 'prop-003',
    projectId: 'proj-003',
    version: 3,
    status: 'approved',
    title: 'E-commerce Integration – Proposal v3 (Final, Approved)',
    agreedDeliverables: [
      'Stripe payment gateway integration',
      'Shopify Storefront API connection',
      'Cart and checkout flow (React components)',
      'Order confirmation emails',
      'Admin order dashboard (read-only)',
    ],
    revisionLimit: 2,
    revisionsUsed: 2,
    agreedPrice: 6500,
    currency: 'USD',
    startDate: '2025-05-01',
    endDate: '2025-08-30',
    approvedBy: 'usr-003',
    approvedAt: '2025-05-01',
    notes: 'Project completed and signed off 2025-08-29.',
  },
];

// ── Milestones ────────────────────────────────────────────────────────────────
export const MILESTONES = [
  // proj-001 milestones
  {
    id: 'ms-001',
    projectId: 'proj-001',
    title: 'Design & Prototyping',
    description: 'Wireframes, visual design, and interactive prototype approval.',
    status: 'completed',           // planned | in_progress | completed | blocked
    dueDate: '2025-10-15',
    completedAt: '2025-10-12',
    progressPct: 100,
    order: 1,
  },
  {
    id: 'ms-002',
    projectId: 'proj-001',
    title: 'Core Development',
    description: 'Build all approved pages and integrate the headless CMS.',
    status: 'in_progress',
    dueDate: '2025-11-30',
    completedAt: null,
    progressPct: 65,
    order: 2,
  },
  {
    id: 'ms-003',
    projectId: 'proj-001',
    title: 'SEO, Testing & Launch',
    description: 'SEO audit, cross-browser QA, accessibility review, and go-live.',
    status: 'planned',
    dueDate: '2025-12-15',
    completedAt: null,
    progressPct: 0,
    order: 3,
  },
];

// ── Deliverables ─────────────────────────────────────────────────────────────
export const DELIVERABLES = [
  // ms-001 (completed)
  {
    id: 'del-001', milestoneId: 'ms-001', projectId: 'proj-001',
    title: 'Homepage wireframe',
    status: 'accepted',            // pending | in_progress | submitted | accepted | rejected
    dueDate: '2025-09-25',
    evidenceUrl: 'https://figma.com/file/demo-wireframes',
    notes: 'Approved by Kenji on 2025-09-24.',
  },
  {
    id: 'del-002', milestoneId: 'ms-001', projectId: 'proj-001',
    title: 'Visual design (all pages)',
    status: 'accepted',
    dueDate: '2025-10-10',
    evidenceUrl: 'https://figma.com/file/demo-visual-design',
    notes: 'One revision requested (typography); finalised 2025-10-11.',
  },
  // ms-002 (in progress)
  {
    id: 'del-003', milestoneId: 'ms-002', projectId: 'proj-001',
    title: 'Homepage (animated hero)',
    status: 'accepted',
    dueDate: '2025-11-01',
    evidenceUrl: 'https://staging.demo-portfolio.local/home',
    notes: null,
  },
  {
    id: 'del-004', milestoneId: 'ms-002', projectId: 'proj-001',
    title: 'About / CV page',
    status: 'accepted',
    dueDate: '2025-11-05',
    evidenceUrl: 'https://staging.demo-portfolio.local/about',
    notes: null,
  },
  {
    id: 'del-005', milestoneId: 'ms-002', projectId: 'proj-001',
    title: 'Portfolio gallery with lightbox',
    status: 'in_progress',
    dueDate: '2025-11-18',
    evidenceUrl: null,
    notes: 'Lightbox plugin integration in progress.',
  },
  {
    id: 'del-006', milestoneId: 'ms-002', projectId: 'proj-001',
    title: 'Blog + headless CMS setup',
    status: 'in_progress',
    dueDate: '2025-11-25',
    evidenceUrl: null,
    notes: null,
  },
  {
    id: 'del-007', milestoneId: 'ms-002', projectId: 'proj-001',
    title: 'Contact form with email notification',
    status: 'pending',
    dueDate: '2025-11-28',
    evidenceUrl: null,
    notes: null,
  },
  // ms-003 (planned)
  {
    id: 'del-008', milestoneId: 'ms-003', projectId: 'proj-001',
    title: 'SEO metadata & OG tags',
    status: 'pending',
    dueDate: '2025-12-05',
    evidenceUrl: null,
    notes: null,
  },
  {
    id: 'del-009', milestoneId: 'ms-003', projectId: 'proj-001',
    title: 'Cross-browser QA report',
    status: 'pending',
    dueDate: '2025-12-10',
    evidenceUrl: null,
    notes: null,
  },
  {
    id: 'del-010', milestoneId: 'ms-003', projectId: 'proj-001',
    title: 'Accessibility audit & remediation',
    status: 'pending',
    dueDate: '2025-12-12',
    evidenceUrl: null,
    notes: null,
  },
];

// ── Change Requests ───────────────────────────────────────────────────────────
export const CHANGE_REQUESTS = [
  {
    id: 'cr-001',
    projectId: 'proj-001',
    title: 'Add client-editable testimonials section',
    requestedBy: 'usr-003',   // Kenji (client)
    status: 'approved',        // draft | submitted | under_review | approved | rejected | withdrawn
    priority: 'low',
    summary:
      'Client wants a testimonials row on the homepage that they can update without developer access.',
    newWork:
      'Build a CMS-managed testimonials component and wire it to the existing headless CMS.',
    affectedMilestoneIds: ['ms-002'],
    affectedDeliverableIds: ['del-006'],
    estimatedEffortHours: 8,
    scheduleImpactDays: 2,
    humanDecision: 'approved',  // pending | approved | rejected
    humanDecisionAt: '2025-10-20',
    humanDecisionBy: 'usr-001',
    humanDecisionNote: 'Accepted as minor in-scope enhancement. No price change.',
    aiAnalysis: null,           // AI is not connected in Part 1
    createdAt: '2025-10-18',
    updatedAt: '2025-10-20',
  },
];

// ── Seed key used for localStorage namespacing ────────────────────────────────
export const STORAGE_KEY = 'scopepilot_demo_v1';
