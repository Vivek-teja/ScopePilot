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

// ── Review 4 & 5: Grounded Agent & Provider Endpoints ────────────────────────

export async function runAgentAnalysis(payload) {
  return apiClient.post('/ai/agent/analyze', payload);
}

export async function getAiProviders() {
  return apiClient.get('/ai/agent/providers');
}

export async function selectAiProvider(provider) {
  return apiClient.post('/ai/agent/providers/select', { provider });
}

export async function runAgentBenchmark() {
  return apiClient.get('/ai/agent/benchmark');
}

// ── Complete AI, RAG & Scope Chat Integration (Sections 3, 4, 5, 6, 8) ────────

export async function sendScopeChat(payload) {
  return apiClient.post('/scope-chat', payload);
}

export async function runChangeAgent(payload) {
  return apiClient.post('/change-agent', payload);
}

export async function analyzeChangeRequestAi(crId) {
  return apiClient.post(`/change-requests/${crId}/ai-analyze`);
}

export async function ingestScope(payload) {
  return apiClient.post('/ai/rag/ingest', payload);
}

export async function analyzeScopeDb(payload) {
  return apiClient.post('/ai/scope-analysis-db', payload);
}



