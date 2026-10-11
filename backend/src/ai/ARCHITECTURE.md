# ScopePilot — AI Agent & RAG Architecture Specification

**Author:** Vishal — AI / RAG / Change-Analysis Agent Lead  
**Review Stage:** Review 1 of 5 (Requirements, Repository Inspection & AI Architecture)  
**Status:** Approved Draft  

---

## 1. Problem Statement & Objective

In freelance and client project workflows, **scope creep** occurs when new requests are accepted without evaluating their divergence from the agreed contract baseline. Clients informally suggest additions ("Can we also add an analytics dashboard?"), and freelancers either absorb unbudgeted work or face disputes later.

**ScopePilot's AI Change-Analysis Agent solves this by:**
1. Comparing new client requests against the approved project scope (`ProposalVersion` + `Deliverable` items).
2. Categorizing request elements into **in-scope**, **out-of-scope**, and **uncertain/missing-evidence** items.
3. Producing an advisory structured draft with cited references and confidence ratings.
4. Keeping the human in the loop: the AI never modifies contracts, accepts changes, or establishes legal or pricing commitments.

---

## 2. Architectural Boundaries & Isolation Principles

All AI, RAG, and agentic workflows are strictly isolated in `backend/src/ai/`:

```
backend/src/
├── ai/
│   ├── ARCHITECTURE.md          # This architectural specification
│   ├── README.md                # AI module directory overview
│   ├── agents/                  # LangChain agent state graphs & runners
│   ├── embeddings/              # Embedding wrappers (Ollama / nomic-embed-text)
│   ├── fixtures/                # Canonical test payloads & sample scopes
│   ├── prompts/                 # Versioned prompt templates & system instructions
│   ├── rag/                     # Vector retrieval, chunking, and similarity search
│   ├── services/                # AI services (including deterministic mock engine)
│   └── tools/                   # Isolated deterministic tools (readScope, compareWork)
├── contracts/
│   ├── index.js                 # Shared contract re-exports
│   └── aiAnalysis.contract.js   # Formal Zod input/output contracts
└── modules/
    ├── changeRequest/           # ChangeRequest business module (M6)
    ├── deliverable/             # Deliverable business module (M5)
    ├── project/                 # Project module (M4)
    └── proposal/                # Proposal & ProposalVersion module (M4)
```

### Safety and Boundary Rules
1. **AI Never Decides Autonomously:** Decisions to approve, reject, or request revisions on change requests are strictly human actions executed via authenticated endpoints (`POST /api/change-requests/:id/decision`).
2. **Deterministic Financial & Schedule Math:** Effort hours, prices, and schedule dates are computed by deterministic services using capacity records; the AI only drafts qualitative scope comparisons and identifies affected deliverables.
3. **Explicit Uncertainty:** When evidence in the approved proposal is missing or ambiguous, the AI explicitly returns `uncertainItems` and sets `reviewStatus` to `needs_clarification` or `uncertain`, rather than hallucinating facts.
4. **Strict Authorization Before Retrieval:** All future vector and proposal lookups enforce session-derived authorization filters (`workspaceId`, `projectId`, `req.user`).

---

## 3. Data Flow Diagram

```
+-----------------------------------------------------------------------------------+
| 1. Client / Freelancer submits new request                                         |
|    POST /api/change-requests (or POST /api/change-agent)                          |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| 2. Backend Service Layer (M4, M5, M6)                                             |
|    - Authenticates session (req.user)                                             |
|    - Retrieves currentApprovedProposal (ProposalVersion.status === 'approved')   |
|    - Retrieves active Deliverables with scopeReference IDs                        |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| 3. AI Module Layer (src/ai/)                                                      |
|    - Validates payload against ChangeAnalysisInputSchema (Zod)                    |
|    - Vector Retrieval / Semantic Comparison against Deliverable & Scope Items     |
|    - Rules & Reasoning Engine (Deterministic Mock -> LangChain Agent)             |
|    - Validates output against ChangeAnalysisOutputSchema (Zod)                   |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| 4. Draft Change Request Created / Updated                                         |
|    - aiAnalysis & scopeComparison embedded in ChangeRequest                       |
|    - Status: 'draft' or 'pending_estimate'                                        |
|    - Reviewed by Freelancer & Client -> Explicit Human Decision                   |
+-----------------------------------------------------------------------------------+
```

---

## 4. Formal Input / Output Contract

The contracts are declared using Zod in [`backend/src/contracts/aiAnalysis.contract.js`](file:///c:/Users/Vishal/Downloads/ScopePilot-main/ScopePilot-main/backend/src/contracts/aiAnalysis.contract.js).

### A. Input Payload (`ChangeAnalysisInputSchema`)
```typescript
interface ChangeAnalysisInput {
  projectId: string;
  approvedProposalVersion: {
    versionNumber: number;
    title: string;
    scopeSummary: string;
    scopeItems: Array<{
      id?: string;
      title: string;
      description?: string;
      estimatedHours?: number;
      price?: number;
    }>;
  };
  deliverables: Array<{
    id: string;
    title: string;
    scopeReference: string;
    description?: string;
    acceptanceCriteria?: string[];
  }>;
  newClientRequest: {
    title: string;
    description: string;
    requestedBy?: string;
    clientNotes?: string;
  };
  options?: {
    similarityThreshold?: number; // default: 0.7
    strictMode?: boolean;         // default: true
  };
}
```

### B. Output Payload (`ChangeAnalysisOutputSchema`)
```typescript
interface ChangeAnalysisOutput {
  summary: string;
  reviewStatus: 'in_scope' | 'out_of_scope' | 'partially_out_of_scope' | 'needs_clarification' | 'uncertain';
  confidenceScore: number; // 0.0 to 1.0
  inScopeItems: Array<{
    item: string;
    matchedDeliverableId?: string;
    matchedScopeReference?: string;
    reason: string;
  }>;
  outOfScopeItems: Array<{
    item: string;
    reason: string;
    potentialImpact?: string;
  }>;
  uncertainItems: Array<{
    item: string;
    question: string;
    missingEvidence: string;
  }>;
  affectedDeliverables: Array<{
    deliverableId: string;
    scopeReference: string;
    title: string;
    impactDescription: string;
  }>;
  evidence: Array<{
    sourceReference: string;
    snippet: string;
    relevanceScore?: number;
  }>;
  recommendations: string[];
  disclaimer: string;
  analyzedAt?: string;
}
```

---

## 5. Backend Integration Points & Model Mapping

| Shared Model / Service | Source Location | Consumed / Populated Fields | Coordination Needed With |
|---|---|---|---|
| `Project` | `src/modules/project/project.model.js` | `currentApprovedProposal`, `freelancer`, `client` | Member 4 |
| `ProposalVersion` | `src/modules/proposal/proposal.model.js` | `scopeSummary`, `scopeItems`, `versionNumber`, `status` | Member 4 |
| `Deliverable` | `src/modules/deliverable/deliverable.model.js` | `scopeReference`, `title`, `description`, `acceptanceCriteria` | Member 5 |
| `ChangeRequest` | `src/modules/changeRequest/changeRequest.model.js` | `aiAnalysis`, `scopeComparison`, `retrievedScopeReferences` | Member 6 |
| `Decision` | `decisionService.record()` | Human sign-off on change request | Member 5, Member 6 |

---

## 6. Verification & Test Evidence

The contract schemas and deterministic mock analysis engine are verified by Jest unit tests in `tests/ai.contracts.test.js`:
- Complete input validation and rejection of malformed payloads.
- Complete output validation and range enforcement (`confidenceScore`, enum statuses).
- Standard multi-feature out-of-scope scenario detection.
- Missing-evidence and ambiguity detection with clarifying questions.
- Accurate deliverable matching for in-scope refinements.
