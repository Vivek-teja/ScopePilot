# ScopePilot – Part 3: Change Request Management
## Architecture, Security Hardening, API Contracts & Integration Handoff Report

**Module:** Change Request Management  
**Module Assignee:** Mokshagna  
**Project:** ScopePilot (AI-Powered Freelance Scope & Change Management Platform)  
**Date:** October 18, 2026  
**Status:** Integrated from origin/mokshagna (original commits preserved in history); decisions are approve/reject only; listing is project-scoped; known follow-ups listed below.
**Active Feature Branch:** `mokshagna`  
**Runtime & Tech Stack:** Node.js (v20+), Express 4.21, Mongoose 8.9.5, Zod 3.24.1, Jest 29.7, Oxlint 1.88  

---

## 1. Executive Summary & Delivery Scope

The Change Request module records and manages additional work requested after the original project scope has been agreed upon. It ensures that the original approved scope and proposal version remain safe and immutable, prevents silent scope creep, and enforces human-governed review and approval workflows before changes affect project deliverables, timeline, or pricing.

### Key Deliverables Implemented & Verified:
1. **ChangeRequest Mongoose Model (`changeRequest.model.js`):**
   - Stores references to `project`, `requestedBy`, `title`, `description`, `status`, `affectedMilestones`, `relatedDeliverables`, `effortEstimate`, `priceAdjustment`, `scheduleImpact`, `clientDecision`, and `freelancerDecision`.
   - Preserves uninstantiated schemas for future AI integration (`aiAnalysis`, `scopeComparison`).
   - Added compound indexes `{ project: 1, status: 1 }` and `{ project: 1, createdAt: -1 }`.
2. **Strict Multi-Tenant Project Authorization (`checkProjectAccess`):**
   - Validates that the authenticated requester has verified access to the referenced project (as assigned freelancer, designated client, or workspace owner/member).
   - Unrelated tenants receive `403 Forbidden`.
3. **Review Action Guard & Self-Approval Prevention (`checkDecisionAccess`):**
   - Strictly blocks the assigned project freelancer and any user with system role `'freelancer'` from recording decisions (`403 Forbidden`).
   - Prevents requester self-approval (`requestedBy === userId`), even if the requester is the project client.
   - Restricts decision authority to designated client, workspace owner/admin, or system admin.
4. **Lifecycle State Transition & Concurrency Hardening:**
   - Enforces valid state transitions: `draft` -> `pending_estimate` / `submitted` -> `pending_approval` / `under_review` -> `approved` / `rejected`.
   - Prevents decisions on `draft` requests (`400 Bad Request`).
   - Finalized requests (`approved`, `rejected`, `implemented`) are locked against subsequent mutation or reversal (`409 Conflict`).
   - Decisions are strictly `'approve'` or `'reject'`.
5. **Mass-Assignment & Referential Integrity Safeguards:**
   - Restricts initial creation status to non-finalized states (`draft`, `pending_estimate`).
   - Strips client-supplied `requestedBy` and protected decision metadata during creation.
   - Verifies that referenced milestones and deliverables exist and strictly belong to the same project (`400 Bad Request` on cross-project links).
   - Enforces non-negative constraints on `effortEstimate` and `priceAdjustment`.
6. **Proposal Immutability:**
   - Creation and decision operations on change requests never mutate `project.currentApprovedProposal` or the parent `ProposalVersion`.
7. **Comprehensive Automated Test Coverage:**
   - 53 dedicated integration tests in `backend/tests/changeRequest.test.js` passing 100%.
   - Full test suite passing 333 / 333 tests across all 13 test suites with zero regressions.
   - Clean Oxlint linter run with 0 errors and 0 warnings.

---

## 2. Status Lifecycle & State Machine

```
   [ Client / Freelancer ]
             │
             ▼
      POST /api/change-requests
             │
             ├── status = 'draft' ──────► [ DRAFT ]
             │                               │ (submit)
             │                               ▼
             └── status = 'pending_estimate' ► [ PENDING_ESTIMATE / SUBMITTED ]
                                                     │
                                                     ▼
                                        [ PENDING_APPROVAL / UNDER_REVIEW ]
                                                     │
                                      POST /api/change-requests/:id/decision
                                                     │
                                     ┌───────────────┴───────────────┐
                                     ▼                               ▼
                                [ APPROVED ]                   [ REJECTED ]
                                     │                               │
                                (Terminal)                      (Terminal)
                                 (Locked)                        (Locked)
```

### Allowed Lifecycle Transitions:
- `draft` -> `pending_estimate`: Request submitted for technical estimation.
- `pending_estimate` -> `pending_approval`: Technical effort and price adjustments recorded.
- `pending_approval` -> `approved`: Approved by authorized client or workspace owner.
- `pending_approval` -> `rejected`: Rejected by authorized client or workspace owner.
- Attempting `POST /api/change-requests/:id/decision` on `approved`, `rejected`, or `implemented` returns **`409 Conflict`**.
- Attempting `POST /api/change-requests/:id/decision` on `draft` returns **`400 Bad Request`**.

---

## 3. Endpoints & API Contracts

### 3.1 Create Change Request
- **Method & Route:** `POST /api/change-requests`
- **Authentication:** Bearer JWT required (`Authorization: Bearer <token>`)
- **Authorization:** Assigned freelancer, designated client, workspace owner/member, or system admin.

#### Request Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

#### Request Body Example:
```json
{
  "projectId": "671288c3f29bfa0012e4f000",
  "title": "Add Real-Time Analytics Dashboard",
  "description": "Provide live chart visualizations and customer activity telemetry.",
  "affectedMilestones": ["671288c3f29bfa0012e4f003"],
  "relatedDeliverables": ["671288c3f29bfa0012e4f004"],
  "effortEstimate": 24,
  "priceAdjustment": 1800,
  "scheduleImpact": {
    "daysAdded": 4,
    "summary": "Adds 4 business days to final sprint delivery."
  }
}
```

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "message": "Change request submitted successfully",
  "data": {
    "_id": "671288c3f29bfa0012e4f010",
    "project": "671288c3f29bfa0012e4f000",
    "projectId": "671288c3f29bfa0012e4f000",
    "requestedBy": "671288c3f29bfa0012e4f002",
    "title": "Add Real-Time Analytics Dashboard",
    "description": "Provide live chart visualizations and customer activity telemetry.",
    "status": "pending_estimate",
    "affectedMilestones": ["671288c3f29bfa0012e4f003"],
    "relatedDeliverables": ["671288c3f29bfa0012e4f004"],
    "effortEstimate": 24,
    "priceAdjustment": 1800,
    "scheduleImpact": {
      "daysAdded": 4,
      "summary": "Adds 4 business days to final sprint delivery."
    },
    "createdAt": "2026-10-18T11:45:00.000Z",
    "updatedAt": "2026-10-18T11:45:00.000Z"
  }
}
```

#### Error Responses:
- `400 Bad Request`: Validation failure (missing title/description, negative numbers, invalid IDs, cross-project milestone/deliverable references, or disallowed initial status).
- `401 Unauthorized`: Missing, expired, or invalid Bearer token.
- `403 Forbidden`: Authenticated user is not an authorized participant in the referenced project.
- `404 Not Found`: Target project does not exist.

---

### 3.2 Get Change Request by ID
- **Method & Route:** `GET /api/change-requests/:id`
- **Authentication:** Bearer JWT required
- **Authorization:** Only project participants (freelancer, client, workspace owner/member, admin).

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Change request retrieved successfully",
  "data": {
    "_id": "671288c3f29bfa0012e4f010",
    "title": "Add Real-Time Analytics Dashboard",
    "description": "Provide live chart visualizations and customer activity telemetry.",
    "status": "pending_approval",
    "project": {
      "_id": "671288c3f29bfa0012e4f000",
      "title": "ScopePilot Web Application",
      "status": "active"
    },
    "requestedBy": {
      "_id": "671288c3f29bfa0012e4f002",
      "name": "Alex Freelancer",
      "email": "alex@example.com",
      "role": "freelancer"
    },
    "affectedMilestones": [
      {
        "_id": "671288c3f29bfa0012e4f003",
        "title": "Milestone 2 - Core Services",
        "status": "in_progress"
      }
    ],
    "relatedDeliverables": [
      {
        "_id": "671288c3f29bfa0012e4f004",
        "title": "Reporting API",
        "status": "pending"
      }
    ],
    "effortEstimate": 24,
    "priceAdjustment": 1800,
    "scheduleImpact": {
      "daysAdded": 4,
      "summary": "Adds 4 business days to final sprint delivery."
    }
  }
}
```

#### Error Responses:
- `400 Bad Request`: Invalid Change Request ID format.
- `401 Unauthorized`: Missing or invalid Bearer token.
- `403 Forbidden`: Authenticated user belongs to a different project or workspace.
- `404 Not Found`: Change Request not found.

---

### 3.3 Record Decision on Change Request
- **Method & Route:** `POST /api/change-requests/:id/decision`
- **Authentication:** Bearer JWT required
- **Authorization:** Designated project client, workspace owner, workspace admin, or system admin.
- **Forbidden:** Freelancers (cannot approve/reject change requests) and Requesters (cannot self-approve).

#### Request Body Example (Approval):
```json
{
  "decision": "approve",
  "comment": "Approved for Sprint 3. Budget adjustment authorized."
}
```

#### Request Body Example (Rejection):
```json
{
  "decision": "reject",
  "comment": "Timeline extension conflicts with release milestone. Scope declined."
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Change request decision recorded successfully",
  "data": {
    "_id": "671288c3f29bfa0012e4f010",
    "status": "approved",
    "decision": {
      "decision": "approve",
      "comment": "Approved for Sprint 3. Budget adjustment authorized.",
      "decidedAt": "2026-10-18T11:50:00.000Z",
      "decidedBy": "671288c3f29bfa0012e4f005"
    },
    "clientDecision": {
      "decision": "approve",
      "comment": "Approved for Sprint 3. Budget adjustment authorized.",
      "decidedAt": "2026-10-18T11:50:00.000Z",
      "decidedBy": "671288c3f29bfa0012e4f005"
    }
  }
}
```

#### Error Responses:
- `400 Bad Request`: Invalid decision value (not in `['approve', 'reject']`) or request is in `draft` status.
- `401 Unauthorized`: Missing or invalid Bearer token.
- `403 Forbidden`: User has role `'freelancer'`, is the assigned project freelancer, is the original requester, or is an outsider.
- `404 Not Found`: Change Request or associated Project not found.
- `409 Conflict`: Attempting to record a decision on an already finalized (`approved`, `rejected`, or `implemented`) request.

---

### 3.4 List Change Requests (Project-Scoped)
- **Method & Route:** `GET /api/change-requests?projectId=<id>&status=<status>`
- **Authentication:** Bearer JWT required
- **Authorization:** Only project participants. All queries require `projectId` (or `project`).

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Change requests retrieved successfully",
  "data": [
    {
      "_id": "671288c3f29bfa0012e4f010",
      "title": "Add Real-Time Analytics Dashboard",
      "status": "approved",
      "effortEstimate": 24,
      "priceAdjustment": 1800,
      "createdAt": "2026-10-18T11:45:00.000Z"
    }
  ]
}
```

---

## 4. Security & Tenancy Verification Matrix

| Rule | Enforcement Location | Test Verification |
| :--- | :--- | :--- |
| **Authentication Enforcement** | `changeRequest.routes.js` (`router.use(requireAuth)`) | Returns 401 for unauthenticated calls to all endpoints. |
| **Requester Identity Integrity** | `changeRequest.service.js:createChangeRequest` | Derived strictly from `req.user._id`. Spoofed client payload ignored. |
| **Multi-Tenant Access Isolation** | `changeRequest.service.js:checkProjectAccess` | Outsiders receive 403 on create, read, decision, and listing. |
| **Client-Only Decision** | `changeRequest.service.js:checkDecisionAccess` | Freelancers receive 403 when attempting decision. |
| **Self-Approval Prohibition** | `changeRequest.service.js:checkDecisionAccess` | Requesters receive 403 even if they are the project client. |
| **Terminal State Immutability** | `changeRequest.service.js:recordDecision` | Approved/rejected requests return 409 Conflict on re-decision. |
| **Draft Protection** | `changeRequest.service.js:recordDecision` | Decisions on draft requests return 400 Bad Request. |
| **Foreign Key Referencing** | `changeRequest.service.js:createChangeRequest` | Milestones and deliverables from other projects return 400 Bad Request. |
| **Mass-Assignment Guard** | `changeRequest.validation.js:createChangeRequestSchema` | Status cannot be set to finalized states on creation. Protected fields ignored. |
| **Proposal Non-Mutation** | Architectural Boundary | Proposal and proposal version documents are never updated by this module. |

---

## 5. Automated Testing & Quality Gates

### Running Focused Change Request Tests:
```bash
cd backend
npx jest tests/changeRequest.test.js --detectOpenHandles --runInBand
```
**Result:** 53 passed, 53 total (100% pass rate).

### Running Full Test Suite:
```bash
cd backend
npm test
```
**Result:** 13 passed, 13 total suites (333 tests passed, 0 failures).

### Running Linter:
```bash
cd backend
npm run lint
```
**Result:** 0 warnings, 0 errors across 78 files with 96 rules.

---

## 6. Integration Checklist for Collaborators

### For Taran (Frontend UI / React SPA)
- Use `POST /api/change-requests` with `projectId`, `title`, `description`, and optional impact/milestone fields.
- Use `GET /api/change-requests?projectId=${projectId}` to populate the Change Requests dashboard.
- Hide review/decision buttons for users with role `'freelancer'` and for the request author.
- Render finalized badges (`Approved`, `Rejected`) and disable decision action forms when status is terminal.

### For Bharat (QA & Automated Testing)
- All 53 integration tests are located in `backend/tests/changeRequest.test.js`.
- Test helpers use standard Mongoose document mocks and avoid modifying persistent state.

### For Shiva (Git Integration)
- The branch `mokshagna` contains the clean commit `daf41c73f691e39ad9dfb122b7384bb9dd03dff6`.
- Only Change Request module files and its test file were modified. Ready for merge review into `main`.

### For Vivek (Team Lead & Shared Architecture)
- Shared models (`Project`, `Proposal`, `Milestone`, `Deliverable`, `User`, `Workspace`) remain unaltered.
- Immutability of approved scope contracts is fully preserved.
- Ready for Review 3 submission.

---

## 7. Known Follow-Ups

1. **Admin-Global Listing:** Admin-global listing without a `projectId` query parameter was intentionally not ported to preserve strict multi-tenant project scoping.
2. **Price Adjustment Sign:** `priceAdjustment` cannot be negative under current schema validation; a product decision is pending regarding support for credits and price discounts.
3. **Demo vs Live Status Alignment:** Demo mode fixtures use status `'submitted'` whereas the live backend uses canonical `'pending_estimate'`.
4. **Atomic Finalized-Status Guard:** The check-then-save guard in `recordDecision` can be upgraded to an atomic conditional update (`findOneAndUpdate` with status filter) in a dedicated refactor alongside test harness modernization.
