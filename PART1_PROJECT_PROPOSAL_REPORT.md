# ScopePilot – Part 1: Architecture Inspection & Development Preparation Report

**Module:** Project & Proposal Management  
**Module Assignee:** Abhtej  
**Project:** ScopePilot (AI-Powered Freelance Scope & Change Management Platform)  
**Date:** October 14, 2026  
**Status:** Inspection Complete & Ready for Part 2  
**Target Feature Branch:** `feature/project-proposal`  

---

## 1. Executive Summary & Module Purpose

ScopePilot is an AI-powered platform designed to combat **scope creep** in freelance engagements. In typical client-freelancer engagements, informal discussions, undocumented revisions, and creeping requirements lead to misaligned expectations, uncompensated labor, and project delays. ScopePilot addresses this by transforming verbal agreements into verifiable, versioned, and immutable project scope baselines.

As the developer responsible for **Project & Proposal Management**, this module answers two foundational questions for the entire platform:
1. **Project Identity:** What freelance engagement are the client and freelancer collaborating on?
2. **Agreed Scope Baseline:** What exact deliverables, timeline commitments, budget, and scope items did the parties formally agree to deliver?

### Authoritative Scope Hierarchy

```
Workspace  -->  Project  -->  Proposal  -->  Proposal Version  -->  Approved Scope Baseline
                                                                             │
                                              ┌──────────────────────────────┴──────────────────────────────┐
                                              ▼                                                             ▼
                             Milestones & Deliverables (Mounish)                           Change Requests & AI Comparison (Mokshagna & Vishal)
```

1. **Workspace:** Multi-tenant office/room container where collaboration happens (owned by Sushant).
2. **Project:** A specific freelance engagement connecting the workspace, freelancer, and client.
3. **Proposal:** The container document describing what the project will contain.
4. **Proposal Version:** An individual saved snapshot of that proposal with itemized deliverables and pricing.
5. **Approved Scope Baseline:** The specific proposal version formally approved by the client, serving as the immutable ground-truth benchmark for downstream modules.

---

## 2. Codebase & Directory Structure Analysis

The ScopePilot backend adheres to a clean, modular 3-tier architecture with Express and Mongoose:

```
backend/
├── src/
│   ├── config/              # Environment config (env.js) and database lifecycle (db.js)
│   ├── constants/           # HTTP status codes (httpStatus.js) and System/Workspace roles (roles.js)
│   ├── middleware/          # JWT auth (auth.middleware.js), error handling, and Zod validator
│   ├── modules/
│   │   ├── auth/            # User authentication & registration (Nikhil's module)
│   │   ├── workspace/       # Workspace & membership management (Sushant's module)
│   │   ├── project/         # Projects under workspaces (Abhtej's module)
│   │   ├── proposal/        # Versioned proposals & scope baseline (Abhtej's module)
│   │   ├── milestone/       # Milestones & progress evidence (Mounish's module)
│   │   ├── deliverable/     # Deliverables linked to milestones (Mounish's module)
│   │   └── changeRequest/   # Scope change requests & impact analysis (Mokshagna's module)
│   ├── contracts/           # Shared cross-module Zod contracts (aiAnalysis.contract.js)
│   ├── ai/                  # AI agent scaffolding, vector embeddings & prompts (Vishal's module)
│   ├── utils/               # ApiResponse, ApiError, asyncHandler, and JWT helpers
│   ├── app.js               # Express application configuration
│   ├── routes.js            # Central routing table mounting all modules
│   └── server.js            # Server bootstrapper & MongoDB connector
├── tests/                   # Jest automated test suites
├── .env.example             # Template environment configuration
└── package.json             # Node.js project manifest & scripts
```

### Standard 6-File Module Convention
Every backend module strictly implements the following structure:
1. `*.constants.js`: Enums, lifecycle statuses, role definitions, and business limits.
2. `*.model.js`: Mongoose schemas, embedded sub-documents, indexes, and persistence methods.
3. `*.validation.js`: Zod schemas for strict request body, URL path parameters, and query string validation.
4. `*.service.js`: Encapsulated business logic, transaction handling, and cross-model database operations.
5. `*.controller.js`: Thin HTTP controllers wrapped in `asyncHandler`, delegating directly to services.
6. `*.routes.js`: Express router definitions mapping endpoints to `validate()` and `auth` middleware.

### Unified API Response & Error Handling Envelope
- **Standard Success Response (`ApiResponse`):**
  ```json
  {
    "success": true,
    "message": "Operation successful",
    "data": {}
  }
  ```
- **Standard Error Response (`ApiError` / `error.middleware.js`):**
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      {
        "field": "title",
        "message": "Project title must be at least 2 characters",
        "code": "too_small"
      }
    ]
  }
  ```

---

## 3. Existing User & Workspace System Audit

To respect team boundaries, my module reuses the existing authentication and workspace modules without duplicating or altering their implementations:

### User & Authentication System (Nikhil's Module)
* **Model Location:** `backend/src/modules/auth/auth.model.js`
  * The `User` model includes: `name`, `email` (unique, lowercase), `passwordHash` (hidden with `select: false`), `role` (`freelancer`, `client`, `admin`), `profileSlug`, and `isActive`.
* **Authentication Guard:** `backend/src/middleware/auth.middleware.js`
  * Exports `requireAuth`: Validates incoming Bearer JWT tokens, decodes the token, fetches the user from MongoDB, and attaches the sanitized document to `req.user`.
  * Exports `requireRole`: Enforces system-level role access (`freelancer`, `client`, `admin`).
* **Coordination Rule:** Abhtej **must not** recreate user registration, login, or token verification logic. Project and proposal operations directly consume `req.user` provided by `requireAuth`.

### Multi-Tenant Workspace System (Sushant's Module)
* **Model Location:** `backend/src/modules/workspace/workspace.model.js`
  * The `Workspace` model includes: `name`, `slug`, `owner` (ref: `User`), embedded `members` array (`user`, `role`, `joinedAt`), and embedded `invitations` array.
* **Access Boundary:**
  * Every `Project` references a parent workspace: `workspace: { type: ObjectId, ref: 'Workspace', required: true }`.
  * Before creating a project, `ProjectService` validates that the workspace exists and that `req.user` is either the workspace owner or an active member.

---

## 4. Audited Project & Proposal Module Files

### Project Module Files (`backend/src/modules/project/`)
1. **`project.constants.js`:**
   * Statuses: `draft`, `active`, `in_progress`, `completed`, `cancelled`.
2. **`project.model.js`:**
   * Schema: `workspace` (ref: `Workspace`), `freelancer` (ref: `User`), `client` (ref: `User`), `title`, `description`, `status`, `currentApprovedProposal` (ref: `ProposalVersion`).
   * Compound indexes: `{ workspace: 1, status: 1 }`, `{ freelancer: 1, client: 1 }`.
3. **`project.validation.js`:**
   * Schemas: `projectIdParamSchema`, `createProjectSchema`.
4. **`project.controller.js`:**
   * Controllers: `createProject`, `getProjectById`.
5. **`project.service.js`:**
   * Logic: validates workspace membership on creation; validates user access rights on retrieval.
6. **`project.routes.js`:**
   * Mounted at `/api/projects` in `routes.js`. Protected by `requireAuth` and Zod validation.

### Proposal Module Files (`backend/src/modules/proposal/`)
1. **`proposal.constants.js`:**
   * Statuses: `draft`, `pending_approval`, `approved`, `rejected`.
   * Decisions: `approve`, `reject`.
2. **`proposal.model.js`:**
   * `ProposalVersion` Schema: `proposal` (ref: `Proposal`), `project` (ref: `Project`), `versionNumber`, `title`, `scopeSummary`, `scopeItems` (`title`, `description`, `estimatedHours`, `price`), `totalBudget`, `currency`, `status`, `decidedBy`, `decidedAt`, `decisionComment`, `contentHash`.
   * Unique compound index: `{ proposal: 1, versionNumber: 1 }`.
   * `Proposal` Schema: `project`, `title`, `currentVersionNumber`, `activeVersion` (ref: `ProposalVersion`), `status`, `createdBy`.
3. **`proposal.validation.js`:**
   * Schemas: `proposalIdParamSchema`, `createProposalSchema`, `proposalDecisionSchema`.
4. **`proposal.controller.js`:**
   * Controllers: `createProposal`, `getProposalById`, `recordDecision`.
5. **`proposal.service.js`:**
   * Logic: creates proposal and version 1 simultaneously; retrieves version history sorted descending; records approval/rejection and updates `project.currentApprovedProposal`.
6. **`proposal.routes.js`:**
   * Mounted at `/api/proposals` in `routes.js`. Protected by `requireAuth`.

---

## 5. Gap Analysis: Missing Functionality & Risks

| Category | Existing State | Identified Gap / Required Extension |
| :--- | :--- | :--- |
| **Proposal Versioning** | Only version 1 is created via `POST /api/proposals`. | **Missing Revision Bumping:** No route or service method exists to create Version 2, 3, etc. A new endpoint `POST /api/proposals/:id/versions` is required so that past approved versions are preserved. |
| **Approval Authorization** | `recordDecision` checks if version is already approved. | **Missing Role Guard:** Does not verify that the decider is the client. A freelancer could approve their own proposal. Only the assigned client (or workspace owner) must be allowed to decide. |
| **Immutability Protection** | Logical lock in controller only. | **Missing Schema-Level Guard:** Mongoose `pre('save')` hook needed to strictly reject modifications to any `ProposalVersion` whose status is already `approved`. |
| **Project Querying** | Only `GET /api/projects/:id` exists. | **Missing Listing:** Need `GET /api/projects?workspaceId=...` to list projects accessible to the current user. |
| **Project Lifecycle** | Projects created as `draft` or given status. | **Missing Updates:** Need `PATCH /api/projects/:id` to update details, assign a client, or transition status. |
| **Approved Scope API** | Populated on `GET /api/projects/:id`. | **Missing Dedicated Scope Contract:** Need `GET /api/projects/:id/approved-scope` formatted for downstream AI and Milestone consumption. |
| **Content Integrity** | `contentHash` field exists in schema. | **Missing Hash Generation:** SHA-256 hash over canonical scope items must be calculated upon version submission to ensure cryptographic immutability. |
| **Local Environment** | Host system check completed. | **Missing Runtime Prerequisites:** Node.js and MongoDB are not yet installed in host PATH. `node_modules` and `.env` are currently absent. |

---

## 6. Teammate Dependencies & Cross-Module Contracts

| Teammate & Role | Module Boundary | Contractual Dependency & Export Requirement |
| :--- | :--- | :--- |
| **Sushant** (Workspace) | Multi-tenant Boundary | Projects require valid `workspaceId`. Abhtej verifies workspace existence and membership before project creation. |
| **Nikhil** (Auth & Security) | Identity & Session | Abhtej consumes `req.user` and enforces project-level role logic (Client approval vs Freelancer authoring). |
| **Mounish** (Milestones & Deliverables) | Project Sub-Entities | Milestones reference `project`. Deliverables reference `scopeReference` (e.g. `PROP-V1-ITEM-1`) from approved proposal versions. |
| **Mokshagna** (Change Requests) | Scope Comparison | Change requests reference `project` and read `currentApprovedProposal` to evaluate if new work is out of scope. |
| **Vishal** (AI / RAG / Agent) | Scope Ingestion Contract | Consumes `ApprovedProposalVersionInputSchema` (`backend/src/contracts/aiAnalysis.contract.js`) for vector embeddings and RAG comparison. |
| **Taran** (Frontend UI) | Client Application | Consumes REST endpoints for Project Dashboard, Proposal Creation Wizard, Version Timeline, and Client Approval Modals. |
| **Bharat** (Testing & QA) | Quality Assurance | Supplied with test seeds, endpoint specifications, and edge-case test suites for verification. |
| **Shiva** (Git & Merging) | Integration & PRs | Abhtej works strictly in `feature/project-proposal`, providing clean branches and PRs against `main`/`develop`. |
| **Vivek** (Team Lead & DB Coord) | Architecture Governance | Coordinates shared database schema standards, indexing strategies, and cross-module relationship integrity. |

---

## 7. Stage 2 Detailed Implementation Plan

### Phase 1: Environment & Branch Initialization
1. Check out dedicated Git feature branch: `feature/project-proposal`.
2. Confirm Node.js (>=18) runtime and configure MongoDB connection in `backend/.env`.
3. Run `npm install` inside `backend/`.
4. Run baseline test suite (`npm test`) to verify passing status.

### Phase 2: Project Functionality Extensions
1. Add `updateProjectSchema` and `listProjectsQuerySchema` in `project.validation.js`.
2. Implement `listProjects(userId, query)` in `project.service.js` with workspace scoping.
3. Implement `updateProject(projectId, userId, updateData)` for metadata and client assignment.
4. Implement `getProjectApprovedScope(projectId, userId)` for active scope extraction.
5. Register endpoints in `project.routes.js`:
   - `GET /api/projects`
   - `PATCH /api/projects/:id`
   - `GET /api/projects/:id/approved-scope`

### Phase 3: Proposal Multi-Version & Revision Engine
1. Add `createProposalVersionSchema` and `proposalVersionParamSchema` in `proposal.validation.js`.
2. Implement `createProposalVersion(proposalId, userId, versionData)` in `proposal.service.js`:
   - Increments `currentVersionNumber` ($V_{N+1}$).
   - Calculates SHA-256 `contentHash` over scope items.
   - Sets status to `pending_approval`.
   - Updates `proposal.activeVersion = newVersion._id`.
   - Leaves past versions completely untouched.
3. Implement `getProposalVersion(proposalId, versionNumber, userId)` for historical version lookup.
4. Implement `getProposalsByProject(projectId, userId)` for project-level proposal lookup.
5. Register endpoints in `proposal.routes.js`:
   - `POST /api/proposals/:id/versions`
   - `GET /api/proposals/:id/versions/:versionNumber`
   - `GET /api/proposals/project/:projectId`

### Phase 4: Decision Engine, Role Guardrails & Immutability
1. Update `recordDecision()` in `proposal.service.js`:
   - Enforce that only the assigned **Client** (or workspace owner) can approve/reject.
   - Freelancer is blocked from self-approval with `ApiError.forbidden()`.
   - On approval: link `project.currentApprovedProposal = activeVersion._id` and transition project from `draft` to `active`.
2. Attach Mongoose `pre('save')` immutability hook on `ProposalVersion`:
   - If document is already `approved`, reject any modification attempts.

### Phase 5: Downstream Contract Alignment
1. Ensure `GET /api/projects/:id/approved-scope` matches Vishal's `ApprovedProposalVersionInputSchema`:
   - `projectId`, `versionNumber`, `title`, `scopeSummary`, `scopeItems: [{ id, title, description, estimatedHours, price }]`, `totalBudget`, `currency`, `contentHash`, `approvedAt`, `approvedBy`.
2. Coordinate with Mounish on `scopeReference` formatting (`PROP-V{N}-ITEM-{idx}`) for Deliverables.

### Phase 6: Automated Testing & Verification
1. Create `backend/tests/project.test.js`:
   - Project creation by authorized member.
   - Project creation rejected for non-member.
   - Scoped project listing.
   - Project updates and access controls.
2. Create `backend/tests/proposal.test.js`:
   - Proposal v1 creation linked to project.
   - Client approval workflow linking `currentApprovedProposal`.
   - Rejection of freelancer self-approval.
   - Revision creation (v1 -> v2) preserving v1 history.
   - Rejection of edits to approved versions.
   - Validation failure on missing fields or negative budgets.
3. Run `npm test` and verify 100% test passing rate.

---

## 8. Open Decisions for Review Sign-Off

Before commencing Stage 2 code implementation, please confirm your preference on:
1. **Decision Authority:** Should workspace `admin` members have approval rights alongside the assigned `client`? (Recommendation: Strictly assigned client or workspace owner).
2. **Revision Status Lifecycle:** Should new proposal versions immediately enter `pending_approval`, or should an optional `draft` revision state be supported? (Recommendation: Default to `pending_approval`, optional `draft`).
3. **Local Environment Setup:** Confirm local Node.js installation and preferred MongoDB setup (local service vs MongoDB Atlas connection string).
