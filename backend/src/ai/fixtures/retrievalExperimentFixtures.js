const { RETRIEVAL_STATUS, RELEVANCE_CATEGORY } = require('../../contracts/retrieval.contract');

const RETRIEVAL_EXPERIMENT_CASES = [
  {
    experimentId: 'exp-01',
    category: 'Different Wording (Semantic Match)',
    query: 'Add mobile cellphone dial code picker and format check on the final buying screen',
    hypothesis:
      'Natural-language query uses colloquial vocabulary ("cellphone dial code", "buying screen") instead of formal contractual terminology ("E.164 telephone format", "checkout flow"). Semantic embeddings will accurately map to DEL-CHK-01.',
    expectedReference: 'DEL-CHK-01',
    expectedStatus: RETRIEVAL_STATUS.CANDIDATE_FOUND,
    expectedCategory: RELEVANCE_CATEGORY.STRONG_MATCH,
    minExpectedScore: 0.70,
    traceabilityNotes:
      'Source: Proposal Version 1 Deliverable DEL-CHK-01. Confirms customer telephone validation requirement.',
  },
  {
    experimentId: 'exp-02',
    category: 'Synonym Paraphrase (Catalog Search)',
    query: 'Allow buyers to filter goods by price bracket and sort articles by arrival date',
    hypothesis:
      'Query uses commercial synonyms ("goods", "articles", "arrival date") differing from baseline phrasing ("product catalog", "faceted filtering", "date sorting"). Retrieval will correctly retrieve DEL-CAT-01.',
    expectedReference: 'DEL-CAT-01',
    expectedStatus: RETRIEVAL_STATUS.CANDIDATE_FOUND,
    expectedCategory: RELEVANCE_CATEGORY.STRONG_MATCH,
    minExpectedScore: 0.70,
    traceabilityNotes:
      'Source: Proposal Version 1 Deliverable DEL-CAT-01. Covers faceted search, categories, and date sorting.',
  },
  {
    experimentId: 'exp-03',
    category: 'Ambiguous Overlap (Weak Match)',
    query: 'Send automated SMS alerts and push notifications when order status updates',
    hypothesis:
      'The client requests SMS and push notifications. The baseline only specifies SMTP/SendGrid email (DEL-NOTIF-01). The engine must retrieve DEL-NOTIF-01 as a WEAK candidate without hallucinating full scope coverage.',
    expectedReference: 'DEL-NOTIF-01',
    expectedStatus: RETRIEVAL_STATUS.WEAK_EVIDENCE,
    expectedCategory: RELEVANCE_CATEGORY.WEAK_MATCH,
    minExpectedScore: 0.40,
    traceabilityNotes:
      'Source: Proposal Version 1 Deliverable DEL-NOTIF-01. Explicitly limited to email transactional receipts.',
  },
  {
    experimentId: 'exp-04',
    category: 'Out-of-Scope Distractor (Proximity Guard)',
    query: 'Connect decentralized web3 wallet to process crypto payments',
    hypothesis:
      'Query references payment protocols, making DEL-PAY-01 (Stripe Gateway) the nearest vector neighbor. However, similarity falls in the weak band, proving similarity is only proximity, not contract inclusion.',
    expectedReference: 'DEL-PAY-01',
    expectedStatus: RETRIEVAL_STATUS.WEAK_EVIDENCE,
    expectedCategory: RELEVANCE_CATEGORY.WEAK_MATCH,
    minExpectedScore: 0.35,
    traceabilityNotes:
      'Source: Proposal Version 1 Deliverable DEL-PAY-01 and PROP-V1-SCOPE-01 (explicit Web3 exclusion).',
  },
  {
    experimentId: 'exp-05',
    category: 'Insufficient Evidence (Fallback Triggered)',
    query: 'Sync orders to internal enterprise ERP via custom warehouse AS400 connector and VPN tunnel',
    hypothesis:
      'Baseline contains zero architectural documentation on proprietary AS400 warehouse connectors or VPN tunnels. Similarity drops below reliable thresholds, triggering the uncertain-result fallback.',
    expectedReference: null,
    expectedStatus: RETRIEVAL_STATUS.UNCERTAIN,
    expectedCategory: RELEVANCE_CATEGORY.NO_EVIDENCE,
    minExpectedScore: 0.0,
    traceabilityNotes:
      'Zero matching baseline deliverables. Requires client technical discovery session before estimation.',
  },
];

module.exports = {
  RETRIEVAL_EXPERIMENT_CASES,
};
