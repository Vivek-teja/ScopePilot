import { apiClient } from './apiClient.js';

export async function listChangeRequests(projectId, status) {
  const query = new URLSearchParams({ projectId });
  if (status) query.set('status', status);
  return apiClient.get(`/change-requests?${query.toString()}`);
}

export async function getChangeRequest(id) {
  return apiClient.get(`/change-requests/${id}`);
}

export async function createChangeRequest(data) {
  return apiClient.post('/change-requests', data);
}

export async function recordChangeRequestDecision(id, { decision, comment = '' }) {
  return apiClient.post(`/change-requests/${id}/decision`, { decision, comment });
}
