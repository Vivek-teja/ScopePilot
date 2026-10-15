/**
 * ScopePilot – Service Layer (Data Access Interface)
 *
 * Components and pages import from HERE, never from mocks/ directly.
 * In Part 2, replace the import below with real API adapter(s)
 * that translate backend responses into the same view-model shapes.
 *
 * TODO (Part 2): swap demoStore with real API clients:
 *   import * as authApi      from './adapters/authApi.js';
 *   import * as workspaceApi from './adapters/workspaceApi.js';
 *   import * as projectApi   from './adapters/projectApi.js';
 *   import * as proposalApi  from './adapters/proposalApi.js';
 *   import * as milestoneApi from './adapters/milestoneApi.js';
 *   import * as changeApi    from './adapters/changeApi.js';
 */

export {
  getSession,
  loginAs,
  logout,
  fetchWorkspace,
  fetchWorkspaceMembers,
  fetchProjects,
  fetchProject,
  fetchProposals,
  fetchApprovedProposal,
  fetchMilestones,
  fetchDeliverables,
  fetchDeliverablesForMilestone,
  fetchChangeRequests,
  fetchChangeRequest,
  createChangeRequest,
  simulateHumanDecision,
  resetDemoData,
} from '../mocks/demoStore.js';
