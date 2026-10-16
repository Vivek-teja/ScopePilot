# ScopePilot
ScopePilot is an AI-powered freelance project management platform designed to manage project scope, proposals, milestones, deliverables, and change requests. It helps freelancers and clients track the agreed scope and identify the impact of new requests before they are approved, reducing scope creep and improving project transparency.

*Architecture, ownership and first-milestone plan for the 10-person team*

This is the first planning output required by Section 24 of the master prompt (items A to N). It fixes the architecture, shared contracts and ownership boundaries before large-scale coding. The stack is unchanged: React, Node.js/Express, MongoDB Atlas with Mongoose, Atlas Vector Search, Ollama, LangChain JavaScript and Zod. No application code is generated here.

**Two decisions to confirm in week 1** (both are required by the brief): (1) pick one embedding model, run it once, and set the Atlas index dimensions to the real output length (proposed: `nomic-embed-text`, 768 dimensions, verify by measuring); (2) pick one local chat model after a quick latency test on the team's hardware.

## A. High-level system architecture

```text
 Browser: React 19 SPA under client/ (Member 10)
   |  HTTP/HTTPS - Authorization: Bearer <token> (Stateless JWT)
   |  (Frontend currently operates on in-browser demoStore.js; live API wire-up scheduled for Review 3)
   v
 Express API under /api (backend/src/app.js)
   middleware order: helmet > cors > morgan > express.json & express.urlencoded
                     > routes (backend/src/routes.js) > notFoundHandler > errorHandler
   routes -> controllers -> services -> Mongoose models
   |
   +-- Business modules (backend/src/modules/)
   |     auth (M2) | workspace + membership (M3) | project + proposal (M4)
   |     milestone + evidence + decisions (M5) | change request + schedule (M6)
   |
   +-- AI subsystem (backend/src/ai/)
   |     Zod contracts (backend/src/contracts/aiAnalysis.contract.js)
   |     Deterministic mock engine & fixtures (M7, M8, M9: 5 canonical cases)
   |     Ollama embeddings + Atlas Vector Search (Review 3 planned)
   |     LangChain agent + tools (Review 3 planned)
   |
   +--> MongoDB (Atlas / Local): collections via Mongoose models
   +--> Ollama (server-side localhost, Review 3): embedding model + chat model
```

Architecture rules and authorization boundaries:

- **Layering:** routes only parse and validate, controllers call services, services hold logic, models hold schema. AI code and fixtures live under `backend/src/ai/`, outside standard routes.
- **One acting user:** identity comes exclusively from the verified Bearer JWT token (`req.user`) populated by `requireAuth`. `role`, `ownerId`, and `workspaceId` are never trusted blindly from unauthenticated request bodies.
- **AI never decides:** prices, approvals, roles and dates are deterministic code plus authenticated human decisions. The AI subsystem only analyzes, compares, and drafts advisory recommendations.
- **Authorization boundaries (Architecture requirements vs. current implementation):**
  - *Target Architecture Requirements:* The target design specifies that all resource access and future vector search queries be strictly scoped to verified workspace and project memberships. When live vector search is implemented in Review 3, tenant filter predicates (`workspaceId`, `projectId`, `status = ready`) must be constructed server-side prior to similarity retrieval.
  - *Current Code Behavior:*
    - **Projects:** Workspace membership is verified upon project creation and listing/retrieval in `project.service.js` (verified in `project.test.js`).
    - **Milestones & Deliverables:** Queries require `projectId` or `milestoneId` scoping parameters (`listMilestonesQuerySchema`), and milestone decisions enforce client-restricted access via `checkDecisionAccess` (verified in `milestoneDeliverable.api.test.js`).
    - **Change Requests (Unresolved Security Defect):** Change request retrieval (`GET /api/change-requests/:id`) and decision recording (`POST /api/change-requests/:id/decision`) do **not** currently verify project or workspace tenancy. Furthermore, `recordDecision` allows freelancers to self-approve their own change requests. This remains an active, unresolved security defect in code.
    - **Vector Search:** Live vector search and vector filters are **not implemented** in the current code (planned for Review 3).
- **Shared contracts:** the shared Zod schema folder (`backend/src/contracts/`) holds state enums, request/response validation schemas, and the AI response contract.

## B. 10-person responsibility matrix

> **Clarification of Roles:** The original project plan partitioned responsibilities into 10 distinct technical areas (1 through 10), with AI split across three separate tracks (7: Ingestion & Vector Search, 8: Scope RAG, 9: AI Agent). In the actual team arrangement, **Vishal** owns the unified AI/RAG/Agent subsystem (`backend/src/ai/`, `backend/src/contracts/`), having delivered Review 1 & 2 (deterministic mock engine & contracts) and leading Review 3 (live RAG & agent). **Shivasainithin** leads Git Integration & Merging (linear history, branch reconciliation, FF merges, merge readiness audits), and **Bharat** leads QA & Testing (test execution, validation coverage, audit verification).

| Area / # | Original Plan Area | Assigned Owner | Primary Directory / Module | Implementation & Audited Test Status |
|---|---|---|---|---|
| 1 | Backend foundation & API architecture | Vivek | `backend/src/server.js`, `app.js`, `routes.js`, error middleware | **Implemented & Verified:** `GET /api/health`, centralized error formatting, Zod env validation active. |
| 2 | Authentication & security | Nikhil | `backend/src/modules/auth/`, security middleware | **Implemented (Untested):** Direct registration, login, Bearer JWT (`jsonwebtoken`), bcrypt hashing. *(0 dedicated automated tests).* |
| 3 | Workspace, membership & multi-tenancy | Sushant | `backend/src/modules/workspace/` | **Implemented (Untested):** Workspace CRUD, multi-tenant boundaries, membership roles (`owner`, `admin`, `member`). *(0 dedicated automated tests).* |
| 4 | Project & proposal management | Abhtej | `backend/src/modules/project/`, `proposal/` | **Partially Implemented:** Project CRUD verified (19 tests); Proposal v1 baseline creation and approval locking active. Superseding v2+ revisions missing; proposal logic has *(0 dedicated tests)*. |
| 5 | Milestones & deliverables | Mounish | `backend/src/modules/milestone/`, `deliverable/` | **Implemented & Verified:** 97 tests across API (57) and model (40) suites; client-only decisions, mandatory project scoping. Milestone decisions do not cascade to child deliverables. |
| 6 | Change requests | Mokshagna | `backend/src/modules/changeRequest/` | **Partial Prototype Stub (Insecure & Untested):** Schema and endpoints exist. Unresolved security defect: freelancers can self-approve in `recordDecision`; lacks tenancy checks; missing listing route; *(0 dedicated tests)*. |
| 7 | Document ingestion & vector search | Vishal *(unified AI track)* | `backend/src/ai/`, Atlas Vector Search | **Review 3 Planned:** Ollama local embeddings (`nomic-embed-text`) and MongoDB Atlas Vector Search. |
| 8 | Scope RAG & semantic comparison | Vishal *(unified AI track)* | `backend/src/ai/`, RAG services | **Review 3 Planned:** Grounded scope Q&A against approved proposals. |
| 9 | LangChain agent & AI tooling | Vishal *(unified AI track)* | `backend/src/ai/`, `contracts/` | **Review 1 & 2 Verified:** 5 canonical deterministic cases, Zod contracts, CLI runner (`npm run mock:cases`), 26 automated tests. Review 3 live agent planned. |
| 10 | React frontend SPA | Taran | `client/` (React 19 SPA) | **Implemented as Standalone Prototype:** Clean Vite build, AppShell, role switcher, views operating on `demoStore.js` (`localStorage`). Live API wiring planned for Review 3. |
| - | Git Integration & Merging | Shivasainithin | Repository Git lifecycle, branch audits | **Active:** Enforcing linear history, fast-forward merges, pre-merge quality gates, branch readiness audits. |
| - | QA & Testing | Bharat | `backend/tests/`, test verification | **Active:** 145/145 passing Jest tests, 5/5 AI mock cases verified, coverage gap tracking. |

Integration points: M2 exports `requireAuth`, `requireRole`; M3 defines workspace boundaries; M5 enforces client-only `checkDecisionAccess` on milestones; Vishal's AI track exports Zod contracts (`aiAnalysis.contract.js`) and the deterministic mock engine.

## C. Database entity-relationship design

```text
User 1---* Membership *---1 Workspace
User 1---* Session (Planned / Legacy)
Workspace 1---* Invitation
Workspace 1---* Project
Project  *---* User  (freelancer, client)

Project 1---* Proposal 1---* ProposalVersion   (status: draft..approved, approved = frozen)
Project 1---* Milestone 1---* Deliverable
Project 1---* ChangeRequest
   ChangeRequest *---1 Project
   ChangeRequest *---* Milestone                (affectedMilestones)
   ChangeRequest *---* Deliverable              (relatedDeliverables)

Review 3 Planned Entities:
Project 1---* Document 1---* DocumentVersion
DocumentVersion 1---* Chunk                      (text, page, section, embedding, workspaceId, projectId)
Project 1---* Conversation 1---* Message         (grounded Q&A citations)
Project 1---* ToolExecution                      (agent run record)
```

## D. API ownership catalog

### Active Mounted Endpoints in Code (`backend/src/routes.js`)

Every active protected route enforces `requireAuth` (stateless Bearer JWT) and Zod schema validation.

| Method | Route | Purpose | Allowed Role / Access | Owner | Audited Code & Test Status |
|---|---|---|---|---|---|
| GET | `/api/health` | Health check endpoint | Public | Vivek (M1) | **Mounted & Verified:** 1 test in `health.test.js` |
| POST | `/api/auth/register` | Register user, returns `{ user, token }` | Public | Nikhil (M2) | **Mounted:** Instant direct registration; *(0 dedicated tests)* |
| POST | `/api/auth/login` | Authenticate credentials, returns `{ user, token }` | Public | Nikhil (M2) | **Mounted:** Validates bcrypt hash; *(0 dedicated tests)* |
| GET | `/api/auth/me` | Fetch authenticated user profile | Authenticated | Nikhil (M2) | **Mounted:** Reads `req.user`; *(0 dedicated tests)* |
| POST | `/api/workspaces` | Create new workspace | Authenticated | Sushant (M3) | **Mounted:** Creates workspace; *(0 dedicated tests)* |
| GET | `/api/workspaces/:id` | Fetch workspace details | Workspace Member | Sushant (M3) | **Mounted:** Reads workspace by ID; *(0 dedicated tests)* |
| POST | `/api/workspaces/:id/invitations` | Invite member to workspace | Owner / Admin | Sushant (M3) | **Mounted:** Creates invitation; *(0 dedicated tests)* |
| GET | `/api/workspaces/:id/members` | List members of workspace | Workspace Member | Sushant (M3) | **Mounted:** Reads workspace members; *(0 dedicated tests)* |
| POST | `/api/projects` | Create project in workspace | Freelancer | Abhtej (M4) | **Mounted & Verified:** Enforces workspace membership; 19 tests in `project.test.js` |
| GET | `/api/projects` | List projects (scoped to workspace) | Workspace Member | Abhtej (M4) | **Mounted & Verified:** Scoped by workspaceId query; 19 tests in `project.test.js` |
| GET | `/api/projects/:id` | Fetch project details | Project Member | Abhtej (M4) | **Mounted & Verified:** Scoped to freelancer/client; 19 tests in `project.test.js` |
| POST | `/api/proposals` | Create proposal baseline (v1) | Freelancer | Abhtej (M4) | **Mounted:** v1 baseline creation & budget sums; *(0 dedicated tests)* |
| GET | `/api/proposals/:id` | Fetch proposal details | Project Member | Abhtej (M4) | **Mounted:** Reads proposal by ID; *(0 dedicated tests)* |
| POST | `/api/proposals/:id/decision` | Record client decision on proposal | Client | Abhtej (M4) | **Mounted:** Approval locks active version; *(0 dedicated tests)* |
| POST | `/api/milestones` | Create milestone | Freelancer | Mounish (M5) | **Mounted & Verified:** 57 API tests, 40 model tests |
| GET | `/api/milestones` | List milestones (requires `?projectId=...`) | Project Member | M5 | **Mounted & Verified:** Scoped by mandatory `projectId`; 57 API tests |
| GET | `/api/milestones/:id` | Fetch milestone details | Project Member | Mounish (M5) | **Mounted & Verified:** 57 API tests |
| PATCH | `/api/milestones/:id` | Update milestone | Freelancer | Mounish (M5) | **Mounted & Verified:** 57 API tests |
| POST | `/api/milestones/:id/evidence` | Attach progress evidence | Freelancer | Mounish (M5) | **Mounted & Verified:** 57 API tests |
| POST | `/api/milestones/:id/decision` | Record client decision on milestone | Client | Mounish (M5) | **Mounted & Verified:** Client-only `checkDecisionAccess`; non-cascading; 57 API tests |
| POST | `/api/deliverables` | Create deliverable | Freelancer | Mounish (M5) | **Mounted & Verified:** 57 API tests, 40 model tests |
| GET | `/api/deliverables` | List deliverables (requires `?projectId=...` or `?milestoneId=...`) | Project Member | M5 | **Mounted & Verified:** Scoped queries; 57 API tests |
| GET | `/api/deliverables/:id` | Fetch deliverable details | Project Member | Mounish (M5) | **Mounted & Verified:** 57 API tests |
| PATCH | `/api/deliverables/:id` | Update deliverable | Freelancer | Mounish (M5) | **Mounted & Verified:** 57 API tests |
| POST | `/api/deliverables/:id/evidence` | Attach progress evidence | Freelancer | Mounish (M5) | **Mounted & Verified:** 57 API tests |
| POST | `/api/change-requests` | Create draft change request | Freelancer / Client | Mokshagna (M6) | **Mounted (Partial Prototype):** Intake functional; *(0 dedicated tests)* |
| GET | `/api/change-requests/:id` | Fetch change request details | Authenticated | Mokshagna (M6) | **Mounted (Partial Prototype):** Insecure: lacks project tenancy checks; *(0 dedicated tests)* |
| POST | `/api/change-requests/:id/decision` | Record decision on change request | Authenticated | Mokshagna (M6) | **Mounted (Partial Prototype):** Insecure: allows freelancer self-approval; lacks calculations; *(0 dedicated tests)* |
| GET | `/api/ai/cases` | List all 5 canonical deterministic AI test cases | Public | Vishal (AI track) | **Mounted & Verified:** 9 tests in `ai.routes.test.js` |
| GET | `/api/ai/cases/run-all` | Run all 5 canonical cases sequentially | Public | Vishal (AI track) | **Mounted & Verified:** 9 tests in `ai.routes.test.js` |
| GET | `/api/ai/cases/:caseId` | Retrieve single canonical AI test case payload | Public | Vishal (AI track) | **Mounted & Verified:** 9 tests in `ai.routes.test.js` |
| GET | `/api/ai/cases/:caseId/run` | Execute deterministic evaluation (GET) | Public | Vishal (AI track) | **Mounted & Verified:** 9 tests in `ai.routes.test.js` |
| POST | `/api/ai/cases/:caseId/run` | Execute deterministic evaluation (POST) | Public | Vishal (AI track) | **Mounted & Verified:** 9 tests in `ai.routes.test.js` |
| POST | `/api/ai/analyze-mock` | Run mock analysis on custom payload | Public | Vishal (AI track) | **Mounted & Verified:** Enforces Zod contract; 9 tests in `ai.routes.test.js` |

### Planned Endpoints (Review 3 Roadmap — Not Present in Current Code)

The following endpoints are specified for future reviews and are **not mounted** in `backend/src/routes.js`:

| Method | Route | Purpose | Target Review | Assigned Owner | Status |
|---|---|---|---|---|---|
| GET | `/api/change-requests` | List change requests scoped to `?projectId=...` | Review 3 | Mokshagna (M6) | **Planned** (missing query endpoint) |
| POST | `/api/proposals/:id/versions` | Create superseding Proposal version (v2+) | Review 3 | Abhtej (M4) | **Planned** (revision lifecycle) |
| POST | `/api/scope-chat` | Grounded scope Q&A against approved proposal chunks | Review 3 | Vishal (AI track) | **Planned** (requires live RAG pipeline) |
| POST | `/api/ai/analyze` | Live LLM analysis with LangChain agent and tools | Review 3 | Vishal (AI track) | **Planned** (requires live Ollama/LLM) |

## E. Authentication and authorization flow

```text
REGISTER   client -> POST /api/auth/register (name, email, password, role)
           server: Zod validate > bcrypt hash password > create User >
           sign JWT (jsonwebtoken with 7d expiry) > return { success: true, token, user }

LOGIN      client -> POST /api/auth/login (email, password)
           server: Zod validate > load User from MongoDB > verify bcrypt hash >
           sign JWT > return { success: true, token, user }

EACH CALL  client attaches HTTP header:
           Authorization: Bearer <token>
           server: requireAuth middleware extracts token > verifies signature & expiry >
           attaches decoded payload to req.user

AUTHORIZATION REALITY IN CODE:
  1 Identity: req.user (populated exclusively from verified Bearer JWT, never request body)
  2 Role Guards: requireRole(['client']) or requireRole(['freelancer'])
  3 Milestone Decision Access: checkDecisionAccess verifies client assignment on project
  4 Project Scoping: project CRUD checks user's workspace membership
  5 DEFECT (Change Requests): Change request endpoints DO NOT verify project tenancy, and
     recordDecision allows freelancers to approve their own change requests (UNRESOLVED)
  6 PLANNED (Vector Scoping): Server-side vector query filtering is planned for Review 3
     and does not exist in current code
```

> [!NOTE]
> **Stateless Bearer JWT vs Cookies/CSRF:** ScopePilot uses stateless Bearer JWTs transmitted in the `Authorization` header. Because standard browser requests do not attach custom Bearer headers automatically, CSRF attacks are mitigated without needing CSRF tokens or cookies. Registration is direct and immediate without email verification tokens or dev inboxes.

## F. Proposal, milestone and change-request state flows

**Proposal version**

```
draft --submit--> in_review --client approves--> approved (FROZEN)
  ^                   |--client rejects--> rejected
  |                   |--freelancer withdraws--> draft
  +-- edit allowed only in draft; approved/rejected versions are never edited.
  A change after approval means a NEW version (draft) that supersedes the old one
  only once the client approves it. Older approved versions stay stored.
```

**Milestone**

```
planned --> in_progress --> submitted (evidence attached) --> approved
                                   |--> rejected --> in_progress (rework)
  Only the client moves submitted to approved or rejected.
  Milestones belong to an approved proposal version.
```

**Change request**

```
draft --(freelancer classifies: in_scope | out_of_scope | needs_clarification)
  --> estimated (effort + schedule impact computed from stored data)
  --> priced (freelancer sets price)
  --> sent_to_client --client accepts--> accepted (applied once)
                     |--client rejects--> rejected
                     |--any estimate/capacity/base-version change--> stale (must re-estimate)
  Cancelled is allowed from draft/estimated/priced. accepted and rejected are final.
```

Agent-created changes always start in `draft`. Only deterministic services and the two humans move a change forward.

## G. Document, chunk, embedding, vector search and RAG flow

```
1 Document enters    upload (PDF or TXT) or an approved ProposalVersion is ingested
                     validate type and size > create Document + DocumentVersion, status = uploaded
2 Text extracted     status = extraction; PDF text with page numbers, TXT by section headings
                     store extracted text; failure -> status = failed with reason
3 Chunks created     split with overlap; each chunk keeps documentVersionId, page, section,
                     chunkIndex; unique index (documentVersionId, chunkIndex) blocks duplicates
4 Embeddings         status = embedding; server calls Ollama embedding model (never the browser)
                     store vector + embeddingModel + embeddingModelVersion
5 Vectors indexed    chunk saved in MongoDB; Atlas Vector Search index with filter fields
                     (workspaceId, projectId, status); status = ready
6 Authorized lookup  server builds filter from the user's memberships BEFORE the vector query:
                     workspaceId, projectId, status = ready, approved versions only for scope answers
7 Evidence           top chunks with scores; below a similarity threshold = no evidence
8 Answer + sources   model answers only from evidence; response lists chunk, page, section,
                     proposalVersionId beside the answer
RETRY    failed state re-runs from the failed step; upsert by (documentVersionId, chunkIndex)
REMOVE   source deleted or access revoked -> chunks deleted or status = invalid at once
```

## H. Scope RAG workflow

```
User question (POST /api/scope-chat { projectId, question, conversationId? })
  1 Authenticate (session) and Zod-validate input (length limit)
  2 Authorize: user is a member of this project and workspace
  3 Select source: the project's CURRENT APPROVED proposal version (or the version the
    user names, if approved). Drafts are never used as scope.
  4 Retrieve: embed the question, vector search filtered by projectId + that version only
  5 Evidence check: no chunk above the threshold -> return the missing-info response
  6 Generate: local model answers using ONLY the retrieved chunks
  7 Respond with two separate blocks:
      approvedText:      exact quoted chunks, page/section, proposalVersionId
      aiInterpretation:  the model's explanation, labelled as AI interpretation
  8 Save Message (user id, project id, cited chunk ids); conversation stays tied to
    the same user and project

Missing information: { answerStatus: "not_enough_information", approvedText: [],
  aiInterpretation: null, note: "The approved proposal does not say." }
```

The answer is never allowed to fill a gap with a guess, and it is never presented as legal advice.

## I. Semantic request comparison workflow

```
Client request: "Can we also add a customer analytics dashboard?"
  1 Save as a draft ChangeRequest (status draft, requester = session user)
  2 Embed the request text through Ollama (same model as the index)
  3 Authorized retrieval: filter projectId + approved version + status ready
  4 Related deliverables: top chunks mapped back to deliverables/milestones
  5 Overlaps: deliverables that already cover part of the request (for example an
    existing reporting page)
  6 Gaps / missing details: things the request leaves open (data source, users,
    charts, deadline) listed as questions for the client
  7 Potentially affected milestones: milestones linked to the related deliverables
  8 Classification support for the freelancer: suggested in_scope, out_of_scope or
    needs_clarification, shown with the evidence; the freelancer makes the call
```

Output is a structured object (related[], overlaps[], gaps[], affectedMilestones[], suggestedClass, sources[]) defined once in `/contracts` so M6, M9 and M10 all use the same shape.

## J. LangChain agent and tool workflow

```
PM asks: "What changes if we add this dashboard?"   POST /api/change-agent
   |
   v  Zod-validate request, authenticate, authorize (member of project)
 Agent (LangChain JS, local Ollama model, maxSteps = 4, timeout, input size cap)
   |-- tool call: readApprovedScope(projectId)
   |       Zod validates args > authorize(user, project) > deterministic read
   |       returns commitments (deliverables, revision limits, dates)
   |-- tool call: compareRequestedWork(request, deliverables)
   |       Zod > authorize > retrieval + comparison (M8 service)
   |       returns overlaps + gaps
   |-- tool call: calculateScheduleImpact(effort, capacity)
   |       Zod > authorize > pure function using stored estimates and capacity records
   |       returns revised dates; if effort or capacity is missing: returns
   |       missing_data, never an invented number
   v
 Draft ChangeRequest saved (status draft; price empty; estimateVersion stamped)
   v
 Human review: freelancer sets price, both parties read the comparison
   v
 Authenticated confirmation: client calls /change-requests/:id/decision;
   server re-checks session, role, membership, project state, estimateVersion,
   capacityVersion, baseVersionId and the idempotency key before applying
```

Where each control sits:

- **Zod:** request body, each tool's input, the draft output.
- **Authorization:** at the route and again inside every tool, using the session user, never model-supplied identity.
- **Deterministic work:** schedule maths, state changes, price storage.
- **Execution record:** one ToolExecution row per call with tool name, validated input, status, duration and error; no hidden reasoning and no secrets.
- **Errors:** a failed tool is reported as failed in the response; the agent cannot turn it into a claimed success.
- **Not every request calls every tool:** a simple scope question can stop after `readApprovedScope`.

## K. Team dependency graph

```
M1 foundation -----> M2 auth ---------> M3 workspace/authorization
                                          |
          +-------------------+-----------+--------------------+
          v                   v                                v
    M4 project/proposal   M5 milestones/decisions          M7 documents/vector
          |  ^                |                                |
          |  +--decision------+                                v
          v                                              M8 scope RAG/comparison
    M6 change request <------- M5 (decisions)                  |
          |                                                       |
          +-------------------+-----------------------------------+
                              v
                        M9 agent + tools

M10 frontend: consumes every API; starts on mocks built from /contracts, switches to real
endpoints as each module lands.
```

The critical path is M1 > M2 > M3 > M4/M5 > M6. M7 can start in parallel once M1 exists, because document upload and extraction need only an authenticated user stub at first.

## L. Git, branch and module strategy

- **One repo, two apps, clear folders:**
  - `backend/src/modules/<module>/` (routes, controller, service, model per module)
  - `backend/src/contracts/` (shared Zod schemas, state enums, and response shapes)
  - `backend/src/ai/` (AI analysis contracts, mock engine, and test fixtures)
  - `backend/tests/` (Jest automated test suites across 9 test files)
  - `client/src/components/`, `client/src/pages/`, `client/src/mocks/`, `client/src/context/` (React SPA components, page views, context, and in-browser mock store)
  - `docs/` and `docs/reports/` (system architecture, PRD, memory, tasks, and historical merge audit reports)
- **Branches:** `main` is protected, linear, and always deployable; features branch from and rebase onto `origin/main` for fast-forward merges (`git merge --ff-only`).
- **Quality gates:** Before merging to `main`, every branch must pass:
  1. `npm test` in `backend/` (145/145 passing tests).
  2. `npm run mock:cases` in `backend/` (5/5 canonical AI scenarios passing).
  3. `npm run build` in `client/` (clean Vite build, zero errors).
- **Never commit secrets:** `.env` is ignored; required variables are documented below.

## M. Backend foundation & authentication verification

**Smallest real slice:** *Register directly, authenticate, receive stateless Bearer JWT, and call protected endpoints.*

1. **Service health:** `GET /api/health` returns `200 OK` with status indicator.
2. **Stateless authentication:**
   - `POST /api/auth/register` creates user with bcrypt-hashed password and issues Bearer JWT.
   - `POST /api/auth/login` validates credentials and returns Bearer JWT.
   - `GET /api/auth/me` with `Authorization: Bearer <token>` verifies token and returns user profile.
3. **Workspace isolation:** `GET /api/workspaces/:id` returns workspace data only for authorized members.
4. **Project management:** `POST /api/projects` creates project scoped to the user's workspace, verified behind `requireAuth`.

## N. Individual responsibilities & team roster

| # / Role | Member | Module / Role | Primary Ownership | Audited Implementation & Test Status |
|---|---|---|---|---|
| 1 | Vivek | Backend foundation & architecture | `server.js`, `app.js`, `routes.js`, error middleware | **Integrated & Verified:** `GET /api/health`, error envelope, Zod env validation |
| 2 | Nikhil | Authentication & security | `modules/auth/`, Bearer JWT, `requireAuth`, `requireRole` | **Implemented (Untested):** Direct registration, login, Bearer JWT; *(0 dedicated tests)* |
| 3 | Sushant | Workspace & membership | `modules/workspace/`, tenancy boundaries, invitations | **Implemented (Untested):** Workspace CRUD, multi-tenant boundaries; *(0 dedicated tests)* |
| 4 | Abhtej | Project & proposal management | `modules/project/`, `proposal/`, v1 baseline freeze | **Partially Implemented:** Project CRUD verified (19 tests); Proposal v1 implemented *(0 tests)*; v2+ missing |
| 5 | Mounish | Milestones & deliverables | `modules/milestone/`, `deliverable/`, client decisions | **Implemented & Verified:** 97 tests across API (57) and model (40) suites; non-cascading |
| 6 | Mokshagna | Change requests | `modules/changeRequest/`, intake & decision flow | **Partial Prototype Stub (Insecure & Untested):** Unresolved freelancer self-approval bug, missing tenancy checks; *(0 tests)* |
| 7–9 | Vishal | AI subsystem (Contracts, Mock Engine, RAG, Agent) | `ai/`, `contracts/`, 5 canonical cases, CLI runner | **Review 1 & 2 Verified:** 26 automated tests, 5 mock cases passed. Review 3 live RAG & agent planned |
| 10 | Taran | React frontend SPA | `client/`, AppShell, role switcher, views, mock store | **Implemented as Standalone Prototype:** Clean Vite build; in-browser mock store (`demoStore.js`) |
| Cross-Cutting | Shivasainithin | Git Integration & Merging | Repository Git lifecycle, branch reconciliation, audits | **Active:** Enforcing linear history, fast-forward merges, pre-merge quality gates |
| Cross-Cutting | Bharat | QA & Testing | `backend/tests/`, test execution & verification | **Active:** 145/145 passing Jest tests, 5/5 AI mock cases verified, coverage gap tracking |

---

## O. Environment variables & configuration

Backend configuration is validated at startup using Zod in `backend/src/config/env.js`:

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | Number | `5000` | Port on which the Express API server listens. |
| `NODE_ENV` | Enum | `'development'` | Environment mode (`development`, `production`, `test`). |
| `API_PREFIX` | String | `'/api'` | Global URL prefix for mounted API endpoints. |
| `MONGODB_URI` | String | `'mongodb://localhost:27017/scopepilot_dev'` | MongoDB connection string. |
| `JWT_SECRET` | String | Development fallback | Secret key for signing JWTs (must be at least 16 characters). |
| `JWT_EXPIRES_IN` | String | `'7d'` | Expiration duration for signed JWT tokens (e.g. `'7d'`, `'24h'`). |
| `CORS_ORIGIN` | String | `'*'` | Allowed CORS origin(s). |

---

## P. Local development & startup commands

### Backend (`backend/`)

```bash
cd backend

# Install dependencies
npm install

# Start development server with hot reload (Port 5000)
npm run dev

# Start production server
npm start

# Run all 9 Jest test suites (145 tests)
npm test

# Run the 5 canonical deterministic AI review cases
npm run mock:cases

# Populate database with seed data
npm run seed
```

### Frontend (`client/`)

```bash
cd client

# Install dependencies
npm install

# Start Vite development server (http://localhost:5173)
npm run dev

# Compile production bundle
npm run build

# Run Oxlint code inspection
npm run lint
```

---

## Q. Database seeding & default credentials

A seed script is provided at `backend/src/scripts/seed.js`. To seed a local MongoDB instance, run:

```bash
cd backend
npm run seed
```

The script resets database collections and provisions:
- **Default User Accounts** (all passwords: `password123`):
  - **Freelancer:** `freelancer@scopepilot.dev`
  - **Client:** `client@scopepilot.dev`
  - **Admin:** `admin@scopepilot.dev`
- **Workspace:** `Acme Digital Labs` (owned by Freelancer, Client and Admin joined as members).
- **Project:** `E-Commerce Platform Redesign`.
- **Proposal:** Approved Proposal v1 ($12,000 budget, frozen baseline).
- **Milestones & Deliverables:**
  - Milestone 1: `Core Platform Architecture` ($4,000, `IN_PROGRESS`)
  - Deliverable 1: `Database Schema & Auth APIs` (`PENDING`)

---

## R. Verified test baseline & known coverage gaps

### Verified Test Baseline (145/145 Passing)

All 145 automated tests pass across 9 test suites in `backend/`:
- `tests/milestoneDeliverable.api.test.js`: **57 tests** (milestone/deliverable CRUD, client decision authorization, project query scoping)
- `tests/milestoneDeliverable.model.test.js`: **40 tests** (Mongoose schemas, aliases, schema integrity, and Zod validator schemas)
- `tests/project.test.js`: **19 tests** (workspace boundaries, project CRUD, role permissions)
- `tests/ai.contracts.test.js`: **10 tests** (Zod input/output schemas, mock analysis contracts)
- `tests/ai.routes.test.js`: **9 tests** (REST endpoints under `/api/ai/*`, custom mock analysis, 400/404 handling)
- `tests/ai.mockCases.test.js`: **7 tests** (5 canonical deterministic cases, idempotency, safety disclaimer)
- `tests/validation.test.js`: **1 test** (standardized 400 error response envelope)
- `tests/health.test.js`: **1 test** (`GET /api/health` 200 OK)
- `tests/notFound.test.js`: **1 test** (catch-all 404 handler)

### Test Coverage Blind Spots & Gaps

While core Milestones, Deliverables, Projects, and AI mock contracts are thoroughly tested, the following modules have **no dedicated automated test suites**:
- **Auth Module (`backend/src/modules/auth/`):** 0 tests for registration, login, JWT issuance/verification, password hashing, and role middleware.
- **Workspace Module (`backend/src/modules/workspace/`):** 0 tests for workspace CRUD, membership roles, and invitation handling.
- **Proposal Module (`backend/src/modules/proposal/`):** 0 tests for proposal creation, budget calculations, and approval locking.
- **Change Request Module (`backend/src/modules/changeRequest/`):** 0 tests for change request intake, status transitions, and decision recording.
- **Frontend SPA (`client/`):** 0 unit or integration tests for React components, hooks, or page routing.
