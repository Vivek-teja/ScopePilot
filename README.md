# ScopePilot
ScopePilot is an AI-powered freelance project management platform designed to manage project scope, proposals, milestones, deliverables, and change requests. It helps freelancers and clients track the agreed scope and identify the impact of new requests before they are approved, reducing scope creep and improving project transparency.

*Architecture, ownership and first-milestone plan for the 10-person team*

This is the first planning output required by Section 24 of the master prompt (items A to N). It fixes the architecture, shared contracts and ownership boundaries before large-scale coding. The stack is unchanged: React, Node.js/Express, MongoDB Atlas with Mongoose, Atlas Vector Search, Ollama, LangChain JavaScript and Zod. No application code is generated here.

**Two decisions to confirm in week 1** (both are required by the brief): (1) pick one embedding model, run it once, and set the Atlas index dimensions to the real output length (proposed: `nomic-embed-text`, 768 dimensions, verify by measuring); (2) pick one local chat model after a quick latency test on the team's hardware.

## A. High-level system architecture

```
 Browser: React SPA (Member 10)
   |  HTTPS - HttpOnly session cookie + CSRF header - CORS allowlist
   v
 Express API under /api (skeleton: Member 1)
   middleware order: requestId > cors > rateLimit > session (M2) > csrf (M2)
                     > zod validate > authorize (M3) > controller
   routes -> controllers -> services -> Mongoose models
   |
   +-- Business modules
   |     auth (M2) | workspace + membership (M3) | project + proposal (M4)
   |     milestone + evidence + decisions (M5) | change request + schedule (M6)
   |
   +-- AI modules
   |     documents + chunks + embeddings (M7)
   |     scope RAG + semantic comparison (M8)
   |     LangChain agent + tools (M9)
   |
   +--> MongoDB Atlas: collections via Mongoose + vector index on chunks
   +--> Ollama (server-side only, localhost): embedding model + chat model,
        called through LangChain JS wrappers. Never reachable from the browser.
```

Architecture rules every member follows:

- **Layering:** routes only parse and validate, controllers call services, services hold logic, models hold schema. Tools and AI code live in `/ai`, outside routes.
- **One acting user:** identity comes only from the server session. `role`, `ownerId` and `organizationId` are never read from request bodies or model output.
- **AI never decides:** prices, approvals, roles and dates are deterministic code plus human decisions. The AI explains, compares and drafts.
- **Authorization before retrieval:** the vector query filter (workspaceId, projectId, status) is built server-side from the user's memberships.
- **Shared contracts:** one Zod schema folder (`/contracts`) holds state enums, the error envelope and the AI response shape. Nobody redefines them.

## B. 10-person responsibility matrix

| # | Member | Owns (modules and APIs) | Database entities | Depends on | Independent demo target |
|---|---|---|---|---|---|
| 1 | Backend foundation and API architect | Express app, route index, error middleware, Zod-validated env config, response/error conventions, logger | none (shared helpers) | none | `GET /api/health`, a deliberate validation error and a 404 all returning the shared error format |
| 2 | Authentication and security | `/api/auth/*` (8 routes), session, CSRF, CORS, login rate limit, `requireAuth` | User, Session, Token (verification and reset, hashed, single-use) | M1 | Register, read the dev inbox, verify, login, `/me`, logout in Postman; reset invalidates sessions |
| 3 | Workspace, membership and authorization | `POST /api/workspaces/:id/invitations`, `authorize()` service, membership revocation | Workspace, Membership, Invitation, AuditLog | M1, M2 | Invite a client, accept, revoke; revoked user gets 403; role change appears in AuditLog |
| 4 | Project and proposal management | `POST /api/projects`, `POST /api/proposals`, proposal versions, `POST /api/proposals/:id/decision` (with M5's decision service) | Project, Proposal, ProposalVersion | M3, M5 (decision service) | Create v1 and v2, client approves v1, any edit to v1 is rejected with 409 |
| 5 | Milestones, evidence and decisions | milestone lifecycle, evidence and comments, `POST /api/milestones/:id/evidence`, `POST /api/milestones/:id/decision`, shared `decisionService`, timeline data | Milestone, Evidence, Decision | M3, M4 | Add evidence, client approves or rejects, timeline endpoint shows ordered history |
| 6 | Change request and schedule impact engine | `POST /api/change-requests`, `POST /api/change-requests/:id/decision`, capacity, stale-estimate check, price entry | ChangeRequest, CapacityRecord | M3, M4, M5 | Draft, freelancer sets price, client accepts; changing capacity afterwards makes acceptance fail as stale |
| 7 | Document ingestion and vector search | upload, PDF/TXT extraction, chunking, Ollama embeddings, Atlas index, status and retry, authorized retrieval function | Document (with versions), Chunk | M1, M3 | Upload TXT and PDF, watch extraction > embedding > ready; retry creates no duplicates; script query returns only permitted chunks |
| 8 | Scope RAG and semantic comparison | `POST /api/scope-chat`, comparison service used by the agent and by draft changes | Conversation, Message | M4, M7 | Q&A with citation to a proposal version, plus a clear `not enough information` answer |
| 9 | LangChain agent and AI tooling | `POST /api/change-agent`, three tools with Zod schemas, step/time/input limits, execution logging | ToolExecution (agent run record) | M6, M7, M8 | Run the dashboard request and receive a draft change request with logged tool calls; a forced tool error is reported honestly |
| 10 | React frontend and integration | all screens, routing, auth UI, dashboards, citation display, loading/empty/error/retry states, end-to-end wiring | none | all APIs (uses mocks until ready) | Login, role dashboard, proposal versions and milestone board running on mocked API responses first |

Integration points to agree early: M2 exports `requireAuth`; M3 exports `authorize(user, action, resource)`; M5 exports `decisionService.record()`; M7 exports `retrieveChunks({ user, projectId, query })`; M6 exports `getScopeAndCapacity()` and `computeScheduleImpact()` as plain functions that M9 wraps as tools.

## C. Database entity-relationship design

```
User 1---* Membership *---1 Workspace
User 1---* Session
User 1---* Token (verification / reset)
Workspace 1---* Invitation
Workspace 1---* AuditLog (role and membership changes)
Workspace 1---* Project
Project  *---* User  (via ProjectMember: freelancerId, clientId)

Project 1---* Proposal 1---* ProposalVersion   (status: draft..approved, approved = frozen)
Project 1---* Milestone 1---* Evidence
Project 1---* CapacityRecord                    (freelancer availability per period)
Project 1---* ChangeRequest
   ChangeRequest *---1 ProposalVersion          (baseVersionId: the approved scope compared against)
   ChangeRequest *---* Milestone                (affectedMilestoneIds)
Decision (polymorphic): subjectType + subjectId -> ProposalVersion | Milestone | ChangeRequest
   fields: actorId, outcome, comment, snapshotHash, createdAt  (append-only)

Project 1---* Document 1---* DocumentVersion    (approved ProposalVersion text is ingested as a Document)
DocumentVersion 1---* Chunk                      (text, page, section, embedding, embeddingModel,
                                                  embeddingModelVersion, workspaceId, projectId, status)
Project 1---* Conversation 1---* Message         (message stores cited chunkIds and proposalVersionId)
Project 1---* ToolExecution                      (agentRunId, toolName, validatedInput, status, durationMs, error)
```

Key design notes:

- **Immutability:** an approved `ProposalVersion` stores a content hash; the model layer refuses updates to it, and every change creates a new version.
- **Stale estimates:** a `ChangeRequest` stores `baseVersionId`, a `capacityVersion` and an `estimateVersion`. Acceptance re-checks all three against current data and rejects if any moved.
- **Duplicate application:** `Decision` has a unique index on (subjectType, subjectId, decisionKind) so a change can only be accepted once; the decision endpoint also takes an idempotency key.
- **Chunk safety:** each chunk copies `workspaceId` and `projectId` so the vector filter needs no join, and `status` flips to `invalid` when a source is removed or access changes.
- **No padding:** every collection above has a clear job; there is no collection created just to look bigger.

## D. API ownership table

Roles: **F** = Freelancer, **C** = Client, **A** = Workspace Administrator, **PM** = any member of that project. Every protected route runs `requireAuth` (M2), CSRF check on mutations (M2), Zod validation (route owner) and `authorize()` (M3).

| Method | Route | Purpose | Allowed role | Owner | Dependencies |
|---|---|---|---|---|---|
| GET | `/api/profiles/:slug` | Published freelancer portfolio | Public | M4 | M1 |
| GET | `/api/services` | Published service descriptions, no client documents | Public | M4 | M1 |
| POST | `/api/auth/register` | Sign up, least-privileged role only | Public | M2 | M1 |
| POST | `/api/auth/verify-email` | Consume single-use token | Public | M2 | register |
| POST | `/api/auth/login` | Create rotated session, set cookie | Public (rate limited) | M2 | verify-email |
| POST | `/api/auth/forgot-password` | Issue reset token by email | Public | M2 | dev inbox |
| POST | `/api/auth/reset-password` | Consume token, revoke all sessions | Public | M2 | forgot-password |
| GET | `/api/auth/me` | Current user and memberships | Any signed-in user | M2 | session |
| POST | `/api/auth/logout` | Revoke current session | Any signed-in user | M2 | session |
| POST | `/api/auth/change-password` | Change password, rotate session | Any signed-in user | M2 | session |
| POST | `/api/workspaces/:id/invitations` | Invite a member with an expiring link | A | M3 | M2 |
| POST | `/api/projects` | Create project | F | M4 | M3 |
| POST | `/api/proposals` | Create proposal or new version | F | M4 | projects |
| POST | `/api/proposals/:id/decision` | Approve or reject a specific version | C | M4 + M5 decision service | proposals |
| POST | `/api/milestones/:id/evidence` | Add evidence or comment | F (comments: PM) | M5 | approved proposal |
| POST | `/api/milestones/:id/decision` | Approve or reject deliverable | C | M5 | evidence |
| POST | `/api/change-requests` | Create draft change, set effort and price | F (C may submit a request that becomes a draft) | M6 | proposals, capacity |
| POST | `/api/change-requests/:id/decision` | Accept or reject, with stale and duplicate checks | C | M6 + M5 decision service | change-requests |
| POST | `/api/scope-chat` | Grounded Q&A on approved scope | PM | M8 | M7, M4 |
| POST | `/api/change-agent` | Draft a change request via the bounded agent | PM (F finalizes) | M9 | M6, M7, M8 |

Supporting endpoints, added only when the workflow needs them: invitation accept (M3), list/detail GETs for projects, proposals, milestones and changes (owners above), document upload and status (M7), conversation history (M8), approval timeline GET (M5).

## E. Authentication and authorization flow

```
REGISTER   client -> POST /auth/register (email, password)
           server: Zod validate > hash password > create User(role = least privileged,
           emailVerified = false) > create hashed single-use token (expires) > send to dev inbox
VERIFY     POST /auth/verify-email (token) > token valid, unexpired, unused > mark verified > burn token
LOGIN      POST /auth/login > rate limit check > verify hash > require verified email
           > create NEW Session doc in MongoDB (expiresAt) > rotate: any old sid is discarded
           > Set-Cookie sid (HttpOnly, Secure on HTTPS, SameSite=Lax or Strict) + return CSRF token
EACH CALL  cookie sid > load Session > not expired, not revoked > req.user from DB
           mutation? header X-CSRF-Token must match the session's token
AUTHORIZE  1 who: req.user (never the body)
           2 role: from Membership for this workspace/project
           3 resource: project belongs to user's workspace and user is a member
           4 action: allowed for that role? (admin cannot sign, approve or accept)
           5 otherwise deny (default deny) and log denials
LOGOUT     POST /auth/logout > mark Session revoked > clear cookie
RESET      POST /auth/forgot-password > reset token (hashed, expiring, single-use, never logged)
           POST /auth/reset-password > valid token > new hash > burn token > revoke ALL sessions
```

CSRF note for beginners: the cookie is sent automatically by the browser, so a malicious site could trigger a request. The extra header, which only our own React app can read and attach, defeats that. CORS allowlist lists the exact frontend origin only.

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

- **One repo, two apps, clear folders:** `/server/src/modules/<module>/` (routes, controller, service, model, tests per module), `/server/src/contracts/` (shared Zod schemas and enums), `/server/src/ai/` (tools, agent, prompts), `/client/src/features/<feature>/`. Each member mostly edits files inside their own module folder, which is what prevents overwrites.
- **Branches:** `main` is always demoable and protected; `develop` is the integration branch; each member works on `feature/m<number>-<short-name>` branched from `develop`.
- **Pull requests:** small PRs (a day or two of work), at least one reviewer who is not the author, tests passing before merge. Member 1 owns merges of shared files; changes to `/contracts` need agreement from every consumer, posted in the team channel first.
- **Shared-file rules:** `app.js` route registration and `/contracts` are the only hot files. Register routes with one line per module and keep the file sorted so merges stay trivial.
- **Rebase daily:** `git pull --rebase origin develop` each morning to catch conflicts while they are small.
- **Never commit secrets:** `.env` is ignored; `.env.example` lists every variable without values.
- **Releases:** merge `develop` to `main` at the end of each phase; tag it (for example `phase-2`) so there is always a safe fallback for the demo.

## M. First working backend demo

**Smallest real slice (target: end of week 1 to 2):** *Register, verify, log in and call one protected API, with data persisted in Atlas.*

1. M1: Express server, MongoDB Atlas connection, `/api/health`, error format.
2. M2: register, verify-email (token in the dev inbox), login with the HttpOnly session cookie, `/api/auth/me`, logout.
3. M3: Workspace and Membership models; a protected `GET /api/workspaces/mine` that returns only the caller's workspaces.
4. M4: `POST /api/projects` (freelancer only), which proves a real create-and-persist workflow behind `requireAuth` and `authorize()`.

Postman proof, run in order and saved as the first collection: register > read dev inbox > verify > login > `/me` > create project as freelancer (201) > same call as client (403) > another workspace's project (404/403) > logout > `/me` (401). Refresh Atlas and show the documents. This slice touches Express, MongoDB, authentication, authorization and one core workflow without any AI.

## N. Individual first tasks

| # | Build first | Needs from others | Can demo alone | Owns first | Understand before coding |
|---|---|---|---|---|---|
| 1 | Server skeleton, env validation, health route, error and response helpers, folder template for everyone | nothing | Health and error responses in Postman | `app.js`, `config`, `middleware/error` | Express middleware order, async error handling, Zod basics |
| 2 | User model, register and verify with a dev inbox (console or small mail catcher) | M1 skeleton | Register and verify, token expires and cannot be reused | User, Token | Password hashing, token hashing and expiry, cookies, sessions vs JWT |
| 3 | Workspace, Membership, Invitation models and the `authorize()` function with a table of role/action rules | M2 `req.user` (use a stub until ready) | Unit tests: client cannot approve as admin, outsider denied | Workspace, Membership, AuditLog | Default deny, role vs resource checks, why UI hiding is not security |
| 4 | Project and Proposal/ProposalVersion models, create v1 and v2, frozen-after-approval guard | M3 `authorize()` (stub), M5 `decisionService` interface | v2 created, approved v1 cannot be edited | Project, Proposal, ProposalVersion | Mongoose schemas and hooks, versioning, content hashing |
| 5 | Milestone and Evidence models, evidence POST, `decisionService.record()` first so M4 and M6 can use it | M4 approved version id | Evidence added, decision appended, timeline GET | Milestone, Evidence, Decision | Append-only logs, polymorphic references, unique indexes |
| 6 | ChangeRequest model and a pure `computeScheduleImpact()` with unit tests before any route | M4 versions, sample capacity fixtures | Test suite for schedule maths and stale detection | ChangeRequest, CapacityRecord | Pure functions, optimistic concurrency, idempotency keys |
| 7 | Ollama running locally, embed one sentence, record the vector length, create the Atlas index; then TXT upload to chunks | M1; Atlas cluster | Script that ingests a TXT and returns filtered neighbours | Document, Chunk | Embeddings, chunking, vector index definition, metadata filters |
| 8 | Retrieval wrapper around M7's function, answer prompt with the strict evidence rule, missing-information response | M7 chunks; M4 approved version | CLI or Postman Q&A against fixture proposal text | Conversation, Message | RAG basics, citations, similarity thresholds, grounding |
| 9 | Wrap M6 and M8 functions as plain functions first, then define the three Zod tool schemas and the tool-run logger; connect LangChain last | M6, M8 functions (fixtures until ready) | Tool calls run one by one from a script with logged results | ToolExecution | LangChain tool calling, Zod schemas, step limits, why tools hold the logic |
| 10 | Vite or CRA project, router, API client with CSRF header, login screen, mocked dashboards from `/contracts` | M2 endpoints; sample JSON from every owner | Clickable role dashboards on mocked data | none (client folders) | Cookies with fetch (`credentials: include`), server-authoritative state, loading/error/empty patterns |

**Week-1 team checklist:** agree and commit `/contracts` (state enums, error envelope, AI response shape), choose the embedding and chat models, seed account names for freelancer, client and admin, and write the fixture proposal (with the analytics-dashboard scenario) that every AI member will test against.
