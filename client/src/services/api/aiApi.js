import { apiClient } from './apiClient.js';

export async function analyzeScopeMock(input) {
  return apiClient.post('/ai/analyze-mock', input);
}

export async function getAiCases() {
  return apiClient.get('/ai/cases');
}

export async function runAllAiCases() {
  return apiClient.get('/ai/cases/run-all');
}

export async function runAiCase(caseId) {
  return apiClient.get(`/ai/cases/${caseId}/run`);
}
