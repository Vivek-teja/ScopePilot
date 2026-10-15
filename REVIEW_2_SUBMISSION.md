# REVIEW 2 OF 5
## Rule-Based Mock & Structured Output
### ScopePilot | Vishal — AI / RAG / Change-Analysis Agent

| Field | Detail |
| :--- | :--- |
| **Review Focus** | Prove the request/response contract with predictable behaviour before adding embeddings or an LLM. |
| **Status** | **Mock runnable:** **Yes** <br> **Five cases prepared:** **Yes** (100% deterministic, passing all 29 tests) |
| **Evidence to Attach** | 1. Deterministic Mock Service: `backend/src/ai/services/changeAnalysisMock.service.js`<br>2. Five Canonical Test Fixtures: `backend/src/ai/fixtures/changeAnalysisFixtures.js`<br>3. Standalone CLI Demonstration: `backend/src/ai/scripts/runMockCases.js` (`npm run mock:cases`)<br>4. HTTP Mock API Endpoints: `backend/src/ai/ai.routes.js` (`POST /api/ai/analyze-mock`, `GET /api/ai/cases`)<br>5. Jest Test Suite: `backend/tests/ai.mockCases.test.js` & `backend/tests/ai.routes.test.js` (6/6 suites, 29/29 tests passing) |

---

## 1. Objective

Before introducing probabilistic machine learning models, vector embeddings, or multi-step agent graphs, the AI contract and system data flow must be proven deterministically:
1. **Predictable Request/Response Cycle:** Create a small, reproducible mock engine that takes approved project scope data (`ProposalVersion`, `Deliverable`) and an incoming client request and returns a structured analysis payload adhering to the agreed Zod contract.
2. **Exercise 5 Canonical Case Categories:** Ensure the mock handles all 5 essential real-world freelance scope scenarios:
   - **Case 1: Clearly In Scope** (`in_scope`)
   - **Case 2: Clearly Out of Scope** (`out_of_scope`)
   - **Case 3: Partial Overlap** (`partially_out_of_scope`)
   - **Case 4: Ambiguous Request** (`needs_clarification`)
   - **Case 5: Insufficient Evidence** (`uncertain`)
3. **Prevent False Certainty:** Vague or undocumented requests must explicitly report uncertainty and generate targeted clarifying questions rather than guessing or outputting unjustified high confidence scores.

---

## 2. Work Covered in This Review

### A. Mock Workflow & Architecture
The mock engine (`ChangeAnalysisMockService`) is isolated under `backend/src/ai/services/changeAnalysisMock.service.js`. It enforces:
1. **Strict Input Validation:** Every incoming payload is validated against `ChangeAnalysisInputSchema` using Zod. Incomplete payloads or missing deliverable identifiers are rejected upfront with HTTP 400.
2. **Deterministic Heuristic Evaluation:**
   - Normalizes text and matches domain keywords against approved deliverable titles and acceptance criteria.
   - Detects completely unbudgeted feature domains (Web3, Cryptocurrency, smart contracts).
   - Detects partial overlaps where an existing deliverable (e.g. Catalog UI) is touched alongside major unbudgeted additions (e.g. bulk CSV ingestion, background supplier sync).
   - Detects ambiguous, subjective terms lacking quantitative criteria (`faster`, `enhance`, `premium`, `optimize`).
   - Detects external unreferenced systems (`on-premise ERP`, `SAP`, `proprietary connector`, `custom VPN`) that have zero documentation in the approved scope.
3. **Strict Output Validation:** The output is validated against `ChangeAnalysisOutputSchema` before returning to the caller.

### B. Structured Response Shape
Every evaluation returns a consistent, predictable JSON object:
- `summary`: Concise natural language explanation of scope baseline alignment.
- `reviewStatus`: Standardized enum (`in_scope`, `out_of_scope`, `partially_out_of_scope`, `needs_clarification`, `uncertain`).
- `confidenceScore`: Mathematically bounded float (0.0 to 1.0).
- `inScopeItems`: Array of matched items linked to `matchedDeliverableId` and `matchedScopeReference`.
- `outOfScopeItems`: Array of unbudgeted items with explicit rationale and `potentialImpact`.
- `uncertainItems`: Array of ambiguous items with targeted `question` and `missingEvidence` notes.
- `affectedDeliverables`: Array of deliverables requiring regression testing or schema updates.
- `evidence`: Quoted snippets and scope citations.
- `recommendations`: Concrete action items for freelancer and client review.
- `disclaimer`: Mandatory advisory disclaimer preserving human decision authority.
- `analyzedAt`: ISO timestamp.

### C. Sample Coverage (The 5 Canonical Cases)
Curated in `backend/src/ai/fixtures/changeAnalysisFixtures.js`:

| Case | Key / Category | Request Description | Outcome | Confidence |
| :--- | :--- | :--- | :--- | :--- |
| **Case 1** | `clearly_in_scope` | "Checkout phone number validation" — validates E.164 phone formatting. | `in_scope` | 95% |
| **Case 2** | `clearly_out_of_scope` | "Cryptocurrency Wallet Integration & Web3 Token Settlement" — MetaMask/Solana. | `out_of_scope` | 92% |
| **Case 3** | `partial_overlap` | "Catalog CSV Bulk Import & Supplier Sync" — touches Catalog UI but adds bulk ingest. | `partially_out_of_scope` | 88% |
| **Case 4** | `ambiguous_request` | "Make store experience significantly faster and enhance overall UI". | `needs_clarification` | 60% |
| **Case 5** | `insufficient_evidence` | "Sync orders to internal enterprise ERP via custom warehouse connector". | `uncertain` | 45% |

### D. Validation Plan
- Implemented using **Zod** (`backend/src/contracts/aiAnalysis.contract.js`).
- Reusable Express middleware `validate({ body: ChangeAnalysisInputSchema })` guards the `/api/ai/analyze-mock` route, rejecting malformed requests before any service logic executes.

---

## 3. Demonstration & Proof of Progress

### Execution Proof: CLI Demonstration (`npm run mock:cases`)

Executing `npm run mock:cases` runs all 5 canonical cases, validates them against Zod, checks reproducibility across runs, and outputs the summary table:

```
================================================================================
 ScopePilot AI — Review 2: Rule-Based Mock & Structured Output
 Demonstrating 5 Canonical Change-Analysis Case Outcomes
================================================================================

>>> RUNNING CASE 1: CLEARLY IN SCOPE [Clearly In Scope]
    Request Title: "Checkout phone number validation"
    Rationale:     The requested phone validation refines existing checkout processing without adding new unbudgeted modules.
--------------------------------------------------------------------------------
OUTPUT PAYLOAD (Validated JSON):
{
  "summary": "The requested change is fully aligned with existing deliverables in the approved proposal baseline.",
  "reviewStatus": "in_scope",
  "confidenceScore": 0.95,
  "inScopeItems": [
    {
      "item": "Checkout Flow and Payment Processing",
      "matchedDeliverableId": "del_chk_01",
      "matchedScopeReference": "DEL-CHK-01",
      "reason": "Request references functionality covered under approved deliverable \"Checkout Flow and Payment Processing\"."
    }
  ],
  "outOfScopeItems": [],
  "uncertainItems": [],
  "affectedDeliverables": [
    {
      "deliverableId": "del_chk_01",
      "scopeReference": "DEL-CHK-01",
      "title": "Checkout Flow and Payment Processing",
      "impactDescription": "May require code refinement, schema adjustments, or regression testing alongside \"Checkout Flow and Payment Processing\"."
    }
  ],
  "evidence": [
    {
      "sourceReference": "DEL-CHK-01",
      "snippet": "Order submission, Stripe payment intent creation, and receipt confirmation.",
      "relevanceScore": 0.88
    }
  ],
  "recommendations": [
    "Implement phone formatting refinement within the current checkout flow milestone allocation.",
    "Verify regression tests on existing Stripe checkout integration pass."
  ],
  "disclaimer": "AI analysis is an advisory draft only. Approval or rejection of changes must be finalized by authorized project participants. Cost and schedule adjustments require explicit deterministic calculation.",
  "analyzedAt": "2026-10-15T16:34:04.359Z"
}
Duration: 2ms | Deterministic: PASS
================================================================================

SUMMARY TABLE: 5 CANONICAL CASE EVALUATION
================================================================================
┌─────────┬──────────┬─────────────────────────┬───────────────────────────────────────────┬──────────────────────────┬────────────┬─────────┬────────────┬───────────┬───────────────┐
│ (index) │ caseId   │ category                │ requestTitle                              │ reviewStatus             │ confidence │ inScope │ outOfScope │ uncertain │ deterministic │
├─────────┼──────────┼─────────────────────────┼───────────────────────────────────────────┼──────────────────────────┼────────────┼─────────┼────────────┼───────────┼───────────────┤
│ 0       │ 'case-1' │ 'Clearly In Scope'      │ 'Checkout phone number validation...'     │ 'in_scope'               │ '95%'      │ 1       │ 0          │ 0         │ 'YES'         │
│ 1       │ 'case-2' │ 'Clearly Out of Scope'  │ 'Cryptocurrency Wallet Integration & ...' │ 'out_of_scope'           │ '92%'      │ 0       │ 7          │ 0         │ 'YES'         │
│ 2       │ 'case-3' │ 'Partial Overlap'       │ 'Product Catalog CSV Bulk Import and ...' │ 'partially_out_of_scope' │ '88%'      │ 1       │ 4          │ 0         │ 'YES'         │
│ 3       │ 'case-4' │ 'Ambiguous Request'     │ 'Make store experience significantly ...' │ 'needs_clarification'    │ '60%'      │ 0       │ 0          │ 1         │ 'YES'         │
│ 4       │ 'case-5' │ 'Insufficient Evidence' │ 'Sync orders to internal enterprise E...' │ 'uncertain'              │ '45%'      │ 0       │ 1          │ 6         │ 'YES'         │
└─────────┴──────────┴─────────────────────────┴───────────────────────────────────────────┴──────────────────────────┴────────────┴─────────┴────────────┴───────────┴───────────────┘
================================================================================
All 5 cases successfully validated against Zod schema and verified deterministic.
Review 2 demonstration completed.
```

### Demonstration of Different Classifications

#### Case 2: Clearly Out of Scope Payload Output
```json
{
  "summary": "The requested change introduces new capabilities that are entirely outside the approved proposal scope.",
  "reviewStatus": "out_of_scope",
  "confidenceScore": 0.92,
  "inScopeItems": [],
  "outOfScopeItems": [
    {
      "item": "Cryptocurrency Wallet Integration",
      "reason": "Requested capability \"crypto\" was not included in approved proposal scope or deliverables.",
      "potentialImpact": "Requires Web3 libraries, RPC node providers, and security smart contract audit."
    },
    {
      "item": "Solana Network Settlement",
      "reason": "Requested capability \"solana\" was not included in approved proposal scope or deliverables.",
      "potentialImpact": "Requires Solana transaction signing."
    }
  ],
  "uncertainItems": [],
  "affectedDeliverables": [],
  "recommendations": [
    "Freelancer must formulate a formal change request with explicit effort estimate and price adjustment.",
    "Client must formally review and accept the change request before architectural work begins."
  ],
  "disclaimer": "AI analysis is an advisory draft only..."
}
```

#### Case 3: Partial Overlap Payload Output
```json
{
  "summary": "The request touches approved deliverables (Product Catalog and Search UI) but introduces substantial new out-of-scope features.",
  "reviewStatus": "partially_out_of_scope",
  "confidenceScore": 0.88,
  "inScopeItems": [
    {
      "item": "Product Catalog and Search UI",
      "matchedDeliverableId": "del_cat_01",
      "matchedScopeReference": "DEL-CAT-01",
      "reason": "Request references functionality covered under approved deliverable \"Product Catalog and Search UI\"."
    }
  ],
  "outOfScopeItems": [
    {
      "item": "CSV Bulk Ingestion Engine",
      "reason": "Requested capability \"csv\" was not included in approved proposal scope or deliverables.",
      "potentialImpact": "Requires streaming CSV parser, validation pipeline, and batch database inserts."
    },
    {
      "item": "Automated Supplier Inventory Sync",
      "reason": "Requested capability \"sync\" was not included in approved proposal scope or deliverables.",
      "potentialImpact": "Requires background cron job, external supplier API adapter, and error retry queue."
    }
  ],
  "affectedDeliverables": [
    {
      "deliverableId": "del_cat_01",
      "scopeReference": "DEL-CAT-01",
      "title": "Product Catalog and Search UI",
      "impactDescription": "May require code refinement, schema adjustments, or regression testing alongside \"Product Catalog and Search UI\"."
    }
  ]
}
```

#### Case 4: Ambiguous Request Output (Refuses False Certainty)
```json
{
  "summary": "The request contains ambiguous or subjective language without measurable acceptance criteria.",
  "reviewStatus": "needs_clarification",
  "confidenceScore": 0.60,
  "uncertainItems": [
    {
      "item": "Make store experience significantly faster and enhance overall UI",
      "question": "What specific measurable acceptance criteria (e.g., target page load time < 1.5s, Core Web Vitals, or Figma design mockups) define this request?",
      "missingEvidence": "The approved proposal specifies functional deliverables but contains no contractual latency thresholds or subjective styling guidelines."
    }
  ],
  "recommendations": [
    "Request quantitative acceptance criteria and clarification (e.g. latency metrics, target devices, Figma designs) from the client.",
    "Do not commit to effort hours until ambiguous requirements are clarified."
  ]
}
```

#### Case 5: Insufficient Evidence Output (Explicit Uncertainty)
```json
{
  "summary": "Insufficient evidence in the approved proposal to determine feasibility or baseline alignment for requested external integrations.",
  "reviewStatus": "uncertain",
  "confidenceScore": 0.45,
  "uncertainItems": [
    {
      "item": "On-premise SAP ERP Integration",
      "question": "Can the client provide technical specifications, API schemas, sandbox credentials, and network requirements for the sap integration?",
      "missingEvidence": "The approved proposal scope and deliverables contain zero architecture documentation or interface specifications for \"sap\"."
    }
  ],
  "evidence": [],
  "recommendations": [
    "Request architectural specifications, API documentation, and security protocols from client engineering.",
    "Schedule a technical discovery session before providing any cost or timeline estimates.",
    "Do not assume compatibility with on-premise systems without verified API documentation."
  ]
}
```

---

## 4. Expected Review Deliverables Checklist

- [x] **Small rule-based mock prototype:** Implemented in `backend/src/ai/services/changeAnalysisMock.service.js`.
- [x] **Sample cases for all five required categories:** Configured in `backend/src/ai/fixtures/changeAnalysisFixtures.js`.
- [x] **Proposed response schema and sample request/response:** Declared with Zod in `backend/src/contracts/aiAnalysis.contract.js`.
- [x] **Basic test instructions in the AI module README:** Documented in `backend/src/ai/README.md`.
- [x] **HTTP API mock endpoints:** Mounted in `backend/src/ai/ai.routes.js` and `backend/src/routes.js`.
- [x] **Automated test coverage:** All 29 unit and route integration tests passing in Jest.

---

## 5. Challenges and Safeguards

1. **Clarifying Prototype Boundaries:** The rule-based mock is not semantic AI; it serves as a contract and workflow prototype ensuring that frontend consumers, backend services, and teammates have a stable target before model integration.
2. **Eliminating Unjustified Confidence:** When requests lack measurable specifications (Case 4) or depend on undocumented enterprise systems (Case 5), the engine drops confidence to 45%–60% and returns explicit `uncertainItems` with targeted questions rather than generating a confident approval or estimate.
3. **Reproducibility Guarantee:** Because all logic is rule-based and deterministic, consecutive runs with identical inputs produce bit-for-bit identical classifications and confidence scores.

---

## 6. Next Steps (Review 3 Target)

1. Introduce text extraction and semantic chunking for approved proposal PDFs/TXTs in `backend/src/ai/rag/`.
2. Wrap local embedding models (`nomic-embed-text`, 768 dimensions) under `backend/src/ai/embeddings/`.
3. Compare natural-language requests against approved-scope passages using vector similarity search, recording both successful semantic matches and retrieval failure cases.

---

## 7. Questions to Prepare For

| Likely Question | Suggested Answer |
| :--- | :--- |
| **Why not use an LLM immediately?** | A rule-based mock helps the team confirm the contract, test edge cases, and establish predictable baseline behavior without adding model latency, costs, or non-deterministic variance. |
| **What is partial overlap?** | Part of the request is covered by existing project deliverables (e.g. Product Catalog UI), while other parts introduce substantial new work (e.g. bulk CSV processing or background sync) that require extra pricing and scheduling. |
| **What does the mock prove?** | It proves the end-to-end data pipeline, Zod schema validation, case handling across 5 distinct outcomes, and client response structure before semantic AI is added. |

---

## 8. Test Execution Evidence

```
> scopepilot-backend@1.0.0 test
> jest --detectOpenHandles --runInBand

PASS tests/ai.routes.test.js
PASS tests/validation.test.js
PASS tests/ai.mockCases.test.js
PASS tests/health.test.js
PASS tests/notFound.test.js
PASS tests/ai.contracts.test.js

Test Suites: 6 passed, 6 total
Tests:       29 passed, 29 total
Snapshots:   0 total
Time:        1.764 s
Ran all test suites.
```
