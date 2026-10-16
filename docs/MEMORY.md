# ScopePilot — Project Memory & Context Document

> **Status:** Audited against repository `main` (`93b9af3def1bf4bbeda6ff65cf0b7bd797679d0c`).

## 1. Team Roster & Ownership

| Team Member | Responsibility | Primary Module / Directory |
|---|---|---|
| Vivek | Lead / Foundation | `backend/src/server.js`, `app.js`, `routes.js`, architecture |
| Nikhil | Auth & Security | `backend/src/modules/auth/`, security middleware |
| Sushant | Workspace & Membership | `backend/src/modules/workspace/` |
| Abhtej | Project & Proposal | `backend/src/modules/project/`, `proposal/` |
| Mounish | Milestones & Deliverables | `backend/src/modules/milestone/`, `deliverable/` |
| Mokshagna | Change Requests | `backend/src/modules/changeRequest/` |
| Vishal | AI / RAG / Agent | `backend/src/ai/`, `backend/src/contracts/` |
| Taran | Frontend UI | `client/` (React SPA) |
| Shivasainithin | Git Integration & Merging | Git lifecycle, conflict resolution, merge audits |
| Bharat | QA & Testing | Test suites, test coverage, validation |

## 2. Technology Stack

- **Backend Runtime:** Node.js (>= 18.0.0)
- **Web Framework:** Express 4.21.2
- **Database:** MongoDB via Mongoose 8.9.5
- **Schema Validation:** Zod 3.24.1
- **Security & Utilities:** JWT (`jsonwebtoken` 9.0.2), `bcryptjs` 2.4.3, `helmet` 8.0.0, `cors` 2.8.5, `morgan` 1.10.0, `dotenv` 16.4.7
- **Testing:** Jest 29.7.0, Supertest 7.0.0
- **Frontend:** React 19.2.8, React DOM 19.2.8, React Router DOM 7.18.4, Lucide React 1.16.0
- **Frontend Tooling:** Vite 8.3.4, `@vitejs/plugin-react` 6.1.1, Oxlint 1.81.0

## 3. Git Conventions & Integration Policy

- **Integration Branch:** `main` is protected, linear, and always in a deployable/testable state.
- **Linear History:** Merges into `main` use fast-forward only (`git merge --ff-only`). Feature branches must rebase onto `origin/main` before integration.
- **Quality Gates:** Before any merge to `main`, the branch must pass:
  1. Full backend test suite (`npm test` in `backend/` — 145/145 passing across 9 test suites).
  2. AI mock case runner (`npm run mock:cases` in `backend/` — 5/5 passing).
  3. Frontend production build (`npm run build` in `client/` — Vite compilation with zero errors).
- **Directory Layout:**
  - `backend/` — Express API server application
  - `client/` — Frontend React SPA application
  - `docs/` — Core architecture, PRD, memory, tasks, and historical reports (`docs/reports/`)

## 4. Current Milestone Status

All Part 1 and Part 2 core deliverables are integrated into `main`:
- Express backend foundation, error handling, and Zod env configuration active.
- Stateless Bearer JWT authentication and multi-tenant workspace modules implemented (untested by dedicated test suites).
- Project creation verified by test suite (19 tests); Proposal v1 baseline implemented with approval locking (untested by automated test suites).
- Milestone and deliverable management verified with client decision access and scoped querying.
- Deterministic AI mock engine and contracts verified across 5 canonical review scenarios.
- Client React SPA reorganized under `client/` with verified build.

## 5. Implementation Reality & Architectural Blind Spots

The following realities were confirmed through codebase audits and must guide all future reviews:

1. **Authentication Reality:** The application uses stateless Bearer JWT (`Authorization: Bearer <token>`). Registration is direct without email verification or dev inboxes. No cookies or CSRF tokens are utilized.
2. **Proposal Versioning Scope:** Proposal v1 creation and approval locking are implemented. Superseding versioning (v2+ creation and review lifecycle) is not implemented in routes or services.
3. **Change Request Prototype & Security Gap:** The change request module is a partial prototype. It lacks a listing endpoint (`GET /api/change-requests`), lacks project tenancy checks, contains an unresolved decision-security flaw where freelancers can approve their own change requests, lacks schedule/effort calculations, and has **0 dedicated automated tests**.
4. **Milestone Deliverable Cascade:** Recording a decision on a milestone does not automatically cascade to child deliverables; child deliverables remain in their individual statuses.
5. **Frontend API Wiring:** The frontend currently runs as a standalone prototype against an in-browser mock store (`scopePilotService.js` -> `demoStore.js` with `localStorage` persistence). Live Express API wiring is deferred to Review 3.
6. **Test Coverage Blind Spots:** Despite 145 passing tests, coverage is concentrated in Milestones (97 tests), AI (26 tests), and Projects (19 tests). There are **0 dedicated automated tests** for:
   - Auth module (`backend/src/modules/auth/`)
   - Workspace module (`backend/src/modules/workspace/`)
   - Proposal module (`backend/src/modules/proposal/`)
   - Change Request module (`backend/src/modules/changeRequest/`)
   - Frontend unit or integration tests
