import { apiClient } from './apiClient.js';

export async function listDeliverables({ projectId, milestoneId, status } = {}) {
  const query = new URLSearchParams();
  if (projectId) query.set('projectId', projectId);
  if (milestoneId) query.set('milestoneId', milestoneId);
  if (status) query.set('status', status);
  const queryString = query.toString();
  return apiClient.get(`/deliverables${queryString ? `?${queryString}` : ''}`);
}

export async function getDeliverable(id) {
  return apiClient.get(`/deliverables/${id}`);
}

export async function createDeliverable(data) {
  return apiClient.post('/deliverables', data);
}

export async function updateDeliverable(id, data) {
  return apiClient.patch(`/deliverables/${id}`, data);
}

export async function addDeliverableEvidence(deliverableId, evidenceData) {
  return apiClient.post(`/deliverables/${deliverableId}/evidence`, evidenceData);
}
