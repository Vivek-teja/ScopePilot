import { apiClient } from './apiClient.js';

export async function listWorkspaces() {
  return apiClient.get('/workspaces');
}

export async function getWorkspace(id) {
  return apiClient.get(`/workspaces/${id}`);
}

export async function getWorkspaceMembers(id) {
  return apiClient.get(`/workspaces/${id}/members`);
}

export async function createWorkspace(data) {
  return apiClient.post('/workspaces', data);
}

export async function inviteMember(workspaceId, invitationData) {
  return apiClient.post(`/workspaces/${workspaceId}/invitations`, invitationData);
}
