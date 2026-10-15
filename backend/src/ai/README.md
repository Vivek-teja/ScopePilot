# ScopePilot — Future AI & RAG Architecture

This directory is reserved for future AI, RAG (Retrieval-Augmented Generation), and Agentic capabilities in ScopePilot.

> [!IMPORTANT]
> The current backend foundation is designed to allow these AI components to be added seamlessly **without restructuring** any existing models, services, or routes.

---

## Planned AI Functionality

1. **Scope RAG (Retrieval-Augmented Generation)**
   - Ingest approved proposal versions and deliverables into chunked vector documents.
   - Perform semantic search against approved project scope to resolve project ambiguities.

2. **Semantic Request Comparison**
   - Compare incoming client change requests against the approved project scope deliverables (`Deliverable.scopeReference`).
   - Quantify scope divergence, identify out-of-scope tasks, and compute similarity scores.

3. **MongoDB Atlas Vector Search**
   - Store 768-dimensional (or configured) vector embeddings directly in MongoDB collections (e.g., `Chunk` / `DocumentVersion`).
   - Execute similarity vector search queries filtered by workspace and project membership server-side.

4. **Local & Cloud LLMs (Ollama / LangChain JS)**
   - Utilize server-side Ollama instances for embeddings (`nomic-embed-text`) and chat reasoning models (e.g. `llama3.2`).
   - LangChain JS orchestration for prompts, chains, tools, and multi-step agents.

5. **Change-Analysis Agent**
   - Autonomous agent that analyzes change requests, queries scope references, checks developer capacity/estimates, and drafts complete change request impact summaries for freelancer review.

---

## Planned Folder Layout & Implemented Foundation

```
src/ai/
├── ARCHITECTURE.md          # Comprehensive AI architecture, boundaries, and contracts (Review 1)
├── README.md                # AI architecture overview & guidelines
├── contracts/               # Shared contracts (exported via src/contracts/aiAnalysis.contract.js)
├── fixtures/                # Canonical test payloads & sample scopes (changeAnalysisFixtures.js)
├── services/                # Deterministic rule-based mock engine (changeAnalysisMock.service.js)
├── rag/                     # Vector retrieval, chunking, and document indexing pipelines
├── embeddings/              # Ollama / embedding model integration wrappers
├── agents/                  # LangChain agent definitions and state graphs
├── tools/                   # Deterministic tools callable by agents (e.g. fetchProposalScope, checkCapacity)
└── prompts/                 # Versioned prompt templates and system instructions
```

> **Review 1 Milestone Completed**: Formal Zod input/output contract established at `src/contracts/aiAnalysis.contract.js`, deterministic mock engine at `src/ai/services/changeAnalysisMock.service.js`, and test suite passing at `tests/ai.contracts.test.js`.
> **Review 2 Milestone Completed**: Five canonical mock cases established (`src/ai/fixtures/changeAnalysisFixtures.js`), runnable mock CLI demonstration (`npm run mock:cases`), and HTTP endpoints mounted under `/api/ai/*` verified by Jest (`tests/ai.mockCases.test.js` & `tests/ai.routes.test.js`).

---

## Review 2: Rule-Based Mock & 5 Canonical Test Cases

Review 2 proves the request/response contract with deterministic, reproducible behavior across 5 required case categories before introducing non-deterministic LLMs or embeddings:

| Case ID | Category | Request Summary | Expected Status | Confidence |
|---|---|---|---|---|
| `case-1` | **Clearly In Scope** | Checkout phone validation (E.164) matching `DEL-CHK-01` | `in_scope` | 95% |
| `case-2` | **Clearly Out of Scope** | Web3 / Cryptocurrency wallet payment gateway | `out_of_scope` | 92% |
| `case-3` | **Partial Overlap** | Product catalog bulk CSV import & supplier sync | `partially_out_of_scope` | 88% |
| `case-4` | **Ambiguous Request** | "Make app significantly faster & enhance look" | `needs_clarification` | 60% |
| `case-5` | **Insufficient Evidence** | Sync orders to on-premise SAP ERP via proprietary VPN | `uncertain` | 45% |

---

## Test & Execution Instructions

### 1. Run All Jest Test Suites
Execute all unit and integration tests (contracts, 5 cases, and HTTP endpoints):
```bash
npm test
```

### 2. Run the Deterministic CLI Demonstration Script
Execute the 5-case evaluation runner, check output against Zod schemas, and view the formatted summary table:
```bash
npm run mock:cases
# or directly:
node src/ai/scripts/runMockCases.js
```

### 3. Test Via HTTP API Endpoints
Start the development server:
```bash
npm run dev
```

- **List All Cases:** `GET /api/ai/cases`
- **Run Specific Case:** `GET /api/ai/cases/case-1/run` (or `case-2`, `case-3`, `case-4`, `case-5`)
- **Run All Cases Summary:** `GET /api/ai/cases/run-all`
- **Custom Dynamic Analysis:** `POST /api/ai/analyze-mock` with JSON matching `ChangeAnalysisInputSchema`.

---

## Active & Planned Endpoints

- `POST /api/ai/analyze-mock` — **(Active - Review 2)** Run rule-based mock analysis against arbitrary scope payload.
- `GET /api/ai/cases` — **(Active - Review 2)** List canonical test cases.
- `GET /api/ai/cases/:caseId/run` — **(Active - Review 2)** Execute specific canonical test case.
- `GET /api/ai/cases/run-all` — **(Active - Review 2)** Batch execute all 5 cases.
- `POST /api/scope-chat` — *(Review 3 / Planned)* RAG-powered Q&A on approved project scopes with exact chunk citations.
- `POST /api/change-agent` — *(Review 4 / Planned)* Run multi-step LangChain agent for change impact estimation.

---

## Architecture Rules for AI Developers

- **AI Never Decides Directly**: Final decisions on prices, milestone approvals, and change acceptance are always deterministic code triggered by authenticated human users.
- **Layering & Isolation**: All LLM and vector search logic lives under `src/ai/` and services, never directly in controllers or route handlers.
- **Strict Authorization**: Vector retrieval queries must always include workspace/project permission filters derived from the authenticated session (`req.user`).
