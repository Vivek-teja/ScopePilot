# ScopePilot – Part 1: Architecture Inspection & Development Preparation Report

**Module:** User & Workspace Management  
**Module Assignee:** Sushant  
**Date:** October 12, 2026  
**Status:** Completed & Ready for Part 2  
**Active Branch:** `feature/workspace`  

---

## 1. Executive Summary

ScopePilot is an AI-powered freelance project management platform designed to combat **scope creep** by formalizing project scopes, proposals, milestones, deliverables, and change requests.

As the developer responsible for **User & Workspace Management**, this module establishes the fundamental organizational and access-control bedrock of the platform. All downstream business modules (Projects, Proposals, Milestones, Change Requests, and AI Scope Analysis) depend on the workspace entity to provide multi-tenant boundaries and user membership context.

---

## 2. Codebase & Directory Structure Analysis

The backend adheres to a clean, modular 3-tier architecture with Express and Mongoose:

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
│   ├── ai/                  # AI agent scaffolding, vector embeddings & prompts
│   ├── utils/               # ApiResponse, ApiError, asyncHandler, and JWT helpers
│   ├── app.js               # Express application configuration
│   ├── routes.js            # Central routing table mounting all modules
│   └── server.js            # Server bootstrapper & MongoDB connector
├── tests/                   # Jest automated test suites
├── .env.example             # Template environment configuration
└── package.json             # Node.js project manifest & scripts
```

---

## 3. Existing User & Authentication System

* **Model Location:** `backend/src/modules/auth/auth.model.js`
  * The `User` model includes: `name`, `email` (unique, lowercase), `passwordHash` (hidden with `select: false`), `role` (`freelancer`, `client`, `admin`), `profileSlug`, and `isActive`.
  * Helper methods: `comparePassword` (bcrypt comparison) and static `hashPassword`.
* **Authentication Guard:** `backend/src/middleware/auth.middleware.js`
  * Exports `requireAuth`: Validates incoming Bearer JWT tokens, fetches the authenticated user from MongoDB, and attaches them to `req.user`.
  * Exports `requireRole`: Enforces system-level role access.
* **Coordination Rule:** Sushant **must not** recreate or duplicate user registration or login logic. Workspace logic consumes `req.user` provided by Nikhil's middleware and references `User` via Mongoose ObjectIds (`ref: 'User'`).

---

## 4. Audited Workspace Module Files

The workspace module follows the team's standard 6-file convention:

1. **`workspace.constants.js`**
   * Workspace Roles: `owner`, `admin`, `member`, `client`.
   * Invitation Statuses: `pending`, `accepted`, `declined`, `expired`.
2. **`workspace.model.js`**
   * Workspace Schema: `name`, `slug`, `owner` (ref: `User`), embedded `members` array (`user`, `role`, `joinedAt`), and embedded `invitations` array (`email`, `role`, `invitedBy`, `status`, `expiresAt`).
   * Compound indexes: `{ 'members.user': 1 }`.
3. **`workspace.validation.js`**
   * Zod schemas: `workspaceIdParamSchema`, `createWorkspaceSchema`, and `createInvitationSchema`.
4. **`workspace.controller.js`**
   * Controllers: `createWorkspace`, `getWorkspaceById`, `inviteMember`, `getWorkspaceMembers`.
   * Formatted using `ApiResponse` envelopes.
5. **`workspace.service.js`**
   * Business logic for workspace creation, retrieval with authorization checks, invitation dispatch with duplicate check, and member listing.
6. **`workspace.routes.js`**
   * Mounted at `/api/workspaces` in `backend/src/routes.js`.
   * All endpoints protected by `requireAuth` and validated with `validate.middleware.js`.

---

## 5. Scope & Boundary Matrix

| In Scope (Sushant's Responsibility) | Out of Scope (Teammates' Modules) |
| :--- | :--- |
| Workspace creation with owner auto-assignment | User registration, login & bcrypt hashing (Nikhil) |
| Workspace lookup with membership access verification | Project creation, status & proposals (Abhtej) |
| Workspace membership tracking & duplicate prevention | Milestones & deliverables tracking (Mounish) |
| Member listing for collaboration views | Change request scope impact analysis (Mokshagna) |
| Workspace invitation creation & expiration tracking | AI agents, RAG, Ollama vector search (`src/ai`) |
| Workspace authorization helper logic | Frontend client UI components & forms (Taran) |

---

## 6. How Downstream Modules Depend on Workspaces

1. **Project Module (`backend/src/modules/project/project.model.js`):**
   * Every project requires a parent workspace: `workspace: { type: ObjectId, ref: 'Workspace', required: true }`.
2. **Proposals, Milestones & Change Requests:**
   * These sub-entities are scoped under projects, inheriting workspace authorization boundaries.
3. **Frontend Integration:**
   * Taran's UI requires `/api/workspaces` for workspace switcher dropdowns and `/api/workspaces/:id/members` for member invitation modals.

---

## 7. Preparation Work Completed

The following safe preparation tasks were executed:

1. **Git Feature Branch:**
   * Created and checked out a dedicated feature branch: `feature/workspace`.
   * Ensures all ongoing work remains isolated from `main`.
2. **Dependency Resolution:**
   * Installed backend packages via `npm install` (399 packages installed).
3. **Environment Configuration:**
   * Created `backend/.env` from `backend/.env.example`.
4. **Base Test Suite Verification:**
   * Ran `npm test` across baseline test suites (all 13 existing unit/contract tests passed).
5. **Module Verification:**
   * Verified syntax and runtime module resolution across all 6 workspace module files without errors.

---

## 8. Missing Prerequisites & Next Steps for Part 2

Before starting Part 2 development:
* **MongoDB Daemon:** Ensure MongoDB is running on port 27017 or a MongoDB Atlas URI is added to `backend/.env`.
* **Workspace Integration Tests:** Create `backend/tests/workspace.test.js` to systematically verify endpoint responses and access-control error handling.

---

## 9. Sign-off & Confirmation

* **Part 1 Objectives:** 100% Complete.
* **Architecture Verified:** Yes.
* **Working Tree Clean & Branch Isolated:** Yes (`feature/workspace`).
* **Ready for Part 2 Implementation:** Yes.
