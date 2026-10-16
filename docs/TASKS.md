# ScopePilot — Project Tasks & Implementation Roadmap

> **Status:** Audited against repository `main` (`93b9af3def1bf4bbeda6ff65cf0b7bd797679d0c`).

## 1. Completed & Integrated Milestones

| Milestone | Area | Owner | Verified Status |
|---|---|---|---|
| **M1** | Server Foundation & Health Route | Vivek | Completed & Integrated |
| **M2** | Authentication, Stateless JWT & Users | Nikhil | Completed (Implemented; 0 dedicated automated tests) |
| **M3** | Workspace, Membership & Invitations | Sushant | Completed (Implemented; 0 dedicated automated tests) |
| **M4** | Project & Proposal CRUD, Frozen Baseline | Abhtej | Partially Completed (Project CRUD verified with 19 tests; Proposal v1 implemented but untested; v2+ missing) |
| **M5** | Milestone & Deliverable Management, Client Decisions | Mounish | Completed & Integrated (`26f646d`) |
| **M7–M9 (Part 1 & 2)** | AI Zod Contracts & 5-Case Deterministic Mock Engine | Vishal | Completed & Integrated (`13f811c`) |
| **M10 (Part 1)** | Frontend React Application under `client/` | Taran | Completed as Standalone Prototype (Clean Vite build; mock store) |
| **Git Integration** | Linear branch management, audit verification, FF merges | Shivasainithin | Ongoing (`main` linear at `93b9af3`) |

## 2. Current Verified Test Baseline

- **Backend Test Suite (`npm test` in `backend/`):**
  - **145 passed, 145 total** across 9 test suites:
    - `tests/milestoneDeliverable.api.test.js`: **57 tests** (milestone and deliverable CRUD, client decision authorization, project query scoping)
    - `tests/milestoneDeliverable.model.test.js`: **40 tests** (Mongoose schemas, aliases, relationships, and Zod validator schemas)
    - `tests/project.test.js`: **19 tests** (workspace boundary enforcement, project CRUD, membership authorization)
    - `tests/ai.contracts.test.js`: **10 tests** (Zod input/output contract enforcement, mock analysis engine)
    - `tests/ai.routes.test.js`: **9 tests** (REST endpoints under `/api/ai/*`, custom mock analysis, 400/404 handling)
    - `tests/ai.mockCases.test.js`: **7 tests** (5 canonical deterministic review cases, idempotency, safety disclaimer)
    - `tests/validation.test.js`: **1 test** (standardized 400 error payload format on validation failures)
    - `tests/health.test.js`: **1 test** (`GET /api/health` 200 OK response)
    - `tests/notFound.test.js`: **1 test** (catch-all 404 handler)
- **AI Mock Runner (`npm run mock:cases` in `backend/`):**
  - **5/5 canonical cases passed** with verified determinism and Zod schema compliance.
- **Frontend Production Build (`npm run build` in `client/`):**
  - **Built cleanly in Vite** (52 modules transformed, zero build errors).

### Test Coverage Blind Spots & Gaps

The 145 tests provide strong coverage for Milestones, Deliverables, Projects, and AI mock contracts. However, the following modules currently have **no dedicated automated test suites**:
- **Auth Module (`backend/src/modules/auth/`):** 0 tests for registration, login, JWT issuance/verification, password hashing, and role middleware.
- **Workspace Module (`backend/src/modules/workspace/`):** 0 tests for workspace CRUD, membership roles, and invitation handling.
- **Proposal Module (`backend/src/modules/proposal/`):** 0 tests for proposal creation, budget calculations, and approval locking.
- **Change Request Module (`backend/src/modules/changeRequest/`):** 0 tests for change request intake, status transitions, and decision recording.
- **Frontend SPA (`client/`):** 0 unit or integration tests for React components, hooks, or page routing.

## 3. Active Priorities & Review 3 Roadmap

| Task ID | Task Description | Owner | Target Review | Status |
|---|---|---|---|---|
| **Task 5.1** | **Change Request Security & Listing Fix:** Enforce client-only decision recording in `recordDecision`, add workspace/project tenancy checks, and implement `GET /api/change-requests` query endpoint | Mokshagna | Review 3 | High Priority |
| **Task 5.2** | **Change Request Test Suite:** Author dedicated automated tests for Change Request creation, listing, tenancy isolation, and decision authorization | Bharat / Mokshagna | Review 3 | High Priority |
| **Task 4.2** | **Proposal Versioning (v2+):** Implement `createProposalVersion` route and service to allow revising scope after v1 approval | Abhtej | Review 3 | Medium Priority |
| **Task 2.1** | **Auth Automated Tests:** Author dedicated Jest/Supertest suite for registration, login, and JWT middleware | Bharat / Nikhil | Review 3 | High Priority |
| **Task 3.1** | **Workspace Automated Tests:** Author dedicated test suite for workspace tenancy, membership roles, and invitations | Bharat / Sushant | Review 3 | Medium Priority |
| **Task 6.1** | **Live RAG Pipeline:** Implement Ollama local embeddings (`nomic-embed-text`) and MongoDB Atlas Vector Search | Vishal | Review 3 | Planned |
| **Task 6.2** | **Live LLM Analysis Endpoint:** Connect live LLM analysis (`POST /api/ai/analyze`) with authenticated project context | Vishal | Review 3 | Planned |
| **Task 10.1** | **Frontend API Wire-Up:** Migrate `scopePilotService.js` from `demoStore.js` to live Express API calls with Bearer JWT tokens | Taran | Review 3 | High Priority |
| **Task 10.2** | **Frontend Lint Cleanup:** Resolve Oxlint warning on `DemoContext.jsx:36` (`useDemoSession`) | Taran | Post-Integration | Low Priority |
| **Task 11.1** | **End-to-End Smoke Test Suite:** Implement comprehensive end-to-end integration and smoke tests | Bharat | Review 3 | Planned |
