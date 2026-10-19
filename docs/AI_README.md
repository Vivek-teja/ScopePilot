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
- `POST /api/ai/agent/analyze`: Full grounded analysis pipeline on any custom change request.
- `GET /api/ai/agent/providers`: Enumerates available model providers (Local, Ollama, Gemini, Groq) with live availability status.
- `POST /api/ai/agent/providers/select`: Switches the active provider at runtime (`{ "provider": "local" }`).
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

## 7. Known Limitations & Teammate Handover Notes

1. **Advisory Nature**: The agent generates draft analyses to accelerate freelancer/agency reviews. It does not replace project manager approvals or legal change orders.
2. **Local Model Latency**: When running Ollama locally on consumer hardware, model inference takes 2–8 seconds depending on GPU acceleration; the built-in local engine executes in < 5ms.
3. **Rate Limits on Free Cloud APIs**: Google Gemini Free Tier is limited to 15 requests per minute (RPM). In automated testing or offline environments, the engine automatically falls back to the local provider.
4. **Shared Contract Stability**: All contracts are exported via `backend/src/contracts/index.js` and do not alter or interfere with the database schemas of `Proposal`, `Deliverable`, or `ChangeRequest`.
