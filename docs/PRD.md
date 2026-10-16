# ScopePilot — Product Requirements Document (PRD)

> **Status:** Audited against repository `main` (`26f646dd0da12cfb53210824ebd0d9e15d9abc46`).

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
| **Epic 1: Authentication & User Accounts** | User registration, JWT login, role assignment (`freelancer`, `client`, `admin`), password hashing. | **Implemented & Verified** |
| **Epic 2: Workspaces & Multi-Tenancy** | Workspaces, memberships, invitations, and workspace tenancy boundaries. | **Implemented & Verified** |
| **Epic 3: Projects & Proposals** | Project creation, client/freelancer association, proposal versioning, and frozen approved scope items. | **Implemented & Verified** |
| **Epic 4: Milestones & Deliverables** | Milestone timeline, deliverable tracking, evidence submission, client-only decisions, and scoped project queries. | **Implemented & Verified** |
| **Epic 5: Change Requests** | Change request submission, review status transitions, and client approval/rejection decision endpoints. | **Base Implemented; UI wire-up in progress** |
| **Epic 6: AI Change Analysis** | Zod input/output contracts, 5 canonical review scenarios, deterministic rule-based evaluation, and CLI runner. | **Review 1 & 2 Implemented; Review 3 live RAG planned** |
| **Epic 7: Frontend Application** | React SPA under `client/` with AppShell, role switcher, project views, and demo store. | **Implemented & Verified (Vite Build Passing)** |

## 4. Key Constraints & Non-Functional Requirements

- **Human Decision Boundary:** AI analysis must remain non-binding advisory guidance (`disclaimer` required in all outputs). Financial and timeline adjustments require deterministic calculation and authenticated human sign-off.
- **Tenancy Isolation:** All queries for projects, milestones, deliverables, and proposals must enforce workspace or project membership.
- **Deterministic AI Fallback:** The mock evaluation engine must produce identical outputs on repeated inputs across all 5 canonical cases.
