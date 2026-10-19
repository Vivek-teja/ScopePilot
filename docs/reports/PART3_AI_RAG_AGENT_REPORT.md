# ScopePilot – Part 3: AI / RAG / Change-Analysis Subsystem
## Architecture, Embeddings, Semantic Scope Retrieval & Integration Handoff Report

**Module:** AI / RAG / Change-Analysis Subsystem  
**Module Assignee:** Vishal  
**Project:** ScopePilot (AI-Powered Freelance Scope & Change Management Platform)  
**Date:** October 18, 2026  
**Status:** Completed & Verified; 362 / 362 backend tests passing across 15 suites; 5 / 5 semantic retrieval benchmark cases verified deterministically.  
**Active Feature Branch:** `Vishal`  
**Runtime & Tech Stack:** Node.js (v20+), Express 4.21, Mongoose 8.9.5, Zod 3.24.1, Jest 29.7, Supertest 7.0  

---

## 1. Executive Summary & Delivery Scope

In freelance client engagements, scope disputes arise when clients describe change requests informally using colloquial phrasing that diverges from signed contractual proposals. For example, while signed deliverable `DEL-CHK-01` specifies `"E.164 international telephone number formatting on checkout"`, a client writes `"cellphone dial code picker on the final buying screen"`. Keyword search fails completely on these requests.

The **Part 3 (Review 3)** AI Agent milestone delivers a contract-grounded semantic retrieval subsystem (RAG pipeline) that solves this problem:
1. **Approved-Scope Corpus Management (`corpus.service.js`):** Chunks and indexes approved proposal scope items and deliverables with strict audit citations (`sourceReference`, `proposalVersion`, `documentType`).
2. **Dense Vector Embeddings (`embedding.service.js`):** Implements a 1024-dimensional normalized vector space with subword character n-grams and domain synonym clusters to bridge vocabulary mismatches without requiring cloud API keys.
3. **Evidence-Aware Semantic Retrieval (`retrieval.service.js`):** Calculates cosine similarity against baseline passages and classifies candidates into confidence bands:
   - **`strong_match`** ($\ge 0.65$): High semantic proximity (`candidate_found`).
   - **`weak_match`** ($0.35 \le S < 0.65$): Partial overlap (`weak_evidence`); generates clarifying questions.
   - **`no_evidence`** ($< 0.35$): Clears false candidates (`topMatch: null`), returns `uncertain`, and generates discovery questions.
4. **Mandatory Human-in-the-Loop Safeguards:** Enforces the strict rule that a similarity score is only a retrieval proximity signal, never autonomous proof of contractual scope inclusion.
5. **Team Integration Handoff:**
   - Mounted Express API endpoints under `/api/ai/rag/*` with Zod validation.
   - Client API bindings exported in `client/src/services/api/aiApi.js` and `client/src/services/scopePilotService.js` for seamless React integration by Taran.
   - Standalone CLI runner `npm run rag:experiment` for QA automated verification by Bharat.

---

## 2. Technical Architecture & Component Mapping

```
                                [ Client Change Request ]
                               (Altered / Colloquial Wording)
                                            │
                                            ▼
                           [ Zod Input Contract Validation ]
                             (RetrievalQueryInputSchema)
                                            │
                                            ▼
                            [ Dense Vector Embedding Service ]
                         (1024-dim Normalized Vectors + N-Grams)
                                            │
                                            ▼
                         [ Cosine Similarity Retrieval Engine ]
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
      [ DEL-CHK-01: Phone ]       [ DEL-CAT-01: Catalog ]      [ DEL-NOTIF-01: Email ]
         (Checkout Flow)             (Faceted Search)             (SMTP Dispatch)
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            │
                                            ▼
                            [ Threshold Evidence Classifier ]
           ├── Score >= 0.65  ──▶ [ Strong Match ] (candidate_found)
           ├── 0.35 <= S < 0.65 ──▶ [ Weak Match ]   (weak_evidence + clarify questions)
           └── Score < 0.35   ──▶ [ No Evidence ]  (uncertain fallback + discovery questions)
                                            │
                                            ▼
                           [ Evidence-Aware Output Payload ]
                         (Traceable Citations + Safeguard Notice)
```

---

## 3. The 5 Canonical Retrieval Benchmark Scenarios

Curated in `backend/src/ai/fixtures/retrievalExperimentFixtures.js` and verified by `npm run rag:experiment`:

| ID | Category | Client Query | Nearest Baseline Passage | Score | Status | Verdict |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **EXP-01** | Different Wording | *"Add mobile cellphone dial code picker and format check on the final buying screen"* | `DEL-CHK-01` (Checkout Flow & Validation) | **69%** | `candidate_found` | **PASS** |
| **EXP-02** | Synonym Paraphrase | *"Allow buyers to filter goods by price bracket and sort articles by arrival date"* | `DEL-CAT-01` (Catalog & Faceted Search) | **94%** | `candidate_found` | **PASS** |
| **EXP-03** | Ambiguous Overlap | *"Send automated SMS alerts and push notifications when order status updates"* | `DEL-NOTIF-01` (Email Notification Service) | **50%** | `weak_evidence` | **PASS** |
| **EXP-04** | Distractor Proximity Guard | *"Connect decentralized web3 wallet to process crypto payments"* | `DEL-PAY-01` (Stripe Payment Gateway) | **44%** | `weak_evidence` | **PASS** |
| **EXP-05** | Insufficient Evidence | *"Sync orders to internal enterprise ERP via custom warehouse AS400 connector and VPN tunnel"* | `NONE` (Zero passages met min threshold) | **13%** | `uncertain` | **PASS** |

---

## 4. Teammate Integration & Hand-off Interface

To ensure all teammates can interact with the AI Agent / RAG subsystem easily:

### 4.1 Frontend UI Integration (For Taran & UI Developers)
The client API layer exposes clean async helpers:
```javascript
// In client/src/services/api/aiApi.js & client/src/services/scopePilotService.js
import { retrieveScopePassages, getScopeCorpus } from './services/scopePilotService';

// Run semantic scope retrieval:
const result = await retrieveScopePassages({
  query: 'Customer wants a phone country code dropdown on payment screen',
  topK: 3,
  minThreshold: 0.35,
});

console.log(result.status);            // 'candidate_found'
console.log(result.topMatch);          // { sourceReference: 'DEL-CHK-01', similarityScore: 0.69, ... }
console.log(result.safeguardNotice);   // Advisory disclaimer
```

### 4.2 Change Request Module Integration (For Mokshagna)
When a change request is created or evaluated, the backend can attach candidate scope evidence directly to the `aiAnalysis` schema of `ChangeRequest`:
```javascript
const { defaultRetrievalService } = require('../../ai/rag/retrieval.service');

const retrieval = defaultRetrievalService.retrieve({
  query: `${changeRequest.title} ${changeRequest.description}`,
  topK: 3,
  minThreshold: 0.35,
});

changeRequest.aiAnalysis = {
  summary: retrieval.status === 'candidate_found'
    ? `Matches approved deliverable ${retrieval.topMatch.sourceReference}`
    : 'Requires scope clarification or discovery',
  confidenceScore: retrieval.similarityScore,
  rawOutput: retrieval,
  analyzedAt: new Date(),
};
```

### 4.3 QA & CI/CD Verification (For Bharat & Shivasainithin)
Run the automated test suite and CLI runners:
```bash
# Full test suite (362 tests across 15 suites)
npm test

# Review 3 Semantic Retrieval Benchmark
npm run rag:experiment

# Review 2 Deterministic Mock Cases
npm run mock:cases
```

---

## 5. Automated Test Coverage & Verification

- **Total Backend Tests:** **362 / 362 passed** across 15 test suites.
- **Dedicated Retrieval Test Suite:** [`backend/tests/ai.retrieval.test.js`](file:///c:/Users/Vishal/Downloads/ScopePilot-main/ScopePilot-main/backend/tests/ai.retrieval.test.js) (17/17 tests passing).
- **Execution Time:** ~5.09 seconds for the complete repository test run.
- **Linters:** Clean Oxlint pass with zero errors.

---

## 6. Git Status & Feature Branch Lineage

- **Branch:** `Vishal` (pushed to `origin/Vishal`).
- **Head Commit:** `b49befb` (`feat(ai): Review 3 - embeddings and approved-scope semantic retrieval experiment`).
- **Base History:** Fully integrated on top of `origin/main` commit `c8d6691`.
- **Working Tree:** Clean, zero uncommitted files, 100% synchronized across local clones and GitHub Desktop.
