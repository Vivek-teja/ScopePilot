import { apiClient } from './apiClient.js';

export async function listProposals(projectId) {
  return apiClient.get(`/proposals?projectId=${projectId}`);
}

export async function getProposal(id) {
  return apiClient.get(`/proposals/${id}`);
}

export async function createProposal(data) {
  return apiClient.post('/proposals', data);
}

export async function recordProposalDecision(proposalId, { decision, comment = '' }) {
  return apiClient.post(`/proposals/${proposalId}/decision`, { decision, comment });
}

export async function createProposalVersion(proposalId, versionData) {
  return apiClient.post(`/proposals/${proposalId}/versions`, versionData);
}

export async function getProposalVersion(proposalId, versionNumber) {
  return apiClient.get(`/proposals/${proposalId}/versions/${versionNumber}`);
}
