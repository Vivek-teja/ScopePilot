# ScopePilot — Project Memory & Context Document

> **Status:** Audited against repository `main` (`26f646dd0da12cfb53210824ebd0d9e15d9abc46`).

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
- **Security & Auth:** JWT (`jsonwebtoken` 9.0.2), `bcryptjs` 2.4.3, `helmet` 8.0.0, `cors` 2.8.5
- **Testing:** Jest 29.7.0, Supertest 7.0.0
- **Frontend:** React 19.2.8, React DOM 19.2.8, React Router DOM 7.18.4
- **Frontend Tooling:** Vite 8.3.4, `@vitejs/plugin-react` 6.1.1, Oxlint 1.81.0

## 3. Git Conventions & Integration Policy

- **Integration Branch:** `main` is protected, linear, and always in a deployable/testable state.
- **Linear History:** Merges into `main` use fast-forward only (`git merge --ff-only`). Feature branches must rebase onto `origin/main` before integration.
- **Quality Gates:** Before any merge to `main`, the branch must pass:
  1. Full backend test suite (`npm test` in `backend/` — currently 145/145 passing).
  2. AI mock case runner (`npm run mock:cases` in `backend/` — 5/5 passing).
  3. Frontend production build (`npm run build` in `client/` — Vite compilation with zero errors).
- **Directory Layout:**
  - `backend/` — Server application
  - `client/` — Frontend React application
  - `docs/` — Core architecture, PRD, memory, tasks, and historical reports (`docs/reports/`)

## 4. Current Milestone Status

All Part 1 and Part 2 core deliverables are integrated into `main`:
- Workspace and authentication modules functional.
- Project and proposal creation with frozen v1 scopes verified.
- Milestone and deliverable management verified with client decision access and scoped querying.
- Deterministic AI mock engine and contracts verified across 5 canonical review scenarios.
- Client React SPA reorganized under `client/` with verified build.
