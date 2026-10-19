/**
 * Canonical approved scope corpus representing the agreed baseline for Review 3.
 * Maintains explicit source proposal version and deliverable references for traceability.
 */
const CANONICAL_SCOPE_PASSAGES = [
  {
    passageId: 'psg-del-chk-01',
    documentId: 'del_chk_01',
    documentType: 'deliverable',
    sourceReference: 'DEL-CHK-01',
    proposalVersion: 1,
    sourceTitle: 'Checkout Flow & Payment Validation',
    passageText:
      'Checkout Flow & Payment Validation. Implement multi-step cart checkout with billing and shipping address validation. Requires international telephone number formatting in E.164 standard (+1-xxx-xxx-xxxx) and pre-submission input field sanitization. Finalize purchase and generate order confirmation screen.',
    metadata: {
      projectId: 'proj_ecommerce_01',
      versionNumber: 1,
      category: 'checkout',
      tags: ['checkout', 'validation', 'phone', 'e164', 'cart', 'billing'],
      estimatedHours: 25,
    },
  },
  {
    passageId: 'psg-del-cat-01',
    documentId: 'del_cat_01',
    documentType: 'deliverable',
    sourceReference: 'DEL-CAT-01',
    proposalVersion: 1,
    sourceTitle: 'Product Catalog and Search UI',
    passageText:
      'Product Catalog and Search UI. Provide responsive product catalog grid with faceted filtering by price bracket, brand, and category tags. Support full-text search with keyword highlighting and sorting articles by arrival date, popularity, or price. Client-side state management for fast browsing.',
    metadata: {
      projectId: 'proj_ecommerce_01',
      versionNumber: 1,
      category: 'catalog',
      tags: ['catalog', 'goods', 'products', 'search', 'filter', 'faceted', 'sorting'],
      estimatedHours: 35,
    },
  },
  {
    passageId: 'psg-del-pay-01',
    documentId: 'del_pay_01',
    documentType: 'deliverable',
    sourceReference: 'DEL-PAY-01',
    proposalVersion: 1,
    sourceTitle: 'Stripe Credit Card Payment Gateway',
    passageText:
      'Stripe Credit Card Payment Gateway. PCI-DSS compliant credit and debit card processing via Stripe Elements SDK. Supports 3D Secure 2.0 customer authentication, webhook listener for payment success/failure, refund handling, and settlement in USD/EUR fiat currencies.',
    metadata: {
      projectId: 'proj_ecommerce_01',
      versionNumber: 1,
      category: 'payment',
      tags: ['payment', 'stripe', 'credit', 'card', 'fiat', 'checkout', 'pci'],
      estimatedHours: 30,
    },
  },
  {
    passageId: 'psg-del-notif-01',
    documentId: 'del_notif_01',
    documentType: 'deliverable',
    sourceReference: 'DEL-NOTIF-01',
    proposalVersion: 1,
    sourceTitle: 'Email Notification Service',
    passageText:
      'Email Notification Service. Automated transactional email dispatch via SendGrid and SMTP relay. Dispatches order confirmation receipt, shipping dispatch tracking link, password reset tokens, and invoice attachments. Covers email delivery mechanisms only.',
    metadata: {
      projectId: 'proj_ecommerce_01',
      versionNumber: 1,
      category: 'communication',
      tags: ['email', 'notifications', 'smtp', 'sendgrid', 'receipt', 'alerts'],
      estimatedHours: 15,
    },
  },
  {
    passageId: 'psg-del-auth-01',
    documentId: 'del_auth_01',
    documentType: 'deliverable',
    sourceReference: 'DEL-AUTH-01',
    proposalVersion: 1,
    sourceTitle: 'Customer Authentication & Profile Management',
    passageText:
      'Customer Authentication & Profile Management. User registration, login, and password reset workflows using stateless JWT bearer tokens and bcrypt password hashing. User account profile screen allowing password updates and stored shipping address management.',
    metadata: {
      projectId: 'proj_ecommerce_01',
      versionNumber: 1,
      category: 'identity',
      tags: ['auth', 'jwt', 'security', 'login', 'signup', 'profile'],
      estimatedHours: 20,
    },
  },
  {
    passageId: 'psg-prop-v1-scope-01',
    documentId: 'prop_v1_scope_01',
    documentType: 'proposal_scope_item',
    sourceReference: 'PROP-V1-SCOPE-01',
    proposalVersion: 1,
    sourceTitle: 'Core Platform Architecture & Scope Baseline',
    passageText:
      'Core Platform Architecture & Scope Baseline. Web-based retail store platform hosted on standard Node.js/Express backend with MongoDB database. Scope encompasses web store browsing, catalog search display, shopping cart management, credit card checkout, and transactional email communications.',
    metadata: {
      projectId: 'proj_ecommerce_01',
      versionNumber: 1,
      category: 'architecture',
      tags: ['scope', 'baseline', 'architecture', 'web', 'ecommerce'],
      estimatedHours: 40,
    },
  },
];

class CorpusService {
  constructor(initialPassages = CANONICAL_SCOPE_PASSAGES) {
    this.passages = [...initialPassages];
  }

  /**
   * Returns all indexed passages with metadata.
   * @returns {Array<object>}
   */
  getAllPassages() {
    return [...this.passages];
  }

  /**
   * Finds a passage by ID or source reference.
   * @param {string} idOrRef 
   * @returns {object|null}
   */
  getPassage(idOrRef) {
    if (!idOrRef) return null;
    return (
      this.passages.find(
        (p) =>
          p.passageId === idOrRef ||
          p.sourceReference.toLowerCase() === idOrRef.toLowerCase() ||
          p.documentId.toLowerCase() === idOrRef.toLowerCase()
      ) || null
    );
  }

  /**
   * Dynamically constructs passages from a runtime ProposalVersion and Deliverables array.
   * Ensures traceability to approved proposal version and deliverable identifiers.
   * 
   * @param {object} proposalVersion 
   * @param {Array<object>} deliverables 
   * @returns {Array<object>}
   */
  buildPassagesFromProposalAndDeliverables(proposalVersion = {}, deliverables = []) {
    const dynamicPassages = [];
    const vNum = proposalVersion.versionNumber || proposalVersion.version || 1;
    const pId = proposalVersion.projectId || 'proj_active';

    // 1. Ingest Proposal Scope Items
    const scopeItems = proposalVersion.scopeItems || [];
    scopeItems.forEach((item, idx) => {
      dynamicPassages.push({
        passageId: `psg-prop-v${vNum}-item-${idx + 1}`,
        documentId: item._id ? item._id.toString() : `prop_v${vNum}_item_${idx + 1}`,
        documentType: 'proposal_scope_item',
        sourceReference: `PROP-V${vNum}-SCOPE-${String(idx + 1).padStart(2, '0')}`,
        proposalVersion: vNum,
        sourceTitle: item.title || `Scope Item ${idx + 1}`,
        passageText: `${item.title || ''}. ${item.description || ''}`.trim(),
        metadata: {
          projectId: pId,
          versionNumber: vNum,
          estimatedHours: item.estimatedHours || 0,
          price: item.price || 0,
        },
      });
    });

    // 2. Ingest Deliverables
    deliverables.forEach((del, idx) => {
      const scopeRef = del.scopeReference || `DEL-${String(idx + 1).padStart(2, '0')}`;
      const critText = Array.isArray(del.acceptanceCriteria)
        ? ` Acceptance criteria: ${del.acceptanceCriteria.join('; ')}`
        : '';

      dynamicPassages.push({
        passageId: `psg-${(del._id || del.id || `del_${idx + 1}`).toString().toLowerCase()}`,
        documentId: (del._id || del.id || `del_${idx + 1}`).toString(),
        documentType: 'deliverable',
        sourceReference: scopeRef,
        proposalVersion: vNum,
        sourceTitle: del.title || `Deliverable ${scopeRef}`,
        passageText: `${del.title || ''}. ${del.description || ''}${critText}`.trim(),
        metadata: {
          projectId: pId,
          versionNumber: vNum,
          category: del.category || 'general',
          acceptanceCriteriaCount: (del.acceptanceCriteria || []).length,
        },
      });
    });

    return dynamicPassages;
  }
}

const defaultCorpusService = new CorpusService();

module.exports = {
  CorpusService,
  defaultCorpusService,
  CANONICAL_SCOPE_PASSAGES,
};
