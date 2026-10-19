import { apiClient } from './apiClient.js';

export async function listProjects(params = {}) {
  const query = new URLSearchParams();
  if (params.workspaceId || params.workspace) {
    query.set('workspaceId', params.workspaceId || params.workspace);
  }
  if (params.status) {
    query.set('status', params.status);
  }
  const queryString = query.toString();
  return apiClient.get(`/projects${queryString ? `?${queryString}` : ''}`);
}

export async function getProject(id) {
  return apiClient.get(`/projects/${id}`);
}

export async function createProject(data) {
  return apiClient.post('/projects', data);
}
