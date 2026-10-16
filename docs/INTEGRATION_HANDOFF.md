# ScopePilot — Part 3 Integration & Change-Awareness Handoff

> **Document Status:** Active Integration Handoff
> **Target Branch:** `main` (synchronized through commit `53fa71c`)
> **Current Test Baseline [VERIFIED]:** 304 / 304 backend tests passing across 13 test suites, 5 / 5 AI mock cases passing, clean Vite client build

---

## 1. Document Purpose & Evidence Standards

This document is **not** a task-allocation specification, and it does not reassign or re-explain scheduled tasks. Each teammate already knows their assigned responsibilities and domain roadmap.

The sole purpose of this document is **integration change-awareness**: to prevent team members and their AI coding assistants from inadvertently overwriting, duplicating, weakening, or regressing the critical security controls, authorization boundaries, data models, and versioning logic that were recently integrated into the `main` branch.

### Evidence Classification Key
Every factual claim in this handoff is classified under one of four strict epistemic statuses:
- **`[VERIFIED]`**: Directly confirmed by current source code, Git commit history, live test execution, or explicit project documentation.
- **`[INFERRED]`**: A logical architectural interpretation that has not been explicitly declared in project documentation.
- **`[UNKNOWN]`**: Information that the repository records do not establish and that requires confirmation from the team lead.
- **`[REPORTED, NOT VERIFIED]`**: A claim from an external tool, prior session, or earlier summary that has not been independently reproduced.

### Recent Hardening Integrated into `main` [VERIFIED]
Between the initial milestone deliverables and the current `main` branch, the following updates were implemented, verified, and merged:
- **Change Request Authorization Hardening (`d66958f`) [VERIFIED]:** Tenancy checks, client-only decisions, requester self-approval prevention, and foreign key verification (36 tests).
- **Auth & Workspace Test Suites (`9b3cd55`) [VERIFIED]:** Dedicated automated integration test coverage across stateless JWT and multi-tenant workspace boundaries (56 tests).
- **Workspace Client Invitation Guard (`2f1d02c`) [VERIFIED]:** Restricting client-role invitations exclusively to workspace owners.
- **Proposal Authorization & Freeze Security (`b5cdc6a`) [VERIFIED]:** Scoped project access, freelancer self-approval prevention, and approval freezing (40 tests).
- **Proposal Versioning Engine (v2+) (`5019cc8`) [VERIFIED]:** Immutable approved versions, atomic state transitions, superseding logic, rejected-version protections, and concurrency guards (expanded to 67 tests).
- **Documentation Realignment (`53fa71c`) [VERIFIED]:** Synchronizing architecture documents with the hardened code.

Any feature branch branched from an earlier commit **will cause merge conflicts or silent authorization regressions** unless the teammate's AI coding assistant explicitly accounts for these changes before writing code.

---

### Teammate Ownership & Workstream Mapping

The repository documentation establishes a **10-person project roster** with individual module responsibilities (`README.md:50-68`, `docs/MEMORY.md:5-19`). For the upcoming Part 3 integration, tasks converge across **five functional workstreams**.

| Team Member | Documented Responsibility | Evidence Status & Source Citations | Workstream Mapping |
| :--- | :--- | :--- | :--- |
| **Abhtej** | Project & Proposal Management | **[VERIFIED]** `README.md:59`, `docs/MEMORY.md:12`, `docs/TASKS.md:12`, `PART1_PROJECT_PROPOSAL_REPORT.md:4` | **Workstream 1** (Project & Proposal) |
| **Mokshagna** | Change Request Management | **[VERIFIED]** `README.md:61`, `docs/MEMORY.md:14`, `docs/TASKS.md:49`, `PART3_MILESTONE_DELIVERABLE_REPORT.md:179` | **Workstream 2** (Change Requests) |
| **Sushant** | Workspace & Membership | **[VERIFIED]** `README.md:58`, `docs/MEMORY.md:11`, `docs/TASKS.md:11`, `PART1_REPORT.md:4` | **Workstream 3** (Workspace & Identity) |
| **Nikhil** | Authentication & Security Middleware | **[VERIFIED]** `README.md:57`, `docs/MEMORY.md:10`, `docs/TASKS.md:10` | **Workstream 3** (Workspace & Identity) |
| **Taran** | Frontend UI (React SPA) | **[VERIFIED]** `README.md:65`, `docs/MEMORY.md:16`, `docs/TASKS.md:15`, `PART3_MILESTONE_DELIVERABLE_REPORT.md:169` | **Workstream 4** (Frontend UI) |
| **Vivek** | Backend Foundation & Shared Architecture | **[VERIFIED]** `README.md:56`, `docs/MEMORY.md:9`, `docs/TASKS.md:9`, `PART3_MILESTONE_DELIVERABLE_REPORT.md:186` | **Workstream 5** (Architecture & Routing) |
| **Bharat** | QA & Automated Testing | **[VERIFIED]** `README.md:67`, `docs/MEMORY.md:18`, `PART3_MILESTONE_DELIVERABLE_REPORT.md:169` | **Workstream 5** (QA & Testing) |
| **Vishal** | AI / RAG / Agent Subsystem | **[VERIFIED]** `README.md:52`, `docs/MEMORY.md:15`, `docs/TASKS.md:14`, `Review_2_Report_Vishal_AI_Agent.html` | Supporting Workstream 5 (AI Subsystem) |
| **Mounish** | Milestones & Deliverables | **[VERIFIED]** `README.md:60`, `docs/MEMORY.md:13`, `docs/TASKS.md:13`, `PART3_MILESTONE_DELIVERABLE_REPORT.md:1` | Supporting Workstream 5 (Milestones) |
| **Shivasainithin**| Git Integration & Merging | **[VERIFIED]** `README.md:52,66`, `docs/MEMORY.md:17`, `docs/TASKS.md:16` | Git Lifecycle & Quality Gates |

> [!NOTE]
> **Roster & Workstream Distinctions:**
> - **[VERIFIED]:** The 10 team member roles and module boundaries are verified in `README.md` and `docs/MEMORY.md`.
> - **[VERIFIED]:** The Part 3 Milestone Deliverables handoff package (`PART3_MILESTONE_DELIVERABLE_REPORT.md:14`) specifically addresses five collaborating roles: Taran (Frontend), Bharat (QA), Mokshagna (Change Requests), Abhtej (Project/Proposal), and Vivek (Team Lead).
> - **[INFERRED]:** Grouping Sushant & Nikhil under Workstream 3 (Workspace & Identity) and Vivek, Bharat, Vishal & Mounish under Workstream 5 (Foundation, QA & Subsystems) is an architectural inference to organize shared backend boundaries into five distinct tracks.
> - **[UNKNOWN]:** Whether student assignments for Part 3 are strictly divided among 5 active individuals or all 10 roster members is not explicitly declared in Git records and requires confirmation from Vivek (Lead).

---

## 2. Reusable AI Coding Assistant Prompt

Each teammate should copy and paste the following instruction block directly into their AI coding assistant (ChatGPT, Claude, Gemini, Copilot, Cursor, etc.) at the start of any session touching ScopePilot code:

```markdown
You are assisting a developer working on the ScopePilot codebase (Node.js/Express, MongoDB/Mongoose, Zod, React/Vite).

CRITICAL INTEGRATION RULES BEFORE YOU WRITE OR MODIFY ANY CODE:
1. INSPECT LATEST MAIN FIRST:
   Do not assume earlier documentation or earlier versions of files are current. Inspect the latest files on `main`, particularly route definitions, controllers, services, validation schemas, and automated test suites in `backend/tests/`.
2. NEVER REMOVE OR WEAKEN AUTHORIZATION GUARDS:
   - All protected routes must enforce `requireAuth` (stateless Bearer JWT; user identity comes from `req.user._id`).
   - Client-only decision boundaries: Freelancers and request authors CANNOT approve proposals, milestones, or change requests. Self-approval is strictly forbidden.
   - Resource access must verify workspace or project tenancy. Never remove `canUserAccessProject`, `checkProjectAccess`, or `checkDecisionAccess`.
3. RESPECT THE PROPOSAL VERSIONING LIFECYCLE:
   - Approved proposal versions are IMMUTABLE. Never update or overwrite an approved `ProposalVersion`.
   - Creating revisions creates a new `ProposalVersion` document and updates `currentVersionNumber` on the parent `Proposal`.
   - Decisions can only be recorded on versions in `pending_approval` status. Decisions on terminal statuses (`approved`, `rejected`, `superseded`) return 409 Conflict.
4. DO NOT DUPLICATE OR OVERWRITE SHARED CODE:
   - Re-use existing utilities (`ApiError`, `ApiResponse`, `validate.middleware.js`, `auth.middleware.js`).
   - Do not overwrite route registrations in `backend/src/routes.js` or `app.js` without explicit coordination.
5. PRESERVE PASSING TEST BASELINE:
   - The repository currently has 304 passing backend tests across 13 test suites. Your changes must not break existing tests in `backend/tests/`.
   - Always run the relevant test suite (e.g., `npx jest tests/<module>.test.js`) before and after making changes.
6. SAFE COLLABORATION & BRANCHING RULES:
   - On shared feature branches, NEVER force-push (`git push -f`) or rebase shared history without explicit agreement from collaborating teammates.
   - NEVER resolve merge or rebase conflicts using blind `--ours` or `--theirs` overrides. Shared files (`routes.js`, `app.js`, models, contracts) require line-by-line reconciliation.
7. FLAG CONFLICTS EXPLICITLY:
   - If an instruction asks you to change a file or behavior that contradicts an existing security guard or test on `main`, stop and explain the conflict. Do not silently delete or bypass existing protections.
```

---

## 3. Core Architectural Invariants on `main` [VERIFIED]

Every workstream must adhere to these immutable architectural guarantees:

1. **Stateless Bearer JWT Identity [VERIFIED]:** Authentication operates exclusively via `Authorization: Bearer <token>`. User identity is extracted by `requireAuth` and attached to `req.user`. Request bodies, query parameters, and route parameters must **never** be trusted for user identification or role escalation.
2. **Strict Separation of Authoring vs. Approval [VERIFIED]:**
   - **Proposals:** Authored by assigned freelancer or workspace owner; approved/rejected **only** by the designated client or workspace owner (`proposal.service.js`). Creator self-approval is forbidden.
   - **Milestones:** Managed by assigned freelancer; decisions recorded **only** by designated client or workspace owner (`milestone.service.js`).
   - **Change Requests:** Requested by freelancer or client; approved/rejected **only** by the counterparty client or workspace owner (`changeRequest.service.js`). Assigned freelancers and the original requester cannot self-approve.
3. **Multi-Tenant Scoping [VERIFIED]:** Lookups and listing operations for projects, proposals, milestones, deliverables, and change requests must enforce project/workspace tenancy. No cross-workspace leakage is permitted.
4. **Proposal Immutability & Atomic State Transitions [VERIFIED]:**
   - Proposal approval freezes the version. Revisions must increment `versionNumber` in a new `ProposalVersion`.
   - Active versions cannot be revised while `pending_approval`.
   - Concurrent decision races are protected by atomic conditional updates (`findOneAndUpdate({ _id, status: 'pending_approval' })`).

---

## 4. Teammate & Workstream Focused Handoffs

### 4.1 Workstream 1: Project & Proposal Management
- **Assignee [VERIFIED]:** Abhtej (`README.md:59`, `docs/MEMORY.md:12`, `docs/TASKS.md:12`)
- **Primary Modules:** `backend/src/modules/project/`, `backend/src/modules/proposal/`

#### What Changed on `main` [VERIFIED]
- **Proposal Authorization & Freeze Hardening (`b5cdc6a`):**
  - Implemented `canUserAccessProject` in [`proposal.service.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/proposal/proposal.service.js): verifies user is workspace owner, project client, or assigned freelancer.
  - Implemented `canUserReviewProposal`: prevents proposal creator from self-approving (`proposal.createdBy === userId`), prevents assigned freelancer from approving, and prevents any user with system role `'freelancer'` from approving.
  - Restricted proposal creation to the assigned freelancer or workspace owner.
  - Added 40 dedicated authorization tests in [`backend/tests/proposal.test.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/tests/proposal.test.js).
- **Proposal Versioning Engine (v2+) (`5019cc8`):**
  - Added routes: `POST /api/proposals/:id/versions` (`createVersion`) and `GET /api/proposals/:id/versions/:versionNumber` (`getVersionByNumber`) in [`proposal.routes.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/proposal/proposal.routes.js).
  - Added Zod schemas: `createProposalVersionSchema` and `proposalVersionParamSchema` in [`proposal.validation.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/proposal/proposal.validation.js).
  - Added status `SUPERSEDED: 'superseded'` in [`proposal.constants.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/proposal/proposal.constants.js).
  - Added compound unique index `{ proposal: 1, versionNumber: 1 }` on `ProposalVersion` in [`proposal.model.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/proposal/proposal.model.js).
  - Implemented revision creation rules: returns `409 Conflict` if the active version is currently `pending_approval`.
  - Implemented atomic conditional update for decisions: decisions on terminal versions (`approved`, `rejected`, `superseded`) return `409 Conflict`.
  - Added targeted orphan cleanup and conditional parent claim logic to handle concurrent version creation attempts.
  - Expanded test suite to **67 automated tests** in `proposal.test.js` (40 authorization + 27 versioning/concurrency tests).

#### Why It Changed [VERIFIED]
- Prevented unauthorized freelancers and malicious actors from approving their own proposals or viewing proposals across unassociated workspaces.
- Satisfied Task 4.2 requirements for multi-version proposal revision without overwriting previously approved contractual scope baselines.
- Eliminated database race conditions during concurrent decision submissions.

#### Potential Collision Points
- `backend/src/modules/proposal/proposal.service.js`: Any changes to `recordDecision`, `createProposal`, `createVersion`, or helper functions (`canUserAccessProject`, `canUserReviewProposal`) will conflict with recent security logic.
- `backend/src/modules/proposal/proposal.routes.js`: Version routes (`/:id/versions` and `/:id/versions/:versionNumber`) are already mounted and protected.
- `backend/src/modules/project/project.service.js`: `getProjectById` and `listProjects` populate `currentApprovedProposal`. Modifying project access helpers will affect proposal resolution.

#### Must Preserve
- Self-approval prohibition: Creators and freelancers must never be allowed to approve proposals.
- Immutability of approved versions: An approved version must never be overwritten, modified, or transitioned back to draft/pending.
- Concurrency protections: Conditional atomic updates in `recordDecision` and orphan cleanup in `createVersion`.
- 409 Conflict response on attempts to revise a version that is currently `pending_approval`.

#### Before Modifying Code
- Inspect [`backend/src/modules/proposal/proposal.service.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/proposal/proposal.service.js#L240-L360) and [`backend/src/modules/proposal/proposal.validation.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/proposal/proposal.validation.js).
- Review all 67 tests in [`backend/tests/proposal.test.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/tests/proposal.test.js) to understand expected HTTP response codes and error payloads.

#### Before Merging
- Run: `npx jest tests/proposal.test.js tests/project.test.js` (must pass 86/86 tests: 67 proposal, 19 project) [VERIFIED].
- Verify that `POST /api/proposals/:id/versions` correctly validates deliverable items and pricing.

#### Coordination Required
- If changes modify `project.currentApprovedProposal`, coordinate with Mounish (Milestones) and Mokshagna (Change Requests) because downstream scope comparisons rely on this exact reference.

---

### 4.2 Workstream 2: Change Request Management
- **Assignee [VERIFIED]:** Mokshagna (`README.md:61`, `docs/MEMORY.md:14`, `docs/TASKS.md:49`)
- **Primary Module:** `backend/src/modules/changeRequest/`

#### What Changed on `main` [VERIFIED]
- **Change Request Authorization & Tenancy Hardening (`d66958f`):**
  - Replaced unauthenticated/unscoped handlers with strict RBAC in [`changeRequest.service.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/changeRequest/changeRequest.service.js).
  - Added `checkProjectAccess`: restricts change request creation and lookup (`GET /:id`) to users belonging to the project (assigned freelancer, client, workspace owner/member).
  - Added `checkDecisionAccess`: forbids the assigned freelancer from recording decisions, forbids any user with role `'freelancer'`, and strictly forbids requester self-approval (`requesterId === userId`). Only the client, workspace owner/admin, or system admin can record decisions.
  - Foreign key referential integrity: `affectedMilestones` and `relatedDeliverables` are validated against the database to confirm they exist and belong to the project.
  - Added compound indexes `{ project: 1, status: 1 }` and `{ project: 1, createdAt: -1 }` in [`changeRequest.model.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/changeRequest/changeRequest.model.js).
  - Added **36 automated integration tests** in [`backend/tests/changeRequest.test.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/tests/changeRequest.test.js).

#### Why It Changed [VERIFIED]
- Resolved an active critical security flaw where freelancers could self-approve their own price and timeline increases without client consent.
- Prevented cross-tenant IDOR where users could read or decide change requests from unrelated workspaces.
- Ensured referential integrity between change requests and child milestones/deliverables.

#### Potential Collision Points
- `backend/src/modules/changeRequest/changeRequest.service.js`: Any implementation of `listChangeRequests` (Task 5.1) or impact calculation must be built on top of the existing `checkProjectAccess` helper rather than rewriting it.
- `backend/src/modules/changeRequest/changeRequest.routes.js`: When adding `router.get('/', ...)` for project-scoped listing, do not disturb the existing `router.use(requireAuth)` or the `/:id/decision` route guards.
- `backend/src/modules/changeRequest/changeRequest.validation.js`: New query schemas must validate `projectId` with ObjectId format `/^[0-9a-fA-F]{24}$/`.

#### Must Preserve
- `checkDecisionAccess` logic: Freelancers and requesters must never be allowed to approve change requests.
- Strict project scoping: Change requests must always be bound to a valid `project`.
- Validation of `affectedMilestones` and `relatedDeliverables`.

#### Before Modifying Code
- Inspect [`backend/src/modules/changeRequest/changeRequest.service.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/changeRequest/changeRequest.service.js#L50-L95).
- Review all 36 test cases in [`backend/tests/changeRequest.test.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/tests/changeRequest.test.js).

#### Before Merging
- Run: `npx jest tests/changeRequest.test.js` (must pass 36/36 tests) [VERIFIED].
- If implementing `GET /api/change-requests`, verify that queries require `projectId` and return 403 Forbidden for unauthorized users.

#### Coordination Required
- Coordinate with Vishal (AI Subsystem) regarding the structure of change request descriptions and impact fields, as the AI analysis engine consumes these payloads for scope comparison.
- Coordinate with Bharat (QA) who collaborates on Change Request test coverage (Task 5.2).

---

### 4.3 Workstream 3: Workspace, Membership & Invitations
- **Assignees [VERIFIED]:** Sushant (Workspace & Membership; `README.md:58`, `docs/MEMORY.md:11`) & Nikhil (Auth & Security; `README.md:57`, `docs/MEMORY.md:10`)
- **Primary Modules:** `backend/src/modules/workspace/`, `backend/src/modules/auth/`

#### What Changed on `main` [VERIFIED]
- **Auth & Workspace Test Suites (`9b3cd55`):**
  - Added [`backend/tests/auth.test.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/tests/auth.test.js) (27 tests covering registration, login, profile retrieval, password hashing, JWT signing/verifying, `requireAuth`, `requireRole`, and `optionalAuth`).
  - Added [`backend/tests/workspace.test.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/tests/workspace.test.js) (29 tests covering workspace creation, membership retrieval, tenancy boundaries, and invitation flows).
- **Workspace Client Invitation Guard (`2f1d02c`):**
  - Updated [`workspace.service.js#L98-L103`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/workspace/workspace.service.js#L98-L103): Enforced that workspace admins can invite regular members, but **only workspace owners** can invite users with the `client` role (`if (!isOwner && role === WORKSPACE_ROLES.CLIENT) throw ApiError.forbidden(...)`).
  - Added duplicate invitation guard: prevents creating duplicate pending invitations for the same email.

#### Why It Changed [VERIFIED]
- Closed a multi-tenancy vulnerability where non-owner workspace administrators could attach unauthorized client accounts to a workspace.
- Provided 100% automated test coverage for previously untested authentication and workspace modules.

#### Potential Collision Points
- `backend/src/modules/workspace/workspace.service.js`: Any changes to `inviteMember`, `getWorkspaceById`, or `createWorkspace` must maintain the owner-only client invitation check.
- `backend/src/modules/auth/auth.service.js`: When adding user profile updates or password resets, do not change the JWT payload structure (`{ id, email, role }`) as all downstream modules depend on these claims.
- `backend/src/middleware/auth.middleware.js`: Do not modify how `req.user` is populated.

#### Must Preserve
- Owner-only client invitation restriction in `workspace.service.js`.
- Tenancy checks in `getWorkspaceById` (only owner and verified members have access).
- JWT generation claims format in `jwt.js` and `auth.service.js`.

#### Before Modifying Code
- Inspect [`backend/src/modules/workspace/workspace.service.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/modules/workspace/workspace.service.js#L80-L125).
- Run and review the 56 tests across `auth.test.js` (27 tests) and `workspace.test.js` (29 tests).

#### Before Merging
- Run: `npx jest tests/auth.test.js tests/workspace.test.js` (must pass 56/56 tests) [VERIFIED].

#### Coordination Required
- Coordinate with Vivek before modifying any security middleware in `backend/src/middleware/auth.middleware.js`.

---

### 4.4 Workstream 4: Frontend UI & Client Integration
- **Assignee [VERIFIED]:** Taran (`README.md:65`, `docs/MEMORY.md:16`, `docs/TASKS.md:15`)
- **Primary Module:** `client/` (React SPA)

#### What Changed on `main` [VERIFIED]
- **Backend APIs are Live, Protected, and Enforce Strict RBAC:**
  - The Express backend now has **304 passing tests across 13 test suites** and fully functional endpoints for Auth, Workspaces, Projects, Proposals (including v2+ versioning), Milestones, Deliverables, and Change Requests.
  - **Proposal Versioning Endpoints:**
    - `POST /api/proposals/:id/versions` (payload: `{ title, scopeItems, deliverables, totalBudget, currency, pricingModel }`)
    - `GET /api/proposals/:id/versions/:versionNumber`
    - `POST /api/proposals/:id/decision` (payload: `{ decision: "approve" | "reject", comment }`)
  - **Change Request Decision Guards:** Decisions submitted by freelancers will receive `403 Forbidden`. The UI must disable approval/rejection buttons when the current user is a freelancer or the requester.
  - **Workspace Client Invitations:** Only workspace owners can invite users with the `client` role. The invitation modal must reflect this restriction.
  - **Milestone Decisions:** Client-only; milestone decisions do not cascade to child deliverables.

#### Why It Changed [VERIFIED]
- The backend moved from a partial prototype to an enterprise-hardened, multi-tenant API. The frontend migration from `demoStore.js` to live Express API calls (Task 10.1) must align with these live backend contracts.

#### Potential Collision Points
- `client/src/services/scopePilotService.js`: When replacing simulated mock storage with `fetch` / `axios` calls, ensure every request includes `Authorization: Bearer <token>`.
- Client-side error handling: Backend returns standardized error envelopes (`{ success: false, message: string, errors?: Array<{ field, message }> }`).
- Proposal Detail View: Needs to support viewing historical versions (`v1`, `v2`) and display badges for `pending_approval`, `approved`, `rejected`, and `superseded`.
- Concurrency responses: UI must gracefully handle `409 Conflict` if a user attempts to decide a proposal or create a revision that is in a conflicting state.

#### Must Preserve
- Clean Vite build (`npm run build` in `client/` must produce zero errors).
- Fast loading and responsive UI state.
- Role-aware component rendering (e.g., Client view vs. Freelancer view).

#### Before Modifying Code
- Inspect the live backend routes in [`backend/src/routes.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/routes.js) and the respective `*.validation.js` files to ensure payload schemas match exactly.
- Verify running backend locally via `npm run dev` in `backend/` on port 5000.

#### Before Merging
- Run `npm run build` in `client/` (must succeed with 0 errors) [VERIFIED].
- Verify that authentication tokens are stored securely in memory / local storage and attached to the `Authorization` header.

#### Coordination Required
- Coordinate with Abhtej on proposal versioning payload structures and with Mokshagna on change request query parameter formats.

---

### 4.5 Workstream 5: System Architecture, Shared Routing & Quality Assurance
- **Assignees [VERIFIED]:** Vivek (Team Lead & Foundation; `README.md:56`, `docs/MEMORY.md:9`) & Bharat (QA & Automated Testing; `README.md:67`, `docs/MEMORY.md:18`)
- *(Supporting Modules: Vishal on AI Subsystem, Mounish on Milestones/Deliverables)*

#### What Changed on `main` [VERIFIED]
- **Route Mounting Expansion (`5019cc8`):**
  - Versioning routes mounted under `backend/src/modules/proposal/proposal.routes.js`.
- **Verified Test Suite Expansion (304 Passing Tests across 13 Suites) [VERIFIED]:**
  - `tests/proposal.test.js`: **67 tests** (auth, tenancy, decisions, versioning v2+, concurrency)
  - `tests/milestoneDeliverable.api.test.js`: **57 tests** (milestone and deliverable lifecycle, query scoping)
  - `tests/milestoneDeliverable.model.test.js`: **40 tests** (schema definitions, relationships, Zod validation)
  - `tests/changeRequest.test.js`: **36 tests** (tenancy, RBAC, decision security, foreign key verification)
  - `tests/workspace.test.js`: **29 tests** (tenancy, invitations, roles, owner client invite guard)
  - `tests/auth.test.js`: **27 tests** (tokens, hashing, profile, middleware guards)
  - `tests/project.test.js`: **19 tests** (project workspace boundaries, membership authorization)
  - `tests/ai.contracts.test.js`: **10 tests** (Zod input/output contracts)
  - `tests/ai.routes.test.js`: **9 tests** (REST endpoints under `/api/ai/*`)
  - `tests/ai.mockCases.test.js`: **7 tests** (5 canonical review scenarios, determinism)
  - Core framework tests: `health.test.js` (1 test), `notFound.test.js` (1 test), `validation.test.js` (1 test)
- **AI Subsystem Verification [VERIFIED]:**
  - 5 canonical review scenarios in `backend/src/ai/fixtures/changeAnalysisFixtures.js` passing deterministically (`npm run mock:cases`).

#### Why It Changed [VERIFIED]
- Strengthened backend reliability and established strict pre-merge regression barriers across all integrated modules.

#### Potential Collision Points
- `backend/src/routes.js`: Central router must not have duplicate prefixes or unauthenticated paths.
- `backend/src/app.js`: Global middleware order (`helmet > cors > morgan > json > routes > error`) must remain intact.
- `backend/tests/`: Any refactoring that changes HTTP response status codes (e.g. from 403 to 401 or 400 to 409) will break existing assertions.

#### Must Preserve
- Centralized error response format produced by [`error.middleware.js`](file:///c:/Users/Shivasainithin/OneDrive/Documents/GitHub/ScopePilot/backend/src/middleware/error.middleware.js).
- Global 304-test passing baseline across all 13 suites.
- Linear Git history and fast-forward merge policy (`git merge --ff-only`).

#### Before Modifying Code
- Run the full suite: `npm test` in `backend/` to verify baseline health before applying changes.
- Check `backend/src/config/env.js` before introducing new environment configuration variables.

#### Before Merging
- Run:
  1. `npm test` in `backend/` (all 304 tests must pass) [VERIFIED].
  2. `npm run mock:cases` in `backend/` (all 5 cases must pass) [VERIFIED].
  3. `npm run build` in `client/` (clean compilation) [VERIFIED].
  4. `git diff --check` (zero trailing whitespace errors) [VERIFIED].

#### Coordination Required
- All merges to `main` must be approved by Vivek (Lead) and verified by Shivasainithin (Git Integration).

---

## 5. Security Status: Implemented Fixes vs. Unresolved Audit Findings

> [!IMPORTANT]
> **Strict Security Distinction:**
> Do not confuse hardened code on `main` with outstanding backlog findings identified during the security audit.
> Every issue below is tagged with its verified status in the current codebase.

| Security Area | Precise Security Status | Current Code Reality | Required Developer Action |
| :--- | :--- | :--- | :--- |
| **Proposal RBAC & Freeze** | **Already fixed and verified** (`b5cdc6a`, `5019cc8`) | Creators cannot approve; versions freeze upon approval; decision races handled atomically. | **PRESERVE.** Do not weaken or bypass. |
| **Proposal Versioning (v2+)** | **Already fixed and verified** (`5019cc8`) | Revisions create new versions; approved versions immutable; 409 Conflict on pending revisions. | **PRESERVE.** Build UI against existing endpoints. |
| **Change Request RBAC** | **Already fixed and verified** (`d66958f`) | Freelancer self-approval blocked; workspace/project tenancy enforced; foreign keys validated. | **PRESERVE.** Do not allow freelancers to approve. |
| **Workspace Client Invitations** | **Already fixed and verified** (`2f1d02c`) | Restricted strictly to workspace owners. Admins can only invite regular members. | **PRESERVE.** Reflect in workspace invitation UI. |
| **Milestone Client Decisions** | **Already fixed and verified** (`26f646d`) | Restricted strictly to clients and workspace owners. Does not cascade to deliverables. | **PRESERVE.** Maintain non-cascading deliverable state. |
| **Rate Limiting on Auth/API** | **Still unresolved (Confirmed absent)** | Express currently has **no rate limiting** installed (`FAIL`). Login and register are vulnerable to brute-force. | **DO NOT ASSUME ACTIVE.** Treat as pending security backlog. |
| **Registration Role Guard** | **Still unresolved (Confirmed in code)** | `auth.validation.js#L8` allows `role: 'admin'` in schema (`PARTIAL`). Public registration permits admin escalation. | **DO NOT ASSUME SECURED.** Restricting registration roles is pending. |
| **AI Route Authentication** | **Still unresolved (Confirmed in code)** | `/api/ai/*` routes mount `optionalAuth` (`PARTIAL`). AI endpoints are publicly callable without credentials. | **DO NOT ASSUME PROTECTED.** Enforcing `requireAuth` is pending. |
| **Strict CORS Origin Whitelist** | **Still unresolved (Confirmed in code)** | `CORS_ORIGIN` defaults to `'*'` in `env.js#L20` (`PARTIAL`). Wildcard origin active if unconfigured. | **DO NOT ASSUME RESTRICTED.** Explicit origin whitelist is pending. |
| **Admin Audit Logging Model** | **Still unresolved (Confirmed absent)** | No `AuditLog` collection or persistent trail exists in code (`FAIL`). | **DO NOT QUERY AUDIT COLLECTION.** Audit models do not yet exist. |

---

## 6. Integration & Pre-Merge Verification Checklist

### Safe Branching & Collaboration Guidelines [VERIFIED]
- **Individual/Private Feature Branches:** You may safely rebase your local commits onto `origin/main` before requesting a merge (`git fetch origin main`, `git rebase origin/main`).
- **Shared Collaborative Branches:** If two or more teammates collaborate on the same remote branch, **NEVER force-push (`git push -f`) and NEVER rebase public shared history**, as this will overwrite your teammate's commits. Use `git pull --rebase` locally and coordinate pushes.
- **Conflict Resolution:** Never use blind `git checkout --ours` or `git checkout --theirs` overrides. Resolve conflicts in shared files (`routes.js`, `app.js`, models, contracts) line-by-line with the respective module owner.
- **Linear Main Branch:** Merges into `main` are fast-forward only (`git merge --ff-only`) executed or approved by Vivek and Shivasainithin.

### Pre-Merge Step-by-Step Commands
```powershell
# 1. Fetch latest changes from main
git fetch origin main

# 2. For private feature branches: synchronize with main
git rebase origin/main

# 3. Run the complete backend automated test suite
cd backend
npm test
# Verify: 304 passed, 304 total across 13 test suites

# 4. Run the AI deterministic mock verification runner
npm run mock:cases
# Verify: 5 / 5 canonical review scenarios passing

# 5. Verify the frontend production build
cd ../client
npm run build
# Verify: Clean Vite build with zero compilation errors

# 6. Verify zero Git diff whitespace errors
cd ..
git diff --check origin/main

# 7. Verify only your assigned module files are modified
git status --short
```

If any test fails, resolve the conflict locally without modifying or disabling existing security checks. If a conflict involves shared routing (`routes.js`), central middleware (`auth.middleware.js`), or another teammate's service, immediately contact the respective assignee and the team lead before proceeding.
