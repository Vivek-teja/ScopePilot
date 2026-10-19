# ScopePilot — Product Requirements Document (PRD)

> **Status:** Audited against repository `main` (`93b9af3def1bf4bbeda6ff65cf0b7bd797679d0c`).

## 1. Problem Statement & Core Value Proposition

Freelance development projects frequently suffer from scope creep, ambiguous change requests, unbudgeted revisions, and dispute-prone milestone sign-offs. ScopePilot provides an AI-assisted scope and change management platform that:
- Establishes a frozen, contractual scope baseline upon proposal approval.
- Enforces strict role-based milestones where only clients can record approval/rejection decisions.
- Automatically analyzes change requests against approved deliverables using deterministic AI contracts to classify them as `in_scope`, `out_of_scope`, `partially_out_of_scope`, `needs_clarification`, or `uncertain`.
- Preserves human decision boundaries: AI outputs are advisory drafts; binding adjustments require authenticated human approval.

## 2. User Personas

| Persona | Role | Primary Responsibilities & Goals |
|---|---|---|
| Alex | Freelancer | Creates projects and proposals, submits progress evidence, formulates priced change requests, and protects against unpaid scope creep. |
| Sarah | Client | Reviews and approves proposals, inspects milestone evidence, reviews AI change evaluations, and approves/rejects change requests. |
| David | Workspace Owner / Admin | Manages workspace members, invites collaborators, oversees multi-tenant project directory, and resolves project escalations. |

## 3. Product Epics & Implementation Status

| Epic | Description | Verified Status |
|---|---|---|
| **Epic 1: Authentication & User Accounts** | User registration, stateless Bearer JWT login, role assignment (`freelancer`, `client`, `admin`), password hashing with bcrypt. Direct registration (no email verification tokens). | **Implemented (Untested)** *(0 dedicated automated tests)* |
| **Epic 2: Workspaces & Multi-Tenancy** | Workspaces, memberships, invitations, and workspace tenancy boundaries. | **Implemented (Untested)** *(0 dedicated automated tests)* |
| **Epic 3: Projects & Proposals** | Project creation and workspace scoping (verified with 19 tests). Proposal v1 baseline creation and client approval locking implemented (untested); superseding v2+ revisions not implemented. | **Partially Implemented (Untested Proposal)** *(0 dedicated proposal tests)* |
| **Epic 4: Milestones & Deliverables** | Milestone timeline, deliverable tracking, evidence submission, client-only decisions (`checkDecisionAccess`), and scoped project queries. Milestone decisions do not cascade to child deliverables. | **Implemented & Verified** *(97 tests across API and model suites)* |
| **Epic 5: Change Requests** | Intake and decision endpoints exist, but module is a partial prototype: missing listing endpoint (`GET /api/change-requests`), lacks project tenancy checks, contains unresolved freelancer self-approval vulnerability, and lacks impact maths. | **Partial Prototype Stub (Insecure & Untested)** *(Unresolved: freelancer self-approval permitted, missing tenancy isolation; 0 dedicated tests)* |
| **Epic 6: AI Change Analysis** | Zod input/output contracts, 5 canonical review scenarios, deterministic rule-based evaluation, and CLI runner. Review 3 live RAG & vector search planned. | **Review 1 & 2 Implemented & Verified** *(26 tests across 3 suites)* |
| **Epic 7: Frontend Application** | React 19 SPA under `client/` with AppShell, role switcher, project views, and in-browser mock store (`demoStore.js`). Builds cleanly in Vite; live backend API wiring pending. | **Implemented as Standalone Prototype** *(Vite Build Passing)* |

## 4. Key Constraints & Non-Functional Requirements

- **Human Decision Boundary:** AI analysis must remain non-binding advisory guidance (`disclaimer` required in all outputs). Financial and timeline adjustments require deterministic calculation and authenticated human sign-off.
- **Tenancy Isolation:** All queries for projects, milestones, deliverables, proposals, and change requests must enforce workspace or project membership.
- **Decision Security Hardening:** Change request decision recording must be hardened to restrict decisions strictly to the assigned client and prevent unauthorized freelancer self-approval. (Currently an UNRESOLVED security flaw in backend application code).
- **Deterministic AI Fallback:** The mock evaluation engine must produce identical outputs on repeated inputs across all 5 canonical cases.
