/**
 * Realistic Fixture Scenarios for ScopePilot AI Change Analysis Contract
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

// Scenario 1: Mixed / Out-of-Scope Request (Analytics Dashboard)
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

// Scenario 2: In-Scope Request (Field refinement)
const sampleRequestInScope = {
  projectId: 'proj_ecommerce_99',
  approvedProposalVersion: baseProposalVersion,
  deliverables: baseDeliverables,
  newClientRequest: {
    title: 'Checkout phone number validation',
    description: 'Ensure phone numbers entered in the checkout flow follow standard E.164 formatting.',
    requestedBy: 'client_usr_42',
  },
};

// Scenario 3: Missing Evidence / Ambiguous Request
const sampleRequestAmbiguous = {
  projectId: 'proj_ecommerce_99',
  approvedProposalVersion: baseProposalVersion,
  deliverables: baseDeliverables,
  newClientRequest: {
    title: 'Improve app performance and enhance styling',
    description: 'Make the whole application significantly faster and enhance user experience across all pages.',
    requestedBy: 'client_usr_42',
  },
};

module.exports = {
  baseProposalVersion,
  baseDeliverables,
  sampleRequestAnalytics,
  sampleRequestInScope,
  sampleRequestAmbiguous,
};
