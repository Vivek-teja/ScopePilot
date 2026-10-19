# REVIEW 1 OF 5
## Requirements, Repository Inspection & AI Architecture
### ScopePilot | Vishal — AI / RAG / Change-Analysis Agent

| Field | Detail |
| :--- | :--- |
| **Review Focus** | Establish the AI module boundaries, understand the existing backend, and agree on the input/output contract before implementing model-based behaviour. |
| **Status** | **Repository inspected:** Yes <br> **Input/output contract:** Agreed (Formally defined with Zod & verified by tests) |
| **Evidence to Attach** | 1. AI Architecture Document: `backend/src/ai/ARCHITECTURE.md`<br>2. Shared Zod Contracts: `backend/src/contracts/aiAnalysis.contract.js`<br>3. Deterministic Mock Engine: `backend/src/ai/services/changeAnalysisMock.service.js`<br>4. Test Suite Output: `backend/tests/ai.contracts.test.js` (4/4 test suites, 13/13 tests passing) |

---

## 1. Objective
ScopePilot prevents **scope creep** by comparing incoming client change requests against the approved project scope before any extra work is accepted or scheduled.

- **AI Module Isolation:** All AI and comparison logic lives strictly under `backend/src/ai/` and `backend/src/contracts/`, adhering to the layered backend architecture. It reuses existing MongoDB Mongoose models (`ProposalVersion`, `Deliverable`, `ChangeRequest`, `Project`) without altering or duplicating them.
- **Predictable Structured Response:** Both backend services and the frontend React application consume a strictly typed and validated Zod contract ensuring predictable structure, explicit uncertainty, and safety disclaimers.

---

## 2. Work Covered in This Review

### Repository Inspection
Inspected the full backend repository structure, root `README.md`, `backend/src/ai/README.md`, and business models:
- **`ProposalVersion` (`backend/src/modules/proposal/proposal.model.js`):**
  Immutable versioned snapshot of scope with fields: `versionNumber`, `title`, `scopeSummary`, `scopeItems: [{ title, description, estimatedHours, price }]`, `status: 'approved' | 'in_review' | 'draft' | 'rejected'`, and `contentHash`.
- **`Deliverable` (`backend/src/modules/deliverable/deliverable.model.js`):**
  Scope baseline units with fields: `title`, `description`, `scopeReference` (unique audit identifier e.g., `DEL-CAT-01`), `status`, and `acceptanceCriteria: [string]`.
- **`ChangeRequest` (`backend/src/modules/changeRequest/changeRequest.model.js`):**
  Identified pre-existing AI extension schemas ready for integration:
  - `aiAnalysis: { summary, confidenceScore, rawOutput, analyzedAt }`
  - `scopeComparison: { outOfScopeItems, inScopeItems, similarityScore }`
  - `retrievedScopeReferences: [string]`
  - Schedule impact & decisions: `scheduleImpact`, `freelancerDecision`, `clientDecision`.

### Input Contract (`ChangeAnalysisInputSchema`)
Proposes validated inputs including:
- `projectId`: Target project identifier.
- `approvedProposalVersion`: Active approved proposal version snapshot with scope items.
- `deliverables`: Array of deliverables with audit `scopeReference` and `acceptanceCriteria`.
- `newClientRequest`: Client request title, description, requestedBy, and optional client notes.
- `options`: Configurable parameters (e.g. `similarityThreshold`, `strictMode`).

### Output Contract (`ChangeAnalysisOutputSchema`)
Proposes structured fields consumable across backend and frontend:
- `summary`: Human-readable evaluation summary.
- `reviewStatus`: Classification enum (`in_scope`, `out_of_scope`, `partially_out_of_scope`, `needs_clarification`, `uncertain`).
- `confidenceScore`: Range 0.0 to 1.0.
- `inScopeItems`: Overlapping items mapped to `matchedDeliverableId` and `matchedScopeReference`.
- `outOfScopeItems`: Uncovered additions with reasons and potential system impacts.
- `uncertainItems`: Ambiguous items with specific clarifying questions and missing evidence notes.
- `affectedDeliverables`: Existing deliverables requiring regression testing or updates.
- `evidence`: Quoted snippets and source references.
- `recommendations`: Actionable next steps for freelancer/client review.
- `disclaimer`: Explicit safety notice stating the output is an advisory draft.

### Safety Boundary
- **Draft Only:** AI output is strictly advisory. Final acceptance or rejection of changes rests solely with the authorized human client and freelancer.
- **No Hallucinated Financials/Dates:** The AI does not fabricate pricing or timeline commitments. Cost and schedule adjustments must be calculated through deterministic capacity formulas and freelancer pricing input.

---

## 3. Demonstration / Proof of Progress

### AI Module Location & Architecture Flow

```
backend/src/
├── ai/
│   ├── ARCHITECTURE.md          # Complete AI architectural specification
│   ├── README.md                # AI guidelines and layout
│   ├── contracts/               # Shared contracts (aiAnalysis.contract.js)
│   ├── fixtures/                # Canonical test payloads (changeAnalysisFixtures.js)
│   ├── services/                # Deterministic rule-based mock engine
│   ├── rag/                     # (Future) Chunking and Atlas Vector search
│   ├── embeddings/              # (Future) Ollama nomic-embed-text wrapper
│   ├── agents/                  # (Future) LangChain agent definitions
│   └── tools/                   # (Future) Deterministic agent tools
```

#### Architecture Flow Diagram

```
+-------------------------------------------------------------+
| 1. Client / Freelancer Submits Request                      |
|    POST /api/change-requests                                |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 2. Backend Service (ChangeRequestService / Member 6)        |
|    - Authenticates user session                             |
|    - Fetches approved ProposalVersion & Deliverables        |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 3. AI Analysis Module (src/ai/ & src/contracts/)            |
|    - Validates Input Contract (ChangeAnalysisInputSchema)   |
|    - Compares Request vs. Scope References & Deliverables   |
|    - Deterministic Mock Engine -> LangChain Agent           |
|    - Validates Output Contract (ChangeAnalysisOutputSchema) |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 4. Draft Change Request Storage & Decision                  |
|    - Populates aiAnalysis & scopeComparison in MongoDB      |
|    - Status: 'draft' / 'pending_estimate'                   |
|    - Human Review & Formal Decision (POST /decision)        |
+-------------------------------------------------------------+
```

### Sample Request Payload

```json
{
  "projectId": "proj_ecommerce_99",
  "approvedProposalVersion": {
    "versionNumber": 1,
    "title": "E-Commerce MVP Scope",
    "scopeSummary": "Standard e-commerce store with product catalog, cart, and Stripe checkout.",
    "scopeItems": [
      {
        "id": "si_2",
        "title": "Product Catalog & Search",
        "description": "Product listing with pagination, search, category filters, and product details."
      },
      {
        "id": "si_3",
        "title": "Shopping Cart & Checkout",
        "description": "Cart state management, order creation, and Stripe checkout integration."
      }
    ]
  },
  "deliverables": [
    {
      "id": "del_cat_01",
      "title": "Product Catalog and Search UI",
      "scopeReference": "DEL-CAT-01",
      "description": "React product catalog grid with keyword search and filtering.",
      "acceptanceCriteria": ["Filter products by category", "Search products by title"]
    },
    {
      "id": "del_chk_01",
      "title": "Checkout Flow and Payment Processing",
      "scopeReference": "DEL-CHK-01",
      "description": "Order submission, Stripe payment intent creation, and receipt confirmation.",
      "acceptanceCriteria": ["Users can purchase items via Stripe"]
    }
  ],
  "newClientRequest": {
    "title": "Customer Analytics Dashboard with PDF Export",
    "description": "We would like to add an admin dashboard to visualize customer purchase history and sales analytics, plus export reports to PDF.",
    "requestedBy": "client_usr_42",
    "clientNotes": "Targeting release alongside checkout flow."
  }
}
```

### Sample Structured Response Payload

```json
{
  "summary": "The requested change introduces new features outside the approved proposal scope.",
  "reviewStatus": "out_of_scope",
  "confidenceScore": 0.9,
  "inScopeItems": [],
  "outOfScopeItems": [
    {
      "item": "Analytics & Reporting Module",
      "reason": "Requested capability \"analytics\" was not specified in approved proposal scope or deliverables.",
      "potentialImpact": "Requires additional backend schema, API endpoints, and UI components."
    },
    {
      "item": "Custom Metrics Dashboard",
      "reason": "Requested capability \"dashboard\" was not specified in approved proposal scope or deliverables.",
      "potentialImpact": "Requires additional backend schema, API endpoints, and UI components."
    },
    {
      "item": "Data Export / PDF Generation",
      "reason": "Requested capability \"export\" was not specified in approved proposal scope or deliverables.",
      "potentialImpact": "Requires additional backend schema, API endpoints, and UI components."
    }
  ],
  "uncertainItems": [],
  "affectedDeliverables": [],
  "evidence": [],
  "recommendations": [
    "Freelancer should draft an effort estimate and price adjustment for out-of-scope items.",
    "Client must formally approve the change request before work begins."
  ],
  "disclaimer": "AI analysis is an advisory draft only. Approval or rejection of changes must be finalized by authorized project participants. Cost and schedule adjustments require explicit deterministic calculation.",
  "analyzedAt": "2026-10-11T15:51:45.000Z"
}
```

### Expected Backend Interfaces & Teammate Coordination
1. **Member 4 (Project & Proposal):**
   - Expected Interface: `Proposal.activeVersion` -> `ProposalVersion` populated with `scopeItems` and `scopeSummary`.
   - Agreement: Only versions with `status === 'approved'` can serve as the scope baseline for AI comparison.
2. **Member 5 (Milestones & Deliverables):**
   - Expected Interface: `Deliverable.find({ project: projectId })` exposing `scopeReference` and `acceptanceCriteria`.
3. **Member 6 (Change Request Engine):**
   - Expected Interface: `ChangeRequest.aiAnalysis`, `ChangeRequest.scopeComparison`, and `ChangeRequest.retrievedScopeReferences`.
   - Agreement: AI outputs draft fields into `ChangeRequest`; Member 6's deterministic calculator sets `effortEstimate` and `scheduleImpact`.
4. **Member 7 & 8 (Document Ingestion & RAG):**
   - Retrieval queries must include session-derived `{ workspaceId, projectId, status: 'ready' }` filters to guarantee strict authorization.

---

## 4. Expected Review Deliverables
- **AI Architecture Note:** Documented at `backend/src/ai/ARCHITECTURE.md` and summarized in `backend/src/ai/README.md`.
- **Draft JSON Input/Output Contract:** Declared via Zod schemas at `backend/src/contracts/aiAnalysis.contract.js` and re-exported at `backend/src/contracts/index.js`.
- **Dependencies, Assumptions, and Integration Points:** Explicitly mapped across `ProposalVersion`, `Deliverable`, `ChangeRequest`, and `decisionService`.

---

## 5. Challenges and Safeguards
- **Zero Module Duplication:** No duplicate project or change request logic. AI is an isolated analysis service invoked by `changeRequest.service.js` or `POST /api/change-agent`.
- **Preserve Human Authority:** Neither the AI nor deterministic services can transition a change request to `approved` or `rejected` without an authenticated human action (`POST /api/change-requests/:id/decision`).
- **Explicit Uncertainty Safeguard:** When incoming requests are vague (e.g. "make the app faster"), the engine returns `reviewStatus: 'needs_clarification'` with specific clarifying questions and missing-evidence flags rather than guessing.

---

## 6. Next Steps
1. Implemented a deterministic rule-based mock engine (`backend/src/ai/services/changeAnalysisMock.service.js`) adhering 100% to the agreed contract.
2. Prepared canonical fixture cases (`backend/src/ai/fixtures/changeAnalysisFixtures.js`) covering in-scope refinements, multi-feature out-of-scope additions, and ambiguous requests.
3. Verified via Jest test suite (`backend/tests/ai.contracts.test.js`) with 13/13 passing tests.
4. Next Phase (Review 2): Ingest approved proposal documents, set up vector embeddings, and implement semantic retrieval.

---

## 7. Questions to Prepare For

| Likely Question | Answer |
| :--- | :--- |
| **Why start with a contract?** | Defining the Zod input and output schema first guarantees frontend and backend alignment, enables deterministic mock testing, and prevents contract drift before model integration complexity is introduced. |
| **Can the AI approve a change?** | No. The AI produces an advisory draft analysis. Final approval or rejection strictly requires an explicit decision from the authenticated client and freelancer. |
| **What should happen when scope evidence is missing?** | The AI flags the items under `uncertainItems`, sets `reviewStatus` to `needs_clarification` or `uncertain`, and provides specific clarifying questions rather than inventing assumptions. |

---

## 8. Test Execution Evidence

```
> scopepilot-backend@1.0.0 test
> jest --detectOpenHandles --runInBand

PASS tests/ai.contracts.test.js
  AI Change Analysis Contract & Mock Service
    Input Contract Schema Validation
      ✓ should successfully validate a complete, well-formed input payload (3 ms)
      ✓ should reject payload with missing projectId (9 ms)
      ✓ should reject payload with empty deliverables array (1 ms)
      ✓ should reject payload with missing client request title or description (1 ms)
    Output Contract Schema Validation
      ✓ should successfully validate a conformant analysis output object (1 ms)
      ✓ should reject confidence score out of bounds (> 1.0 or < 0.0) (1 ms)
      ✓ should reject invalid reviewStatus enum value (1 ms)
    Deterministic Mock Analysis Engine
      ✓ should classify analytics dashboard as partially out of scope with detected extra capabilities (2 ms)
      ✓ should handle ambiguous client requests by generating explicit uncertain items and questions (2 ms)
      ✓ should correctly match in-scope requests referencing existing deliverables (1 ms)
PASS tests/validation.test.js
PASS tests/health.test.js
PASS tests/notFound.test.js

Test Suites: 4 passed, 4 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        1.573 s
Ran all test suites.
```
