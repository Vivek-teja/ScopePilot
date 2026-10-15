/**
 * ScopePilot – Demo Store
 *
 * Manages localStorage-backed demo state. All keys are namespaced under
 * STORAGE_KEY so clearing is isolated from any other browser data.
 *
 * This module is the only place that reads/writes localStorage.
 * Real API adapters (Part 2) will replace the read/write implementations
 * without touching consumer code.
 */

import {
  WORKSPACE,
  DEMO_USERS,
  PROJECTS,
  PROPOSALS,
  MILESTONES,
  DELIVERABLES,
  CHANGE_REQUESTS,
  STORAGE_KEY,
} from './fixtures.js';

// ── Seed helpers ──────────────────────────────────────────────────────────────

function load(key) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${key}`, JSON.stringify(value));
  } catch {/* storage full / private mode – silently ignore */ }
}

function seed() {
  if (!load('seeded')) {
    save('changeRequests', CHANGE_REQUESTS);
    save('seeded', true);
  }
}

seed();

// ── Read helpers ──────────────────────────────────────────────────────────────

function getChangeRequests() {
  return load('changeRequests') ?? CHANGE_REQUESTS;
}

// ── Auth / session ────────────────────────────────────────────────────────────

export function getSession() {
  return load('session');    // null means not logged in
}

export function loginAs(userId) {
  const user = DEMO_USERS.find((u) => u.id === userId);
  if (!user) throw new Error(`Unknown demo user: ${userId}`);
  save('session', user);
  return user;
}

export function logout() {
  localStorage.removeItem(`${STORAGE_KEY}:session`);
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export function fetchWorkspace() {
  return Promise.resolve(WORKSPACE);
}

export function fetchWorkspaceMembers() {
  return Promise.resolve(WORKSPACE.members);
}

// ── Projects ──────────────────────────────────────────────────────────────────

export function fetchProjects(workspaceId) {
  const list = PROJECTS.filter((p) => p.workspaceId === workspaceId);
  return Promise.resolve(list);
}

export function fetchProject(projectId) {
  const project = PROJECTS.find((p) => p.id === projectId);
  return project
    ? Promise.resolve(project)
    : Promise.reject(new Error('Project not found'));
}

// ── Proposals ─────────────────────────────────────────────────────────────────

export function fetchProposals(projectId) {
  const list = PROPOSALS.filter((p) => p.projectId === projectId);
  return Promise.resolve(list);
}

export function fetchApprovedProposal(proposalId) {
  const proposal = PROPOSALS.find(
    (p) => p.proposalId === proposalId && p.status === 'approved',
  );
  return proposal
    ? Promise.resolve(proposal)
    : Promise.reject(new Error('No approved proposal found'));
}

// ── Milestones ────────────────────────────────────────────────────────────────

export function fetchMilestones(projectId) {
  const list = MILESTONES.filter((m) => m.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  return Promise.resolve(list);
}

// ── Deliverables ──────────────────────────────────────────────────────────────

export function fetchDeliverables(projectId) {
  const list = DELIVERABLES.filter((d) => d.projectId === projectId);
  return Promise.resolve(list);
}

export function fetchDeliverablesForMilestone(milestoneId) {
  const list = DELIVERABLES.filter((d) => d.milestoneId === milestoneId);
  return Promise.resolve(list);
}

// ── Change Requests ───────────────────────────────────────────────────────────

export function fetchChangeRequests(projectId) {
  const list = getChangeRequests().filter((cr) => cr.projectId === projectId);
  return Promise.resolve(list);
}

export function fetchChangeRequest(crId) {
  const cr = getChangeRequests().find((c) => c.id === crId);
  return cr
    ? Promise.resolve(cr)
    : Promise.reject(new Error('Change request not found'));
}

export function createChangeRequest(data) {
  const existing = getChangeRequests();
  const newCr = {
    id: `cr-${Date.now()}`,
    status: 'submitted',
    humanDecision: 'pending',
    humanDecisionAt: null,
    humanDecisionBy: null,
    humanDecisionNote: null,
    aiAnalysis: null,
    affectedMilestoneIds: [],
    affectedDeliverableIds: [],
    estimatedEffortHours: null,
    scheduleImpactDays: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  };
  save('changeRequests', [...existing, newCr]);
  return Promise.resolve(newCr);
}

/**
 * Simulate a local human decision (demo only – NOT a real approval workflow).
 * Real decision logic lives entirely in the backend.
 */
export function simulateHumanDecision(crId, decision, note, deciderId) {
  const all = getChangeRequests();
  const idx = all.findIndex((c) => c.id === crId);
  if (idx === -1) return Promise.reject(new Error('Change request not found'));

  const updated = {
    ...all[idx],
    humanDecision: decision,
    humanDecisionAt: new Date().toISOString(),
    humanDecisionBy: deciderId,
    humanDecisionNote: note ?? '',
    status: decision === 'approved' ? 'approved' : 'rejected',
    updatedAt: new Date().toISOString(),
  };
  const next = [...all];
  next[idx] = updated;
  save('changeRequests', next);
  return Promise.resolve(updated);
}

// ── Demo reset ────────────────────────────────────────────────────────────────

export function resetDemoData() {
  // Remove all namespaced keys
  const prefix = STORAGE_KEY + ':';
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k));
  // Re-seed
  seed();
}
