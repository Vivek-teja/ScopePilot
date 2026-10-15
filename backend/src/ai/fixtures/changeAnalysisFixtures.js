/**
 * Realistic Fixture Scenarios for ScopePilot AI Change Analysis Contract
 * Review 2 of 5: Five canonical test cases representing distinct evaluation outcomes.
 */

const baseProposalVersion = {
  versionNumber: 1,
  title: 'E-Commerce MVP Scope',
  scopeSummary: 'Standard e-commerce store with product catalog, cart, and Stripe checkout.',
  scopeItems: [
    {
      id: 'si_1',
      title: 'User Authentication & Profiles',
      description: 'JWT-based signup, login, password reset, and profile management.',
      estimatedHours: 25,
      price: 2500,
    },
    {
      id: 'si_2',
      title: 'Product Catalog & Search',
      description: 'Product listing with pagination, search, category filters, and product details.',
      estimatedHours: 35,
      price: 3500,
    },
    {
      id: 'si_3',
      title: 'Shopping Cart & Checkout',
      description: 'Cart state management, order creation, and Stripe checkout integration.',
      estimatedHours: 40,
      price: 4000,
    },
  ],
};

const baseDeliverables = [
  {
    id: 'del_auth_01',
    title: 'User Authentication API',
    scopeReference: 'DEL-AUTH-01',
    description: 'REST endpoints for user registration, authentication, and session handling.',
    acceptanceCriteria: ['Users can register and log in', 'JWT token issued on authentication'],
  },
  {
    id: 'del_cat_01',
    title: 'Product Catalog and Search UI',
    scopeReference: 'DEL-CAT-01',
    description: 'React product catalog grid with keyword search and filtering.',
    acceptanceCriteria: ['Filter products by category', 'Search products by title'],
  },
  {
    id: 'del_chk_01',
    title: 'Checkout Flow and Payment Processing',
    scopeReference: 'DEL-CHK-01',
    description: 'Order submission, Stripe payment intent creation, and receipt confirmation.',
    acceptanceCriteria: ['Users can purchase items via Stripe', 'Order confirmation email triggered'],
  },
];

// ============================================================================
// CASE 1: CLEARLY IN SCOPE
// Category: clearly_in_scope -> reviewStatus: 'in_scope'
// Rationale: Refinement of the existing checkout flow telephone field to follow E.164.
// Directly matches DEL-CHK-01 without adding unbudgeted features.
// ============================================================================
const case1_clearlyInScope = {
  projectId: 'proj_ecommerce_99',
  approvedProposalVersion: baseProposalVersion,
  deliverables: baseDeliverables,
  newClientRequest: {
    title: 'Checkout phone number validation',
    description: 'Ensure phone numbers entered in the checkout flow follow standard international E.164 formatting before Stripe payment intent creation.',
    requestedBy: 'client_usr_42',
    clientNotes: 'Deliverable DEL-CHK-01 refinement.',
  },
};

// ============================================================================
// CASE 2: CLEARLY OUT OF SCOPE
// Category: clearly_out_of_scope -> reviewStatus: 'out_of_scope'
// Rationale: Request introduces Cryptocurrency Wallet & Web3 smart contract settlement.
// No overlap exists with proposal or deliverables; introduces unbudgeted architecture.
// ============================================================================
const case2_clearlyOutOfScope = {
  projectId: 'proj_ecommerce_99',
  approvedProposalVersion: baseProposalVersion,
  deliverables: baseDeliverables,
  newClientRequest: {
    title: 'Cryptocurrency Wallet Integration & Web3 Token Settlement',
    description: 'Allow customers to connect MetaMask or Phantom crypto wallets and transfer Ethereum or Solana tokens for order settlement instead of fiat currency.',
    requestedBy: 'client_usr_42',
    clientNotes: 'Requested for international crypto buyers.',
  },
};

// ============================================================================
// CASE 3: PARTIAL OVERLAP
// Category: partial_overlap -> reviewStatus: 'partially_out_of_scope'
// Rationale: Product catalog UI is in scope (DEL-CAT-01), but adding bulk CSV import
// and automated supplier inventory synchronization constitutes major unbudgeted additions.
// ============================================================================
const case3_partialOverlap = {
  projectId: 'proj_ecommerce_99',
  approvedProposalVersion: baseProposalVersion,
  deliverables: baseDeliverables,
  newClientRequest: {
    title: 'Product Catalog CSV Bulk Import and Automated Inventory Sync',
    description: 'Extend the product catalog screen with a CSV upload button so store managers can bulk-import 5,000 products at once, and add automated hourly background sync from external suppliers.',
    requestedBy: 'client_usr_42',
    clientNotes: 'Touches catalog screen, adds bulk ingest.',
  },
};

// Legacy alias for backwards compatibility
const sampleRequestAnalytics = {
  projectId: 'proj_ecommerce_99',
  approvedProposalVersion: baseProposalVersion,
  deliverables: baseDeliverables,
  newClientRequest: {
    title: 'Customer Analytics Dashboard with PDF Export',
    description: 'We would like to add an admin dashboard to visualize customer purchase history and sales analytics, plus export reports to PDF.',
    requestedBy: 'client_usr_42',
    clientNotes: 'Targeting release alongside checkout flow.',
  },
};

// ============================================================================
// CASE 4: AMBIGUOUS REQUEST
// Category: ambiguous_request -> reviewStatus: 'needs_clarification'
// Rationale: Vague, non-functional subjective language ("significantly faster", "enhance",
// "premium look", "optimize"). No quantitative criteria or target metrics provided.
// ============================================================================
const case4_ambiguousRequest = {
  projectId: 'proj_ecommerce_99',
  approvedProposalVersion: baseProposalVersion,
  deliverables: baseDeliverables,
  newClientRequest: {
    title: 'Make store experience significantly faster and enhance overall UI',
    description: 'The client feels the storefront could be much faster and wants to enhance the look and feel to make it look premium and optimize page loads across all pages.',
    requestedBy: 'client_usr_42',
    clientNotes: 'Subjective user feedback from client stakeholder.',
  },
};

// ============================================================================
// CASE 5: INSUFFICIENT EVIDENCE
// Category: insufficient_evidence -> reviewStatus: 'uncertain'
// Rationale: Requests sync into proprietary on-premise SAP/ERP warehouse via custom connector.
// Zero mention or architecture specifications exist in the approved proposal baseline.
// Requires human consultation and technical discovery before feasibility can be assessed.
// ============================================================================
const case5_insufficientEvidence = {
  projectId: 'proj_ecommerce_99',
  approvedProposalVersion: baseProposalVersion,
  deliverables: baseDeliverables,
  newClientRequest: {
    title: 'Sync orders to internal enterprise ERP via custom warehouse connector',
    description: 'Push completed orders directly into our proprietary on-premise SAP warehouse system using our internal legacy connector API and custom VPN tunnel.',
    requestedBy: 'client_usr_42',
    clientNotes: 'Mentions unknown proprietary internal ERP systems not referenced in proposal.',
  },
};

// Metadata directory of all 5 canonical test cases
const ALL_CASES = [
  {
    id: 'case-1',
    key: 'clearly_in_scope',
    name: 'Case 1: Clearly In Scope',
    category: 'Clearly In Scope',
    expectedStatus: 'in_scope',
    description: 'Validates checkout phone number formatting adhering directly to DEL-CHK-01.',
    payload: case1_clearlyInScope,
    explanation: 'The requested phone validation refines existing checkout processing without adding new unbudgeted modules.',
  },
  {
    id: 'case-2',
    key: 'clearly_out_of_scope',
    name: 'Case 2: Clearly Out of Scope',
    category: 'Clearly Out of Scope',
    expectedStatus: 'out_of_scope',
    description: 'Requests Web3/cryptocurrency payment gateway which was never part of proposal.',
    payload: case2_clearlyOutOfScope,
    explanation: 'Web3 & crypto wallet integration introduces completely new infrastructure, third-party libraries, and security auditing not covered in scope.',
  },
  {
    id: 'case-3',
    key: 'partial_overlap',
    name: 'Case 3: Partial Overlap',
    category: 'Partial Overlap',
    expectedStatus: 'partially_out_of_scope',
    description: 'Touches DEL-CAT-01 (catalog UI) but adds major new bulk CSV and background sync features.',
    payload: case3_partialOverlap,
    explanation: 'Existing deliverable covers product catalog viewing, but bulk CSV ingestion and background supplier sync require additional endpoints and queue workers.',
  },
  {
    id: 'case-4',
    key: 'ambiguous_request',
    name: 'Case 4: Ambiguous Request',
    category: 'Ambiguous Request',
    expectedStatus: 'needs_clarification',
    description: 'Uses subjective adjectives ("faster", "premium", "optimize") without metrics or acceptance criteria.',
    payload: case4_ambiguousRequest,
    explanation: 'Cannot classify scope divergence without measurable performance targets (e.g., p95 latency under 200ms) and specific design briefs.',
  },
  {
    id: 'case-5',
    key: 'insufficient_evidence',
    name: 'Case 5: Insufficient Evidence',
    category: 'Insufficient Evidence',
    expectedStatus: 'uncertain',
    description: 'Refers to unknown on-premise SAP ERP and VPN not documented in approved scope.',
    payload: case5_insufficientEvidence,
    explanation: 'The approved proposal baseline has zero documentation on the proprietary connector or SAP schema, requiring technical discovery before estimating.',
  },
];

module.exports = {
  baseProposalVersion,
  baseDeliverables,
  // 5 Canonical cases
  case1_clearlyInScope,
  case2_clearlyOutOfScope,
  case3_partialOverlap,
  case4_ambiguousRequest,
  case5_insufficientEvidence,
  ALL_CASES,
  // Backwards-compatible aliases
  sampleRequestAnalytics,
  sampleRequestInScope: case1_clearlyInScope,
  sampleRequestAmbiguous: case4_ambiguousRequest,
};
