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

// ── Review 3: Semantic Retrieval & RAG Endpoints ─────────────────────────────

export async function retrieveScopePassages(payload) {
  return apiClient.post('/ai/rag/retrieve', payload);
}

export async function getScopeCorpus() {
  return apiClient.get('/ai/rag/corpus');
}

export async function getRetrievalExperiments() {
  return apiClient.get('/ai/rag/experiments');
}

export async function runRetrievalExperiments() {
  return apiClient.get('/ai/rag/experiments/run');
}

