import test from 'node:test';
import assert from 'node:assert/strict';

// Polyfill in-memory localStorage for Node test runner
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

if (!globalThis.localStorage) {
  globalThis.localStorage = new MemoryStorage();
}

if (!globalThis.window) {
  globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    localStorage: globalThis.localStorage,
  };
}

let importCounter = 0;
async function loadFreshScopePilotService() {
  importCounter += 1;
  const serviceUrl = new URL(`../src/services/scopePilotService.js?t=${Date.now()}_${importCounter}`, import.meta.url).href;
  return import(serviceUrl);
}

test.describe('ScopePilot Frontend Grounded AI Workflow & Dispatching', () => {
  const originalFetch = globalThis.fetch;

  test.beforeEach(() => {
    globalThis.localStorage.clear();
  });

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('Demo mode routes requestAiAnalysis to analyzeScopeMock (/api/ai/analyze-mock)', async () => {
    globalThis.localStorage.setItem('scopepilot:mode', 'demo');

    let calledEndpoint = null;
    globalThis.fetch = async (url) => {
      calledEndpoint = url;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            summary: 'Mock analysis',
            reviewStatus: 'in_scope',
            confidenceScore: 0.95,
            inScopeItems: [],
            outOfScopeItems: [],
            uncertainItems: [],
            recommendations: [],
            disclaimer: 'Advisory draft',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const service = await loadFreshScopePilotService();
    assert.equal(service.getDataSourceMode(), 'demo');

    const result = await service.requestAiAnalysis({
      projectId: 'proj-001',
      approvedProposalVersion: { versionNumber: 1, title: 'T', scopeSummary: 'S', scopeItems: [] },
      deliverables: [{ id: 'd1', title: 'D', scopeReference: 'R', description: '', acceptanceCriteria: [] }],
      newClientRequest: { title: 'Test Request', description: 'Desc' },
    });

    assert.ok(result);
    assert.equal(result.reviewStatus, 'in_scope');
    assert.ok(calledEndpoint.includes('/api/ai/analyze-mock'), `Expected /api/ai/analyze-mock, got ${calledEndpoint}`);
  });

  test('Live mode routes requestAiAnalysis to runAgentAnalysis (/api/ai/agent/analyze)', async () => {
    globalThis.localStorage.setItem('scopepilot:mode', 'live');
    globalThis.localStorage.setItem('scopepilot_auth_token', 'valid-test-jwt');

    let calledEndpoint = null;
    let authHeader = null;

    globalThis.fetch = async (url, options) => {
      calledEndpoint = url;
      authHeader = options?.headers?.Authorization;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            analysisId: 'analysis-123',
            summary: 'Grounded analysis result',
            reviewStatus: 'out_of_scope',
            confidenceScore: 0.92,
            retrievedEvidence: [],
            inScopeItems: [],
            outOfScopeItems: [{ item: 'Work', reason: 'Not in baseline' }],
            uncertainItems: [],
            affectedDeliverables: [],
            effortCalculation: {
              estimatedHours: 18,
              hourlyRate: null,
              estimatedCost: null,
              scheduleImpactDays: 3,
              isEligibleForBilling: false,
              calculationBasis: 'Cost suppressed',
            },
            suggestedQuestions: [],
            humanReviewDraftNotice: 'ADVISORY DRAFT ONLY',
            modelMetadata: { provider: 'local', executionTimeMs: 12 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const service = await loadFreshScopePilotService();
    assert.equal(service.getDataSourceMode(), 'live');

    const result = await service.requestAiAnalysis({
      projectId: '660e1d2f9b1c2d3e4f5a6b7c',
      approvedProposalVersion: { versionNumber: 1, title: 'T', scopeSummary: 'S', scopeItems: [] },
      deliverables: [{ id: 'd1', title: 'D', scopeReference: 'R', description: '', acceptanceCriteria: [] }],
      newClientRequest: { title: 'Test Live Request', description: 'Desc' },
    });

    assert.ok(result);
    assert.equal(result.reviewStatus, 'out_of_scope');
    assert.equal(authHeader, 'Bearer valid-test-jwt');
    assert.ok(calledEndpoint.includes('/api/ai/agent/analyze'), `Expected /api/ai/agent/analyze, got ${calledEndpoint}`);
    assert.equal(result.effortCalculation.estimatedHours, 18);
  });

  test('Failed live requestAiAnalysis does NOT fall back to demo mode, but rejects with error', async () => {
    globalThis.localStorage.setItem('scopepilot:mode', 'live');
    globalThis.localStorage.setItem('scopepilot_auth_token', 'valid-test-jwt');

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Project has no current approved proposal version',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const service = await loadFreshScopePilotService();
    assert.equal(service.getDataSourceMode(), 'live');

    await assert.rejects(
      async () => {
        await service.requestAiAnalysis({
          projectId: '660e1d2f9b1c2d3e4f5a6b7c',
          approvedProposalVersion: { versionNumber: 1, title: 'T', scopeSummary: 'S', scopeItems: [] },
          deliverables: [{ id: 'd1', title: 'D', scopeReference: 'R', description: '', acceptanceCriteria: [] }],
          newClientRequest: { title: 'Test Request', description: 'Desc' },
        });
      },
      (err) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /no current approved proposal/i);
        return true;
      }
    );

    // Mode must remain live!
    assert.equal(service.getDataSourceMode(), 'live');
  });

  test('Cost suppression distinguishes missing trusted rate from scope clarification required', () => {
    function getCostDisplay(effortCalculation, reviewStatus) {
      if (effortCalculation.estimatedCost !== null && effortCalculation.isEligibleForBilling) {
        return `$${effortCalculation.estimatedCost}`;
      }
      if (reviewStatus === 'uncertain' || reviewStatus === 'needs_clarification') {
        return 'Cost suppressed (scope clarification required)';
      }
      return 'Cost suppressed (no trusted rate)';
    }

    // Uncertain / needs_clarification
    const uncertainCase = getCostDisplay({ estimatedCost: null, isEligibleForBilling: false }, 'uncertain');
    assert.equal(uncertainCase, 'Cost suppressed (scope clarification required)');

    const clarifyCase = getCostDisplay({ estimatedCost: null, isEligibleForBilling: false }, 'needs_clarification');
    assert.equal(clarifyCase, 'Cost suppressed (scope clarification required)');

    // Out of scope but no trusted rate
    const noRateCase = getCostDisplay({ estimatedCost: null, isEligibleForBilling: false }, 'out_of_scope');
    assert.equal(noRateCase, 'Cost suppressed (no trusted rate)');

    // Valid billed cost
    const billedCase = getCostDisplay({ estimatedCost: 1500, isEligibleForBilling: true }, 'out_of_scope');
    assert.equal(billedCase, '$1500');
  });
});
