/**
 * ScopePilot – Central Service Layer & API Adapter
 *
 * Translates backend API contracts into normalized view-model shapes for the React UI.
 * Connects directly to Node.js/Express backend endpoints.
 */

import * as authApi from './api/authApi.js';
import * as workspaceApi from './api/workspaceApi.js';
import * as projectApi from './api/projectApi.js';
import * as proposalApi from './api/proposalApi.js';
import * as milestoneApi from './api/milestoneApi.js';
import * as deliverableApi from './api/deliverableApi.js';
import * as changeRequestApi from './api/changeRequestApi.js';
import * as aiApi from './api/aiApi.js';
import * as demoStore from '../mocks/demoStore.js';

let isLiveBackend = true;

export function getDataSourceMode() {
  return isLiveBackend ? 'live' : 'demo';
}

export function setDataSourceMode(mode) {
  isLiveBackend = mode === 'live';
}

// ── Auth & Session ────────────────────────────────────────────────────────────

export function getSession() {
  const user = authApi.getCurrentSession();
  if (user) {
    return normalizeUser(user);
  }
  return demoStore.getSession();
}

export async function loginWithCredentials(email, password) {
  const result = await authApi.login({ email, password });
  isLiveBackend = true;
  return normalizeUser(result.user);
}

export async function registerWithCredentials({ name, email, password, role }) {
  const result = await authApi.register({ name, email, password, role });
  isLiveBackend = true;
  return normalizeUser(result.user);
}

export function loginAs(userId) {
  // Demo perspective switcher fallback
  isLiveBackend = false;
  return demoStore.loginAs(userId);
}

export function logout() {
  authApi.logout();
  demoStore.logout();
}

export async function restoreSession() {
  try {
    const user = await authApi.getMe();
    if (user) {
      isLiveBackend = true;
      return normalizeUser(user);
    }
  } catch {
    // If backend fails, fallback to local demo session if present
  }
  return demoStore.getSession();
}

function normalizeUser(u) {
  if (!u) return null;
  const id = (u._id || u.id || '').toString();
  const name = u.name || 'ScopePilot User';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return {
    id,
    _id: id,
    name,
    email: u.email,
    role: u.role || 'freelancer',
    avatar: initials,
  };
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export async function fetchWorkspace() {
  try {
    const workspaces = await workspaceApi.listWorkspaces();
    if (Array.isArray(workspaces) && workspaces.length > 0) {
      const ws = workspaces[0];
      return normalizeWorkspace(ws);
    }
  } catch (err) {
    if (!err.isUnauthorized) {
      // Fallback only if running in demo mode
      if (!isLiveBackend) return demoStore.fetchWorkspace();
    }
    throw err;
  }

  // If user has no workspaces yet, fallback to demo or return empty
  if (!isLiveBackend) return demoStore.fetchWorkspace();
  return null;
}

export async function fetchWorkspaceMembers(workspaceId) {
  try {
    if (workspaceId) {
      const members = await workspaceApi.getWorkspaceMembers(workspaceId);
      return (members || []).map(normalizeMember);
    }
    const workspaces = await workspaceApi.listWorkspaces();
    if (workspaces && workspaces[0]) {
      const members = await workspaceApi.getWorkspaceMembers(workspaces[0]._id);
      return (members || []).map(normalizeMember);
    }
  } catch (err) {
    if (!isLiveBackend) return demoStore.fetchWorkspaceMembers();
    throw err;
  }
  return [];
}

function normalizeWorkspace(ws) {
  if (!ws) return null;
  return {
    id: (ws._id || ws.id).toString(),
    _id: (ws._id || ws.id).toString(),
    name: ws.name,
    slug: ws.slug || ws.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    description: ws.description || 'Workspace for client projects and scope management.',
    createdAt: ws.createdAt ? new Date(ws.createdAt).toLocaleDateString() : 'Recent',
    owner: ws.owner,
    members: (ws.members || []).map(normalizeMember),
  };
}

function normalizeMember(m) {
  const user = m.user || {};
  const name = user.name || m.name || 'Member';
  return {
    id: (user._id || m.id || m._id || '').toString(),
    name,
    email: user.email || m.email,
    role: m.role || user.role || 'member',
    avatar: name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
  };
}

// Helper to check for 24-hex MongoDB ObjectId
const isObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

// ── Projects ──────────────────────────────────────────────────────────────────

export async function fetchProjects(workspaceId) {
  try {
    const query = {};
    if (workspaceId && isObjectId(workspaceId)) {
      query.workspaceId = workspaceId;
    }
    const projects = await projectApi.listProjects(query);
    if (Array.isArray(projects) && projects.length > 0) {
      return projects.map(normalizeProject);
    }
    // If backend returns empty list and user is in demo mode, fallback to demo fixtures
    if (!isLiveBackend) return demoStore.fetchProjects(workspaceId);
    return (projects || []).map(normalizeProject);
  } catch (err) {
    if (!isLiveBackend) return demoStore.fetchProjects(workspaceId);
    throw err;
  }
}

export async function fetchProject(projectId) {
  if (!isObjectId(projectId)) {
    return demoStore.fetchProject(projectId);
  }
  try {
    const project = await projectApi.getProject(projectId);
    return normalizeProject(project);
  } catch (err) {
    if (!isLiveBackend) return demoStore.fetchProject(projectId);
    throw err;
  }
}

function normalizeProject(p) {
  if (!p) return null;
  const id = (p._id || p.id).toString();
  const approvedVersion = p.currentApprovedProposal?.versionNumber || 1;
  const approvedProposalId = p.currentApprovedProposal?._id
    ? p.currentApprovedProposal._id.toString()
    : p.currentApprovedProposal
    ? p.currentApprovedProposal.toString()
    : null;

  return {
    id,
    _id: id,
    workspaceId: (p.workspace?._id || p.workspace || '').toString(),
    name: p.title || p.name || 'Untitled Project',
    title: p.title || p.name || 'Untitled Project',
    summary: p.description || p.summary || 'No project description provided.',
    description: p.description || p.summary || '',
    clientId: (p.client?._id || p.client || '').toString(),
    freelancerId: (p.freelancer?._id || p.freelancer || '').toString(),
    client: p.client,
    freelancer: p.freelancer,
    status: p.status || 'active',
    startDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '2025-09-01',
    estimatedEndDate: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '2025-12-15',
    tags: p.tags || ['scope', 'milestones'],
    approvedProposalId,
    activeProposalVersion: approvedVersion,
  };
}

// ── Proposals ─────────────────────────────────────────────────────────────────

export async function fetchProposals(projectId) {
  if (!isObjectId(projectId)) {
    return demoStore.fetchProposals(projectId);
  }
  try {
    const proposals = await proposalApi.listProposals(projectId);
    const flattened = [];
    (proposals || []).forEach((prop) => {
      const versions = prop.versions || [];
      if (versions.length > 0) {
        versions.forEach((v) => {
          flattened.push(normalizeProposalVersion(v, prop));
        });
      } else if (prop.activeVersion) {
        flattened.push(normalizeProposalVersion(prop.activeVersion, prop));
      }
    });
    return flattened;
  } catch (err) {
    if (!isLiveBackend) return demoStore.fetchProposals(projectId);
    throw err;
  }
}

export async function fetchApprovedProposal(proposalId) {
  if (!proposalId) return null;
  if (!isObjectId(proposalId)) {
    return demoStore.fetchApprovedProposal(proposalId);
  }
  try {
    const result = await proposalApi.getProposal(proposalId);
    const prop = result.proposal || result;
    const versions = result.versions || [];
    const approved = versions.find((v) => v.status === 'approved') || prop.activeVersion;
    if (approved) {
      return normalizeProposalVersion(approved, prop);
    }
  } catch (err) {
    if (!isLiveBackend) return demoStore.fetchApprovedProposal(proposalId);
    throw err;
  }
  if (!isLiveBackend) return demoStore.fetchApprovedProposal(proposalId);
  return null;
}

export async function recordProposalDecision(proposalId, decision, comment) {
  if (!isObjectId(proposalId)) {
    return { success: true };
  }
  return proposalApi.recordProposalDecision(proposalId, { decision, comment });
}

function normalizeProposalVersion(v, parentProp = {}) {
  const id = (v._id || v.id || '').toString();
  const parentId = (parentProp._id || parentProp.id || v.proposal || '').toString();
  const deliverables = (v.scopeItems || []).map((item) =>
    typeof item === 'string' ? item : item.title || item.description || 'Deliverable'
  );

  return {
    id,
    _id: id,
    proposalId: parentId,
    projectId: (v.project || parentProp.project || '').toString(),
    version: v.versionNumber || 1,
    status: v.status || 'draft',
    title: v.title || parentProp.title || `Proposal v${v.versionNumber || 1}`,
    agreedDeliverables: deliverables.length > 0 ? deliverables : ['Core Scope Deliverables'],
    scopeItems: v.scopeItems || [],
    revisionLimit: 3,
    revisionsUsed: 1,
    agreedPrice: v.totalBudget || 0,
    currency: v.currency || 'USD',
    startDate: v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—',
    endDate: v.updatedAt ? new Date(v.updatedAt).toLocaleDateString() : '—',
    approvedBy: v.decidedBy?.name || (v.decidedBy ? v.decidedBy.toString() : null),
    approvedAt: v.decidedAt ? new Date(v.decidedAt).toLocaleDateString() : null,
    notes: v.decisionComment || v.scopeSummary || '',
  };
}

// ── Milestones & Deliverables ─────────────────────────────────────────────────

export async function fetchMilestones(projectId) {
  if (!isObjectId(projectId)) {
    return demoStore.fetchMilestones(projectId);
  }
  try {
    const milestones = await milestoneApi.listMilestones(projectId);
    return (milestones || []).map(normalizeMilestone);
  } catch (err) {
    if (!isLiveBackend) return demoStore.fetchMilestones(projectId);
    throw err;
  }
}

function normalizeMilestone(ms) {
  const id = (ms._id || ms.id).toString();
  const isApproved = ms.status === 'approved';
  return {
    id,
    _id: id,
    projectId: (ms.project?._id || ms.project || '').toString(),
    title: ms.title,
    description: ms.description || '',
    status: ms.status || 'pending',
    dueDate: ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : 'TBD',
    completedAt: isApproved && ms.updatedAt ? new Date(ms.updatedAt).toLocaleDateString() : null,
    progressPct: isApproved ? 100 : ms.status === 'in_progress' ? 60 : 0,
    order: ms.order || 1,
    deliverables: ms.deliverables || [],
  };
}

export async function fetchDeliverables(projectId) {
  if (!isObjectId(projectId)) {
    return demoStore.fetchDeliverables(projectId);
  }
  try {
    const deliverables = await deliverableApi.listDeliverables({ projectId });
    return (deliverables || []).map(normalizeDeliverable);
  } catch (err) {
    if (!isLiveBackend) return demoStore.fetchDeliverables(projectId);
    throw err;
  }
}

export async function fetchDeliverablesForMilestone(milestoneId) {
  if (!isObjectId(milestoneId)) {
    return demoStore.fetchDeliverablesForMilestone(milestoneId);
  }
  try {
    const deliverables = await deliverableApi.listDeliverables({ milestoneId });
    return (deliverables || []).map(normalizeDeliverable);
  } catch (err) {
    if (!isLiveBackend) return demoStore.fetchDeliverablesForMilestone(milestoneId);
    throw err;
  }
}

function normalizeDeliverable(d) {
  const id = (d._id || d.id).toString();
  return {
    id,
    _id: id,
    milestoneId: (d.milestone?._id || d.milestone || '').toString(),
    projectId: (d.project?._id || d.project || '').toString(),
    title: d.title,
    description: d.description || '',
    scopeReference: d.scopeReference || '',
    status: d.status || 'pending',
    dueDate: d.dueDate ? new Date(d.dueDate).toLocaleDateString() : 'TBD',
    evidenceUrl: d.evidenceUrls?.[0] || d.evidence?.[0]?.fileUrls?.[0] || null,
    acceptanceCriteria: d.acceptanceCriteria || [],
    notes: d.notes || '',
  };
}

// ── Change Requests ───────────────────────────────────────────────────────────

export async function fetchChangeRequests(projectId) {
  if (!isObjectId(projectId)) {
    return demoStore.fetchChangeRequests(projectId);
  }
  try {
    const list = await changeRequestApi.listChangeRequests(projectId);
    return (list || []).map(normalizeChangeRequest);
  } catch (err) {
    if (!isLiveBackend) return demoStore.fetchChangeRequests(projectId);
    throw err;
  }
}

export async function fetchChangeRequest(crId) {
  if (!isObjectId(crId)) {
    return demoStore.fetchChangeRequest(crId);
  }
  try {
    const cr = await changeRequestApi.getChangeRequest(crId);
    return normalizeChangeRequest(cr);
  } catch (err) {
    if (!isLiveBackend) return demoStore.fetchChangeRequest(crId);
    throw err;
  }
}

export async function createChangeRequest(data) {
  if (!isObjectId(data.projectId)) {
    return demoStore.createChangeRequest(data);
  }
  try {
    const payload = {
      projectId: data.projectId,
      title: data.title,
      description: data.newWork || data.summary || data.description || '',
      effortEstimate: Number(data.estimatedEffortHours) || 0,
      priceAdjustment: Number(data.priceAdjustment) || 0,
    };
    const created = await changeRequestApi.createChangeRequest(payload);
    return normalizeChangeRequest(created);
  } catch (err) {
    if (!isLiveBackend) return demoStore.createChangeRequest(data);
    throw err;
  }
}

export async function recordChangeRequestDecision(crId, decision, comment) {
  if (!isObjectId(crId)) {
    return demoStore.simulateHumanDecision(crId, decision, comment);
  }
  try {
    const updated = await changeRequestApi.recordChangeRequestDecision(crId, { decision, comment });
    return normalizeChangeRequest(updated);
  } catch (err) {
    if (!isLiveBackend) return demoStore.simulateHumanDecision(crId, decision, comment);
    throw err;
  }
}

export function simulateHumanDecision(crId, decision, note, _deciderId) {
  // Alias for backwards-compatibility with component calls
  return recordChangeRequestDecision(crId, decision, note);
}

function normalizeChangeRequest(cr) {
  if (!cr) return null;
  const id = (cr._id || cr.id).toString();
  const decisionObj = cr.clientDecision || cr.freelancerDecision || {};
  const rawDecision = decisionObj.decision;
  const humanDecision =
    rawDecision === 'approve'
      ? 'approved'
      : rawDecision === 'reject'
        ? 'rejected'
        : (cr.status === 'approved' ? 'approved' : cr.status === 'rejected' ? 'rejected' : 'pending');

  return {
    id,
    _id: id,
    projectId: (cr.project?._id || cr.project || '').toString(),
    title: cr.title,
    summary: cr.description || '',
    newWork: cr.description || '',
    requestedBy: cr.requestedBy?.name || cr.requestedBy?.email || cr.requestedBy || 'Project Member',
    status: cr.status || 'draft',
    priority: cr.priority || 'medium',
    affectedMilestoneIds: (cr.affectedMilestones || []).map((m) => (m._id || m).toString()),
    affectedDeliverableIds: (cr.relatedDeliverables || []).map((d) => (d._id || d).toString()),
    estimatedEffortHours: cr.effortEstimate || null,
    scheduleImpactDays: cr.scheduleImpact?.daysAdded || null,
    humanDecision,
    humanDecisionAt: decisionObj.decidedAt || null,
    humanDecisionBy: decisionObj.decidedBy || null,
    humanDecisionNote: decisionObj.comment || '',
    aiAnalysis: cr.aiAnalysis || null,
    createdAt: cr.createdAt || new Date().toISOString(),
    updatedAt: cr.updatedAt || new Date().toISOString(),
  };
}

// ── AI Scope Analysis ─────────────────────────────────────────────────────────

export async function requestAiAnalysis(analysisInput) {
  return aiApi.analyzeScopeMock(analysisInput);
}

export async function retrieveScopePassages(payload) {
  return aiApi.retrieveScopePassages(payload);
}

export async function getScopeCorpus() {
  return aiApi.getScopeCorpus();
}

export async function runAgentAnalysis(payload) {
  return aiApi.runAgentAnalysis(payload);
}

export async function getAiProviders() {
  return aiApi.getAiProviders();
}

export async function selectAiProvider(provider) {
  return aiApi.selectAiProvider(provider);
}

export async function runAgentBenchmark() {
  return aiApi.runAgentBenchmark();
}

export function resetDemoData() {
  demoStore.resetDemoData();
}


