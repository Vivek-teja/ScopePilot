import { apiClient } from './apiClient.js';

export async function listMilestones(projectId) {
  return apiClient.get(`/milestones?projectId=${projectId}`);
}

export async function getMilestone(id) {
  return apiClient.get(`/milestones/${id}`);
}

export async function createMilestone(data) {
  return apiClient.post('/milestones', data);
}

export async function updateMilestone(id, data) {
  return apiClient.patch(`/milestones/${id}`, data);
}

export async function addMilestoneEvidence(milestoneId, evidenceData) {
  return apiClient.post(`/milestones/${milestoneId}/evidence`, evidenceData);
}

export async function recordMilestoneDecision(milestoneId, { decision, comment = '' }) {
  return apiClient.post(`/milestones/${milestoneId}/decision`, { decision, comment });
}
