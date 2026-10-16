# ScopePilot — System Architecture Document

> **Status:** Audited against repository `main` (`93b9af3def1bf4bbeda6ff65cf0b7bd797679d0c`).

## 1. System Overview

ScopePilot is an AI-assisted freelance scope and change management system built with a decoupled client-server architecture:
- **Backend:** Node.js / Express REST API with MongoDB (Mongoose) persistence and Zod schema validation under `backend/`.
- **Frontend:** React 19 / Vite single-page application under `client/`.
- **AI Subsystem:** Zod-contracted deterministic change-analysis engine under `backend/src/ai/` (Review 1 & 2 verified; Review 3 live RAG & vector embeddings planned).

## 2. Layered Backend Architecture

The backend follows a strict layered pattern:

```text
HTTP Request
     ↓
Express Middleware Pipeline
  1. helmet (HTTP security headers)
  2. cors (CORS origin policy)
  3. morgan (HTTP request logging)
  4. express.json & express.urlencoded (body parsing)
     ↓
Routes (backend/src/routes.js -> modules/*/*.routes.js, ai/ai.routes.js)
     ↓
Route Middleware (requireAuth, requireRole, validateBody/Query/Params)
     ↓
Controllers (*.controller.js)
     ↓
Services (*.service.js)
     ↓
Mongoose Models (*.model.js) -> MongoDB
     ↓
Error Handling Pipeline (notFoundHandler -> errorHandler)
```

> [!NOTE]
> **Authentication & Session Model:** The backend uses stateless Bearer JWT authentication via the `Authorization: Bearer <token>` header. It does **not** use session cookies or CSRF tokens. User registration is direct and instant; there are no email verification tokens or local dev inboxes.

### Key Backend Modules:
- **Auth (`backend/src/modules/auth/`):** User registration, JWT token issuance and verification (`jsonwebtoken`), password hashing (`bcryptjs`), and role-based guards (`requireAuth`, `requireRole`, `optionalAuth`). *(Test Status: 0 dedicated automated tests).*
- **Workspace (`backend/src/modules/workspace/`):** Multi-tenant workspace boundaries, memberships, and role assignments (`owner`, `admin`, `member`). *(Test Status: 0 dedicated automated tests).*
- **Project & Proposal (`backend/src/modules/project/`, `proposal/`):** Project boundaries and baseline scopes.
  - *Proposal Versioning Reality:* Proposal v1 creation and client decision recording (`recordDecision`) are implemented, locking the active version upon approval. However, creating superseding versions (v2+) is **not implemented**—no route or service method for `createProposalVersion` exists. *(Test Status: Project has 19 tests; Proposal has 0 dedicated automated tests).*
- **Milestone & Deliverable (`backend/src/modules/milestone/`, `deliverable/`):** Structured milestones and deliverables, evidence attachments, client-restricted decision authorization (`checkDecisionAccess`), and mandatory project query scoping.
  - *Cascade Policy Reality:* When a client records a decision on a milestone (`APPROVED` or `REJECTED`), the milestone status transitions, but the status of child deliverables does **not** automatically cascade. Child deliverables remain in their individual statuses. *(Test Status: 57 API tests, 40 model tests).*
- **Change Request (`backend/src/modules/changeRequest/`):** **Partial Prototype Stub.**
  - Basic Mongoose schema and endpoints exist (`POST /api/change-requests`, `GET /api/change-requests/:id`, `POST /api/change-requests/:id/decision`).
  - *Deficiencies & Gaps:* Missing listing endpoint (`GET /api/change-requests`), lacks project/workspace tenancy checks, contains an unresolved decision-security flaw where freelancers can approve their own change requests in `recordDecision`, lacks effort and schedule impact calculations, and has **0 dedicated automated tests**.
- **AI Change Analysis (`backend/src/ai/`):** Dedicated AI router under `/api/ai`, Zod contracts (`aiAnalysis.contract.js`), and deterministic mock engine (5 canonical cases in `changeAnalysisFixtures.js`, CLI runner `npm run mock:cases`). *(Test Status: 26 tests across 3 suites).*

## 3. Frontend Architecture (`client/`)

- Single-page application built with React 19.2.8 and Vite 8.3.4.
- Directory organization:
  - `client/src/components/`: Reusable UI components, application shell (`AppShell`), layouts, navigation, and modals.
  - `client/src/pages/`: Route-level views (`DashboardPage`, `ProjectsPage`, `ProjectDetailPage`, `ChangeRequestDetailPage`, `LoginPage`, `WorkspacePage`).
  - `client/src/context/`: Session and context providers (`DemoContext.jsx`).
  - `client/src/mocks/`: In-browser mock store (`demoStore.js`).
- Client-side routing with React Router DOM 7 (`/login`, `/workspace`, `/projects`, `/projects/:id`, `/projects/:id/change-requests/:crId`).
- **Standalone Mock Store State:** The frontend currently runs as a standalone interactive prototype. The API service facade (`scopePilotService.js`) re-exports functions directly from `demoStore.js` with simulated latency and browser `localStorage` persistence (`scopepilot_demo_v1`). It makes **zero HTTP requests** to the Express backend. Live backend API wire-up is scheduled for Review 3.
- Fast linting via Oxlint (`.oxlintrc.json`), with one known non-blocking warning in `DemoContext.jsx:36` (`useDemoSession`).

## 4. Current Implementation Status vs. Planned

| Component | Status | Verification Evidence / Details |
|---|---|---|
| Core Mongoose Models | **Implemented** | User, Workspace, Project, Proposal, ProposalVersion, Milestone, Deliverable, ChangeRequest |
| Central Route Mounting | **Implemented** | `backend/src/routes.js` mounting all modules + `/api/ai` |
| Express Middleware Pipeline | **Implemented** | `helmet > cors > morgan > json/urlencoded > routes > error` |
| JWT Authentication & RBAC | **Implemented (Untested)** | Stateless Bearer JWT (`requireAuth`, `requireRole`, `optionalAuth`); 0 dedicated tests |
| Workspace Multi-Tenancy | **Implemented (Untested)** | Tenancy boundaries defined in schema and controllers; 0 dedicated tests |
| Project Management | **Implemented & Verified** | Project CRUD with workspace scoping; 19 tests in `project.test.js` |
| Proposal Versioning | **Partially Implemented (Untested)** | v1 baseline creation and approval locking; v2+ superseding versions missing; 0 dedicated tests |
| Milestone & Deliverable RBAC | **Implemented & Verified** | Client-only decisions; project-scoped listing; non-cascading deliverable policy; 97 tests |
| Change Request Module | **Partial Prototype Stub (Insecure & Untested)** | Unresolved security flaw: freelancers can self-approve in `recordDecision`; lacks tenancy checks; missing listing route; 0 tests |
| AI Deterministic Mock Engine | **Implemented & Verified** | 5 canonical cases in `changeAnalysisFixtures.js`, CLI runner (`npm run mock:cases`), 26 tests |
| React Client SPA | **Implemented (Standalone Prototype)** | Interactive UI shell, views, and routing under `client/`; builds cleanly in Vite; mock store only |
| Frontend API Wire-Up | **Unimplemented (Mock Mode)** | Client operates exclusively against in-browser `demoStore.js`; live API wiring planned for Review 3 |
| Live RAG / Vector Embeddings | **Planned** | Review 3: Ollama local embeddings (`nomic-embed-text`), MongoDB Atlas Vector Search |
| Live LLM Tool Calling | **Planned** | Review 3: LangChain JavaScript / AI agent integration (`POST /api/ai/analyze`) |

## 5. Configuration & Environment Variables

Backend configuration is validated at startup using Zod in `backend/src/config/env.js`:

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | Number | `5000` | Port on which the Express server listens. |
| `NODE_ENV` | Enum | `'development'` | Environment mode (`development`, `production`, `test`). |
| `API_PREFIX` | String | `'/api'` | Global URL prefix for mounted API endpoints. |
| `MONGODB_URI` | String | `'mongodb://localhost:27017/scopepilot_dev'` | MongoDB connection string. |
| `JWT_SECRET` | String | Development fallback | Secret key for signing JWTs (must be at least 16 characters). |
| `JWT_EXPIRES_IN` | String | `'7d'` | Expiration duration for signed JWT tokens (e.g. `'7d'`, `'24h'`). |
| `CORS_ORIGIN` | String | `'*'` | Allowed CORS origin(s). |

## 6. Local Development, Startup Commands & Database Seeding

### Startup Commands

- **Backend Development Server:**
  ```bash
  cd backend
  npm install
  npm run dev      # Starts nodemon watching backend/src/server.js on PORT 5000
  ```
- **Backend Tests & Verification:**
  ```bash
  cd backend
  npm test             # Runs all 9 Jest test suites (145 tests)
  npm run mock:cases   # Executes the 5 deterministic AI review cases
  ```
- **Frontend Development Server:**
  ```bash
  cd client
  npm install
  npm run dev      # Starts Vite development server on http://localhost:5173
  npm run build    # Compiles production bundle using Vite
  npm run lint     # Runs Oxlint code inspection
  ```

### Database Seeding (`npm run seed`)

A database seeding script is provided at `backend/src/scripts/seed.js`. Running `npm run seed` in `backend/`:
1. Connects to MongoDB and drops the existing database collections.
2. Creates default users with hashed passwords (`password123`):
   - **Freelancer:** `freelancer@scopepilot.dev`
   - **Client:** `client@scopepilot.dev`
   - **Admin:** `admin@scopepilot.dev`
3. Provisions a default workspace: `Acme Digital Labs` (owned by the Freelancer, with Client and Admin as members).
4. Creates a seed project: `E-Commerce Platform Redesign`.
5. Attaches an approved Proposal v1 with total budget \$12,000.
6. Seeds Milestone 1 (`Core Platform Architecture`, \$4,000, `IN_PROGRESS`) and Deliverable 1 (`Database Schema & Auth APIs`, `PENDING`).
