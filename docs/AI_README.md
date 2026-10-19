# ScopePilot — AI Agent & RAG Subsystem Handbook
**Role:** Vishal | AI / RAG / Change-Analysis Agent  
**Module:** Bounded Grounded Change-Analysis Agent & Semantic Scope Retrieval  
**Reviews Covered:** Review 1 (Architecture & Contracts), Review 2 (Rule-Based Mock Engine), Review 3 (Dense Vector Embeddings & Approved-Scope Retrieval), Review 4 (Ollama, Multi-Provider & Grounded Comparison Prototype), Review 5 (Integration, Evaluation & Handover)

---

## 1. Executive Summary & Objective

The ScopePilot AI Subsystem assists freelance software engineers and agency teams during client change-request negotiations. When a client submits a new feature request or alteration, the AI agent performs **evidence-grounded scope analysis** by retrieving approved baseline passages from the project proposal and deliverable definitions.

### Non-Negotiable Contractual Safeguards
1. **Advisory Draft Authority**: The AI agent creates a structured *draft recommendation* for human review. It possesses **zero authority** to approve or reject change requests. Final contractual decisions remain strictly with authorized human participants.
2. **Deterministic Effort & Billing Calculation**: The model is **strictly prohibited** from hallucinating or guessing hourly estimates, price tags, or deadlines. Any numeric impact is computed via an explicit formula tool (`effortCalculator.tool.js`) using stored project rates and agreed complexity metrics.
3. **Traceable Citations**: Every scope finding is tied to an explicit source reference (`DEL-CHK-01`, `DEL-CAT-01`, `PROP-V1-SCOPE-01`).
4. **Explicit Uncertainty Fallback**: When evidence is missing, similarity is low (< 0.35), or request wording is ambiguous, the system suppresses false confidence, returns `reviewStatus: 'uncertain'` or `'needs_clarification'`, and provides targeted client clarifying questions.

---

## 2. Architecture & Bounded Workflow

```
[ New Client Change Request ] + [ Approved Proposal Version & Deliverables ]
                            │
                            ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ STEP 1 & 2: Dense Semantic Scope Retrieval (RAG)                      │
 │ - 1024-dim Float32Array dense vector embedding                        │
 │ - Subword character n-grams (3-5) + domain synonym cluster expansion   │
 │ - Cosine similarity ranking against approved deliverables corpus       │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼ Top Ranked Evidence (Passages + Scores)
 ┌────────────────────────────────────────────────────────────────────────┐
 │ STEP 3: Model Interface & Grounded Scope Comparison                    │
 │ - Abstracts Local Engine, Ollama daemon, and Cloud Free APIs          │
 │ - Validates request against retrieved passages                         │
 │ - Categorizes: in_scope, out_of_scope, partially_out_of_scope,        │
 │   needs_clarification, or uncertain                                    │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼ Grounded Findings
 ┌────────────────────────────────────────────────────────────────────────┐
 │ STEP 4: Deterministic Effort & Schedule Tool Calculation               │
 │ - in_scope: 0h ($0), non-billable                                      │
 │ - out_of_scope / partial: Base hours * item multiplier + 15% QA        │
 │ - uncertain / clarify: Suppressed (null) — discovery required         │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ STEP 5: Zod Contract Validation & Advisory Draft Assembly              │
 │ - Strict adherence to GroundedAgentOutputSchema                        │
 │ - Injects non-negotiable Human Review Draft Notice                     │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Environment Configuration & Setup

All secrets and external keys are optional. ScopePilot includes a **zero-dependency built-in local engine** as the default, guaranteeing 100% test reliability even without internet or running background daemons.

Configure `.env` in `backend/`:
```env
# AI Agent Provider Mode: 'local' (default) | 'ollama' | 'gemini' | 'groq'
AI_PROVIDER=local

# Local Ollama Daemon (Optional - Review 4)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBED_MODEL=nomic-embed-text

# Free Tier Cloud Providers (Optional)
# Google Gemini Free API (1500 RPD free at: https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Groq Cloud Free API (Free LPU inference at: https://console.groq.com/keys)
GROQ_API_KEY=your_groq_api_key_here

# Stored Rate Fallback
DEFAULT_HOURLY_RATE=100
```

---

## 4. How Teammates Run and Test the AI Module

From the `backend/` directory:

```bash
# 1. Run all 381 automated backend tests (including 16 test suites)
npm test

# 2. Run Oxlint (0 warnings, 0 errors across 96 files)
npm run lint

# 3. Run Review 3 Dense Semantic Retrieval Experiment
npm run rag:experiment

# 4. Run Review 4 & 5 Grounded Agent Pipeline across 5 Canonical Cases
npm run ai:agent
```

---

## 5. Canonical Test Cases Evaluation Matrix

| Case ID | Category | Request Scenario | Top Evidence | Expected Status | Actual Status | Effort / Cost | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`case-1`** | **Clearly In Scope** | E.164 phone formatting on checkout | `DEL-CHK-01` (69%) | `in_scope` | `in_scope` | **0h ($0)** | **PASS** |
| **`case-2`** | **Clearly Out of Scope** | Web3 crypto token settlement | `DEL-PAY-01` (44%) | `out_of_scope` | `out_of_scope` | **18h ($1,800)** | **PASS** |
| **`case-3`** | **Partial Overlap** | Catalog bulk CSV import & inventory sync | `DEL-CAT-01` (94%) | `partially_out_of_scope` | `partially_out_of_scope` | **18h ($1,800)** | **PASS** |
| **`case-4`** | **Ambiguous Request** | "Make store significantly faster" | `PROP-V1-SCOPE-01` | `needs_clarification` | `needs_clarification` | **Suppressed** | **PASS** |
| **`case-5`** | **Insufficient Evidence** | AS400 ERP warehouse VPN sync | `DEL-CAT-01` (13%) | `uncertain` | `uncertain` | **Suppressed** | **PASS** |

---

## 6. REST API Endpoints Reference

All endpoints are mounted under `/api/ai/*`:

### Agent Endpoints (Reviews 4 & 5)
- `POST /api/ai/agent/analyze`: Requires a bearer token and a persisted `projectId` the caller can access. The current approved proposal version and deliverables are loaded from persisted project data; caller-supplied scope snapshots and hourly rates are not trusted. Cost is suppressed because the current Project model has no persisted hourly-rate field.
- `GET /api/ai/agent/providers`: Enumerates available model providers (Local, Ollama, Gemini, Groq) with live availability status.
- `POST /api/ai/agent/providers/select`: Requires a bearer token; supported values are `local`, `ollama`, `gemini`, and `groq` (`{ "provider": "local" }`).
- `GET /api/ai/agent/benchmark`: Runs all 5 canonical cases and returns structured evaluation metrics.

### RAG & Retrieval Endpoints (Review 3)
- `POST /api/ai/rag/retrieve`: Real-time semantic similarity retrieval over indexed scope passages.
- `GET /api/ai/rag/corpus`: Dumps all indexed approved-scope baseline passages with source citations.
- `GET /api/ai/rag/experiments`: Lists canonical Review 3 experiment test cases.
- `GET /api/ai/rag/experiments/run`: Runs the semantic retrieval benchmark.

### Deterministic Mock Endpoints (Review 2)
- `POST /api/ai/analyze-mock`: Dynamic rule-based analysis.
- `GET /api/ai/cases`: Lists canonical test cases.
- `GET /api/ai/cases/:caseId/run`: Executes specific test case.
- `GET /api/ai/cases/run-all`: Executes all 5 test cases.

---

## 8. Production Scope Chat & Change-Analysis Agent (Section 3-6)

### 8.1 Grounded Scope Chat (`POST /api/scope-chat`)
Enables authorized users to ask conversational questions regarding approved deliverables and contractual commitments. Answers are strictly grounded in retrieved evidence with anti-prompt-injection boundaries.

**Request:**
```bash
curl -X POST http://localhost:5000/api/scope-chat \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "660c1d2e4f1a2b3c4d5e6f7a",
    "question": "Is Stripe Checkout included in the approved deliverables?",
    "topK": 3
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Grounded scope chat response generated",
  "data": {
    "answer": "Based on approved deliverable **PROP-V2-DELIV-3** (*Stripe Checkout Payment Gateway*, similarity: 94%) from Proposal Version 2:\n\n> \"Card processing and webhook handlers via Stripe Checkout integration.\"\n\nAny modification or expansion beyond these baseline specifications constitutes a scope change and requires a formal change request review.",
    "sources": [
      {
        "sourceReference": "PROP-V2-DELIV-3",
        "sourceTitle": "Stripe Checkout Payment Gateway",
        "passageText": "Card processing and webhook handlers via Stripe Checkout integration.",
        "similarityScore": 0.94
      }
    ],
    "proposalVersion": 2,
    "hasSufficientEvidence": true,
    "conversationId": "conv_1729328400000_abc12",
    "timestamp": "2026-10-19T14:15:00.000Z"
  }
}
```

### 8.2 Bounded Change-Analysis Agent (`POST /api/change-agent`)
Executes a bounded workflow coordinating:
- **Tool A: `readApprovedScope(projectId)`**: Retrieves approved `ProposalVersion` and `Deliverable` records from MongoDB.
- **Tool B: `compareRequestedWork(request, deliverables)`**: Vector search & LLM semantic comparison.
- **Tool C: `calculateScheduleImpact(effortParams)`**: Deterministic formula calculation without hallucinated estimates.

**Request:**
```bash
curl -X POST http://localhost:5000/api/change-agent \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "660c1d2e4f1a2b3c4d5e6f7a",
    "requestTitle": "Native iOS Mobile App",
    "requestDescription": "Build standalone native Swift iOS application for iPhone users",
    "requestedBy": "Acme Corp Client",
    "developerCapacityHoursPerDay": 6,
    "storedHourlyRate": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Change-Analysis Agent execution completed",
  "data": {
    "agentRunId": "agent_run_1729328400000_xyz78",
    "projectId": "660c1d2e4f1a2b3c4d5e6f7a",
    "proposalVersionNumber": 2,
    "reviewStatus": "out_of_scope",
    "confidenceScore": 0.92,
    "summary": "Request introduces native mobile application development which is not part of the approved web platform baseline.",
    "evidence": [...],
    "inScopeItems": [],
    "outOfScopeItems": ["Native Swift iOS mobile application"],
    "uncertainItems": [],
    "affectedDeliverables": [],
    "scheduleImpact": {
      "estimatedHours": 36,
      "scheduleImpactDays": 6,
      "estimatedCost": 3600,
      "calculationBasis": "Calculated using formula: 1 item(s) * 30 base hours + 15% testing/QA buffer at $100/hr.",
      "isEligibleForBilling": true
    },
    "humanReviewDraftNotice": "ADVISORY DRAFT ONLY: The Change-Analysis Agent possesses zero authority to approve or reject change requests. Final contractual decisions remain strictly with authorized human participants.",
    "toolLogs": [
      { "toolName": "readApprovedScope", "status": "success", "durationMs": 8 },
      { "toolName": "compareRequestedWork", "status": "success", "durationMs": 35 },
      { "toolName": "calculateScheduleImpact", "status": "success", "durationMs": 1 }
    ],
    "completedAt": "2026-10-19T14:15:01.000Z"
  }
}
```

### 8.3 Change Request Direct Integration (`POST /api/change-requests/:id/ai-analyze`)
Triggers the Change Agent for an existing Change Request document, saving the analysis, evidence, and citations directly to `cr.aiAnalysis`, `cr.scopeComparison`, and `cr.retrievedScopeReferences`.

### 8.4 MongoDB Atlas Vector Search Index Configuration
In your MongoDB Atlas cluster, create a Search Index on the `scopechunks` collection:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 1024,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "project": {
        "type": "token"
      },
      "workspace": {
        "type": "token"
      },
      "status": {
        "type": "token"
      }
    }
  }
}
```
*Note: In development and offline testing, the system automatically uses in-memory cosine ranking over project chunks if Atlas `$vectorSearch` is not yet provisioned on the cluster.*

### 8.5 Automated Test Verification Matrix (403 Tests Passing)
All 18 required scenarios from Section 10 are automated and verified in `backend/tests/ai.fullIntegration.test.js`:

| # | Required Scenario | Test File & Suite | Result |
|---|---|---|---|
| 1 | In-scope request returns `in_scope` | `ai.fullIntegration.test.js` - Scenario 1 | **PASS** |
| 2 | Out-of-scope request returns `out_of_scope` | `ai.fullIntegration.test.js` - Scenario 2 | **PASS** |
| 3 | Partial overlap returns `partially_out_of_scope` | `ai.fullIntegration.test.js` - Scenario 3 | **PASS** |
| 4 | Ambiguous request returns `needs_clarification` | `ai.fullIntegration.test.js` - Scenario 4 | **PASS** |
| 5 | Missing evidence returns `uncertain` | `ai.fullIntegration.test.js` - Scenario 5 | **PASS** |
| 6 | Correct approved proposal version retrieval | `ai.fullIntegration.test.js` - Scenario 6 | **PASS** |
| 7 | Source citations in grounded chat responses | `ai.fullIntegration.test.js` - Scenario 7 | **PASS** |
| 8 | Empty retrieval handled gracefully | `ai.fullIntegration.test.js` - Scenario 8 | **PASS** |
| 9 | Model timeout/fallback handled gracefully | `ai.fullIntegration.test.js` - Scenario 9 | **PASS** |
| 10 | Zod input/output schema validation | `ai.fullIntegration.test.js` - Scenario 10 | **PASS** |
| 11 | Unauthorized access to another project blocked (403) | `ai.fullIntegration.test.js` - Scenario 11 | **PASS** |
| 12 | No cross-workspace retrieval leakage | `ai.fullIntegration.test.js` - Scenario 12 | **PASS** |
| 13 | Unauthorized agent tool execution prevented | `ai.fullIntegration.test.js` - Scenario 13 | **PASS** |
| 14 | Mutating approved terms prevented | `ai.fullIntegration.test.js` - Scenario 14 | **PASS** |
| 15 | Stale change request rejection/validation | `ai.fullIntegration.test.js` - Scenario 15 | **PASS** |
| 16 | Duplicate execution prevention via SHA-256 | `ai.fullIntegration.test.js` - Scenario 16 | **PASS** |
| 17 | Frontend API client integration parity | `ai.fullIntegration.test.js` - Scenario 17 | **PASS** |
| 18 | Existing mock test baseline preserved | `ai.fullIntegration.test.js` - Scenario 18 | **PASS** |

**Full Test Suite Summary:** 17 Passed Test Suites, 403 Passed Tests, 0 Failed, 0 Lint Warnings/Errors.
