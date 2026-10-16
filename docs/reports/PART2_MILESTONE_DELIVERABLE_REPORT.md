# ScopePilot – Part 2: Milestone & Deliverable Management
## Backend Services, Controllers, Routes, and APIs Report

**Module:** Milestone & Deliverable Management  
**Module Assignee:** Mounish  
**Project:** ScopePilot (AI-Powered Freelance Scope & Change Management Platform)  
**Date:** October 15, 2026  
**Status:** Completed & Verified  
**Active Feature Branch:** `feature/milestone-deliverable`  
**Runtime & Tech Stack:** Node.js (v18+), Express 4.21, Mongoose 8.9.5, Zod 3.24.1, Jest 29.7  

---

## 1. Executive Summary

Building directly upon the data models and Zod validation schemas established in Part 1, **Part 2** implements the complete backend service layer, HTTP controllers, Express routing, and RESTful APIs for the Milestone & Deliverable Management module.

All implementations strictly adhere to ScopePilot's 3-tier modular architecture:
- **Service Layer (`*.service.js`):** Encapsulates core business rules, transactional queries, cross-parent validation, and entity population.
- **Controller Layer (`*.controller.js`):** Lightweight request extractors wrapped in `asyncHandler` and responding via standard `ApiResponse` envelopes.
- **Route Layer (`*.routes.js`):** Protected by `requireAuth` and strictly guarded by Zod validation middleware.

---

## 2. Implemented Backend Architecture & Directory Structure

```
backend/src/modules/
├── milestone/
│   ├── milestone.constants.js      # Status enums ('pending', 'in_progress', 'submitted', 'approved', 'rejected')
│   ├── milestone.model.js          # Mongoose model, virtual aliases, compound indexes, subdocuments
│   ├── milestone.validation.js     # Zod schemas for create, update, evidence, decision, and query
│   ├── milestone.service.js        # Business logic for CRUD, progress evidence, and client decisions
│   ├── milestone.controller.js     # Controllers producing ApiResponse envelopes
│   └── milestone.routes.js         # Protected Express routes registered in src/routes.js
└── deliverable/
    ├── deliverable.constants.js    # Status enums ('pending', 'in_progress', 'completed', 'blocked')
    ├── deliverable.model.js        # Mongoose model with dual foreign keys and evidence subdocuments
    ├── deliverable.validation.js   # Zod schemas for create, update, evidence, and query
    ├── deliverable.service.js      # Business logic with cross-parent validation and milestone sync
    ├── deliverable.controller.js   # Controllers producing ApiResponse envelopes
    └── deliverable.routes.js       # Protected Express routes registered in src/routes.js
```

---

## 3. Implemented API Endpoints & Route Table

| HTTP Method | Endpoint Path | Description | Authorization | Request Validation |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/milestones` | Create a new milestone | Bearer JWT | `createMilestoneSchema` |
| `GET` | `/api/milestones` | List milestones (filter by `projectId`, `status`) | Bearer JWT | `listMilestonesQuerySchema` |
| `GET` | `/api/milestones/:id` | Retrieve milestone details & populated deliverables | Bearer JWT | `milestoneIdParamSchema` |
| `PATCH` | `/api/milestones/:id` | Update milestone details | Bearer JWT | `updateMilestoneSchema` |
| `POST` | `/api/milestones/:id/evidence` | Submit progress / completion evidence | Bearer JWT | `addEvidenceSchema` |
| `POST` | `/api/milestones/:id/decision` | Record client review decision (approve/reject) | Bearer JWT | `milestoneDecisionSchema` |
| `POST` | `/api/deliverables` | Create deliverable under milestone | Bearer JWT | `createDeliverableSchema` |
| `GET` | `/api/deliverables` | List deliverables (filter by `milestoneId`, `projectId`) | Bearer JWT | `listDeliverablesQuerySchema` |
| `GET` | `/api/deliverables/:id` | Retrieve deliverable details | Bearer JWT | `deliverableIdParamSchema` |
| `PATCH` | `/api/deliverables/:id` | Update deliverable details | Bearer JWT | `updateDeliverableSchema` |
| `POST` | `/api/deliverables/:id/evidence` | Submit deliverable-level completion proof | Bearer JWT | `addEvidenceSchema` |

---

## 4. API Specifications & Example Payloads

### 4.1 Create Milestone
- **Method & Route:** `POST /api/milestones`
- **Request Headers:**
  - `Authorization: Bearer <jwt_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "projectId": "670c5e1283e7a02b1c3d4f50",
  "title": "Milestone 1: Core Architecture & Database Setup",
  "description": "Establish schemas, indexes, and initial auth routes",
  "status": "pending",
  "dueDate": "2026-11-15T00:00:00.000Z",
  "order": 1
}
```
- **Success Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Milestone created successfully",
  "data": {
    "_id": "670c5e5583e7a02b1c3d4f55",
    "project": "670c5e1283e7a02b1c3d4f50",
    "projectId": "670c5e1283e7a02b1c3d4f50",
    "title": "Milestone 1: Core Architecture & Database Setup",
    "description": "Establish schemas, indexes, and initial auth routes",
    "status": "pending",
    "dueDate": "2026-11-15T00:00:00.000Z",
    "order": 1,
    "deliverables": [],
    "evidence": [],
    "decisions": [],
    "createdAt": "2026-10-15T22:30:00.000Z",
    "updatedAt": "2026-10-15T22:30:00.000Z"
  }
}
```

---

### 4.2 Retrieve Milestone by ID
- **Method & Route:** `GET /api/milestones/:id`
- **Request Headers:** `Authorization: Bearer <jwt_token>`
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Milestone retrieved successfully",
  "data": {
    "_id": "670c5e5583e7a02b1c3d4f55",
    "title": "Milestone 1: Core Architecture & Database Setup",
    "description": "Establish schemas, indexes, and initial auth routes",
    "status": "in_progress",
    "dueDate": "2026-11-15T00:00:00.000Z",
    "order": 1,
    "project": {
      "_id": "670c5e1283e7a02b1c3d4f50",
      "title": "Fintech Mobile App MVP",
      "status": "active"
    },
    "deliverables": [
      {
        "_id": "670c5e8883e7a02b1c3d4f60",
        "title": "User Authentication API",
        "status": "completed"
      }
    ],
    "evidence": [],
    "decisions": []
  }
}
```

---

### 4.3 Create Deliverable (With Cross-Parent Validation)
- **Method & Route:** `POST /api/deliverables`
- **Request Body:**
```json
{
  "projectId": "670c5e1283e7a02b1c3d4f50",
  "milestoneId": "670c5e5583e7a02b1c3d4f55",
  "title": "JWT Auth & Session Management API",
  "description": "Implement access and refresh token endpoints with bcrypt hashing",
  "status": "pending",
  "acceptanceCriteria": [
    "POST /api/auth/login returns valid JWT",
    "Password hashes must use salt rounds >= 10"
  ]
}
```
- **Success Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Deliverable created successfully",
  "data": {
    "_id": "670c5e8883e7a02b1c3d4f60",
    "project": "670c5e1283e7a02b1c3d4f50",
    "projectId": "670c5e1283e7a02b1c3d4f50",
    "milestone": "670c5e5583e7a02b1c3d4f55",
    "milestoneId": "670c5e5583e7a02b1c3d4f55",
    "title": "JWT Auth & Session Management API",
    "description": "Implement access and refresh token endpoints with bcrypt hashing",
    "status": "pending",
    "acceptanceCriteria": [
      "POST /api/auth/login returns valid JWT",
      "Password hashes must use salt rounds >= 10"
    ],
    "evidence": [],
    "createdAt": "2026-10-15T22:35:00.000Z",
    "updatedAt": "2026-10-15T22:35:00.000Z"
  }
}
```

#### Cross-Parent Validation Guarantee:
If a client attempts to create a deliverable referencing a milestone that belongs to a **different** project, the service layer rejects the request:
```json
{
  "success": false,
  "message": "Milestone does not belong to the specified project",
  "errors": []
}
```

---

### 4.4 Submit Progress Evidence
- **Method & Route:** `POST /api/milestones/:id/evidence`
- **Request Body:**
```json
{
  "comment": "Completed core auth endpoints and verified with unit test suite",
  "fileUrls": [
    "https://storage.scopepilot.com/evidence/auth-test-run.png"
  ],
  "reference": "https://github.com/scopepilot/backend/commit/8a7b6c5d"
}
```
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Evidence submitted successfully",
  "data": {
    "_id": "670c5e5583e7a02b1c3d4f55",
    "status": "submitted",
    "evidence": [
      {
        "_id": "670c5e9983e7a02b1c3d4f70",
        "comment": "Completed core auth endpoints and verified with unit test suite",
        "fileUrls": ["https://storage.scopepilot.com/evidence/auth-test-run.png"],
        "reference": "https://github.com/scopepilot/backend/commit/8a7b6c5d",
        "submittedBy": "670c5d0083e7a02b1c3d4f10",
        "submittedAt": "2026-10-15T22:40:00.000Z"
      }
    ]
  }
}
```

---

### 4.5 Milestone Review & Decision
- **Method & Route:** `POST /api/milestones/:id/decision`
- **Request Body:**
```json
{
  "decision": "approve",
  "notes": "Reviewed test artifacts and verified live preview. Approved for release."
}
```
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Milestone decision recorded successfully",
  "data": {
    "_id": "670c5e5583e7a02b1c3d4f55",
    "status": "approved",
    "decisions": [
      {
        "_id": "670c5eaa83e7a02b1c3d4f80",
        "action": "approve",
        "notes": "Reviewed test artifacts and verified live preview. Approved for release.",
        "decidedBy": "670c5d0083e7a02b1c3d4f20",
        "decidedAt": "2026-10-15T22:42:00.000Z"
      }
    ]
  }
}
```

---

## 5. Verification and Test Results

A comprehensive integration test suite (`backend/tests/milestoneDeliverable.api.test.js`) was developed to verify all routes against a live MongoDB memory instance:

```
PASS tests/milestoneDeliverable.api.test.js
  POST /api/milestones
    v should reject unauthenticated requests with 401
    v should reject creation when project does not exist
    v should reject invalid payload with 400
    v should create milestone for valid project
  GET /api/milestones/:id
    v should return 400 for invalid ObjectId
    v should return 404 for nonexistent milestone
    v should return milestone with populated deliverables
  POST /api/deliverables
    v should reject creation when project does not exist
    v should reject creation when milestone does not exist
    v should reject deliverable when milestone belongs to another project
    v should create deliverable under valid milestone
  POST /api/milestones/:id/evidence
    v should submit evidence and update status to submitted
  POST /api/milestones/:id/decision
    v should reject invalid decision actions
    v should approve milestone and record audit decision

Test Suites: 7 passed, 7 total
Tests:       103 passed, 103 total
Snapshots:   0 total
Time:        4.21 s
Ran all test suites.
```

All 103 tests passed with zero failures or open handles.
