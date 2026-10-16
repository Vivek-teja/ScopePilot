# ScopePilot — Project Tasks & Implementation Roadmap

> **Status:** Audited against repository `main` (`26f646dd0da12cfb53210824ebd0d9e15d9abc46`).

## 1. Completed & Integrated Milestones

| Milestone | Area | Owner | Verified Status |
|---|---|---|---|
| **M1** | Server Foundation & Health Route | Vivek | Completed & Integrated |
| **M2** | Authentication, JWT, and Users | Nikhil | Completed & Integrated |
| **M3** | Workspace, Membership & Invitations | Sushant | Completed & Integrated |
| **M4** | Project & Proposal CRUD, Frozen Baseline | Abhtej | Completed & Integrated |
| **M5** | Milestone & Deliverable Management, Client Decisions | Mounish | Completed & Integrated (`26f646d`) |
| **M7–M9 (Part 1 & 2)** | AI Zod Contracts & 5-Case Deterministic Mock Engine | Vishal | Completed & Integrated (`13f811c`) |
| **M10 (Part 1)** | Frontend React Application under `client/` | Taran | Completed & Integrated (`411e217`) |
| **Git Integration** | Linear branch management, audit verification, FF merges | Shivasainithin | Ongoing (`main` linear at `26f646d`) |

## 2. Current Verified Test Baseline

- **Backend Test Suite (`npm test` in `backend/`):**
  - **145 passed, 145 total** across 9 test suites:
    - `milestoneDeliverable.api.test.js` (59 tests)
    - `milestoneDeliverable.model.test.js` (38 tests)
    - `project.test.js` (19 tests)
    - `ai.contracts.test.js` (10 tests)
    - `ai.routes.test.js` (8 tests)
    - `ai.mockCases.test.js` (7 tests)
    - `validation.test.js` (1 test)
    - `health.test.js` (1 test)
    - `notFound.test.js` (1 test)
- **AI Mock Runner (`npm run mock:cases` in `backend/`):**
  - **5/5 canonical cases passed** with verified determinism and Zod schema compliance.
- **Frontend Production Build (`npm run build` in `client/`):**
  - **Built cleanly in Vite** (52 modules transformed, zero build errors).

## 3. Active Priorities & Review 3 Roadmap

| Task ID | Task Description | Owner | Target Review | Status |
|---|---|---|---|---|
| **Task 5.1** | Change Request decision flow and calculation integration | Mokshagna | Review 2/3 | In Progress |
| **Task 6.1** | Live RAG pipeline: Ollama embeddings and MongoDB vector search | Vishal | Review 3 | Planned |
| **Task 6.2** | Connect live LLM analysis endpoint (`POST /api/ai/analyze`) with auth | Vishal | Review 3 | Planned |
| **Task 10.1** | Switch frontend service facade from `demoStore.js` to live Express API | Taran | Review 3 | Planned |
| **Task 10.2** | Resolve minor Oxlint warning on `DemoContext.jsx:36` (`useDemoSession`) | Taran | Post-Integration | Low Priority |
| **Task 11.1** | Comprehensive end-to-end integration and smoke test suite | Bharat | Review 3 | Planned |
