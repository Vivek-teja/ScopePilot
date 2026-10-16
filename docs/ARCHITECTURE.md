# ScopePilot — System Architecture Document

> **Status:** Audited against repository `main` (`26f646dd0da12cfb53210824ebd0d9e15d9abc46`).

## 1. System Overview

ScopePilot is an AI-powered freelance scope and change management system built with a decoupled client-server architecture:
- **Backend:** Node.js / Express REST API with MongoDB (Mongoose) persistence and Zod schema validation.
- **Frontend:** React 19 / Vite single-page application located under `client/`.
- **AI Subsystem:** Zod-contracted deterministic change-analysis engine (Review 1 & 2 verified; Review 3 RAG & vector embeddings planned).

## 2. Layered Backend Architecture

The backend follows a strict layered pattern:

```text
HTTP Request
     ↓
Routes (backend/src/routes.js -> modules/*/*.routes.js, ai/ai.routes.js)
     ↓
Middleware (auth, validation, error handler)
     ↓
Controllers (*.controller.js)
     ↓
Services (*.service.js)
     ↓
Mongoose Models (*.model.js) -> MongoDB
```

### Key Modules:
- **Auth:** JWT token issuance, verification, password hashing with bcrypt, role-based guards (`requireAuth`, `requireRole`, `optionalAuth`).
- **Workspace:** Multi-tenant workspace boundaries, memberships, and role assignments (`owner`, `admin`, `member`).
- **Project & Proposal:** Project boundaries, frozen approved proposals, version history.
- **Milestone & Deliverable:** Structured milestones and deliverables, evidence attachments, client-restricted decision authorization (`checkDecisionAccess`), and mandatory project query scoping.
- **Change Request:** Change request intake and decision flows.
- **AI Change Analysis:** Dedicated AI router under `/api/ai`, Zod contracts (`aiAnalysis.contract.js`), and deterministic mock engine.

## 3. Frontend Architecture (`client/`)

- Single-page application built with React 19 and Vite 8.
- Application shell (`AppShell`) with responsive navigation and role switcher (Freelancer / Client / Admin).
- Client-side routing with React Router DOM 7 (`/login`, `/workspace`, `/projects`, `/projects/:id`, `/projects/:id/change-requests/:crId`).
- Local demo store (`demoStore.js` with `scopepilot_demo_v1`) providing realistic mock state during active API integration.
- Fast linting via Oxlint (`.oxlintrc.json`).

## 4. Current Implementation Status vs. Planned

| Component | Status | Verification Evidence |
|---|---|---|
| Core Mongoose Models | **Implemented** | User, Workspace, Project, Proposal, ProposalVersion, Milestone, Deliverable |
| Central Route Mounting | **Implemented** | `backend/src/routes.js` mounting all modules + `/api/ai` |
| Input & Contract Validation | **Implemented** | Zod schemas across endpoints and AI contracts |
| JWT Authentication & RBAC | **Implemented** | `requireAuth`, `requireRole`, `optionalAuth` middleware |
| Milestone & Deliverable RBAC | **Implemented** | Client-only decisions; project-scoped list queries |
| AI Deterministic Mock Engine | **Implemented** | 5 canonical cases in `changeAnalysisFixtures.js`, CLI runner (`npm run mock:cases`), `/api/ai` endpoints |
| React Client SPA | **Implemented** | Full UI shell, views, and routing under `client/` (builds cleanly in Vite) |
| Live RAG / Vector Embeddings | **Planned** | Review 3: Ollama local embeddings, Atlas Vector Search |
| Live LLM Tool Calling | **Planned** | Review 3: LangChain / AI agent integration |
| End-to-End API Wire-Up | **In Progress** | Connecting React frontend services directly to Express endpoints |
