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

test.describe('ScopePilot Demo-Session Restoration & Guardrails', () => {
  test.beforeEach(() => {
    globalThis.localStorage.clear();
  });

  test('Demo login -> page reload/session restoration -> demo mode remains active and fixture data is used', async () => {
    // 1. Initial page load and demo login as Taran Thalla
    const service1 = await loadFreshScopePilotService();
    const loggedInUser = service1.loginAs('usr-001');

    assert.equal(loggedInUser.id, 'usr-001');
    assert.equal(loggedInUser.name, 'Taran Thalla');
    assert.equal(service1.getDataSourceMode(), 'demo');
    assert.equal(globalThis.localStorage.getItem('scopepilot:mode'), 'demo');

    // 2. Simulate page reload by freshly loading the service module with persisted storage
    const serviceReloaded = await loadFreshScopePilotService();

    // Verify initial state right after script re-evaluation matches demo mode
    assert.equal(
      serviceReloaded.getDataSourceMode(),
      'demo',
      'Initial mode immediately on reload must be demo'
    );

    const initialSession = serviceReloaded.getSession();
    assert.ok(initialSession, 'Synchronous getSession() must find persisted demo user');
    assert.equal(initialSession.id, 'usr-001');

    // 3. Run session restoration
    const restoredUser = await serviceReloaded.restoreSession();
    assert.ok(restoredUser, 'restoreSession() must resolve to persisted demo user');
    assert.equal(restoredUser.id, 'usr-001');
    assert.equal(
      serviceReloaded.getDataSourceMode(),
      'demo',
      'Mode must remain demo after session restoration'
    );

    // 4. Verify data fetch methods return fixture data without hitting live network
    const workspace = await serviceReloaded.fetchWorkspace();
    assert.ok(workspace, 'fetchWorkspace() must return fixture workspace');
    assert.equal(workspace.id, 'ws-001');

    const projects = await serviceReloaded.fetchProjects('ws-001');
    assert.ok(Array.isArray(projects) && projects.length > 0, 'fetchProjects() must return fixture projects');
    assert.equal(projects[0].id, 'proj-001');
    assert.equal(projects[0].name, 'Freelance Portfolio Website');

    const project = await serviceReloaded.fetchProject('proj-001');
    assert.ok(project, 'fetchProject() must return fixture project');
    assert.equal(project.id, 'proj-001');

    const milestones = await serviceReloaded.fetchMilestones('proj-001');
    assert.ok(Array.isArray(milestones) && milestones.length > 0, 'fetchMilestones() must return fixture milestones');

    const deliverables = await serviceReloaded.fetchDeliverables('proj-001');
    assert.ok(Array.isArray(deliverables) && deliverables.length > 0, 'fetchDeliverables() must return fixture deliverables');

    const changeRequests = await serviceReloaded.fetchChangeRequests('proj-001');
    assert.ok(Array.isArray(changeRequests) && changeRequests.length > 0, 'fetchChangeRequests() must return fixture CRs');
  });

  test('Live session with valid token does NOT silently fallback to demo when API is unavailable', async () => {
    // 1. Simulate persisted live session state
    globalThis.localStorage.setItem('scopepilot_auth_token', 'valid-mock-jwt-token');
    globalThis.localStorage.setItem(
      'scopepilot_auth_user',
      JSON.stringify({ _id: '660e1d2f9b1c2d3e4f5a6b7c', name: 'Live User', email: 'live@example.com', role: 'freelancer' })
    );
    globalThis.localStorage.setItem('scopepilot:mode', 'live');

    // Also populate demo store session to ensure it is NOT accidentally picked up
    globalThis.localStorage.setItem(
      'scopepilot:session',
      JSON.stringify({ id: 'usr-001', name: 'Taran Thalla', role: 'freelancer' })
    );

    const originalFetch = globalThis.fetch;
    // Mock fetch to simulate API server down / network failure
    globalThis.fetch = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5000');
    };

    try {
      const service = await loadFreshScopePilotService();

      assert.equal(service.getDataSourceMode(), 'live', 'Mode must be live when live token exists');

      // Attempt to restore session while backend is unavailable
      await assert.rejects(
        async () => {
          await service.restoreSession();
        },
        (err) => {
          assert.equal(err.isLiveApiError, true, 'Error must have isLiveApiError flag set');
          assert.match(err.message, /Live session restoration failed/i);
          return true;
        },
        'restoreSession() must reject when live backend is down'
      );

      // Verify mode remains live and does NOT secretly switch to demo
      assert.equal(service.getDataSourceMode(), 'live', 'Mode must remain live after API error');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('Live session with expired token (401) clears auth session and does NOT fallback to demo', async () => {
    globalThis.localStorage.setItem('scopepilot_auth_token', 'expired-jwt-token');
    globalThis.localStorage.setItem('scopepilot:mode', 'live');
    globalThis.localStorage.setItem(
      'scopepilot:session',
      JSON.stringify({ id: 'usr-001', name: 'Taran Thalla', role: 'freelancer' })
    );

    const originalFetch = globalThis.fetch;
    // Mock 401 response from /auth/me
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ success: false, message: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const service = await loadFreshScopePilotService();
      const user = await service.restoreSession();

      assert.equal(user, null, 'Expired live session must return null to trigger re-login');
      assert.equal(
        globalThis.localStorage.getItem('scopepilot_auth_token'),
        null,
        'Auth token must be cleared on 401'
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('Switching persona in demo mode persists demo mode, and logout cleans up session', async () => {
    const service = await loadFreshScopePilotService();

    // 1. Login as Taran Thalla (freelancer)
    service.loginAs('usr-001');
    assert.equal(service.getDataSourceMode(), 'demo');
    assert.equal(service.getSession().name, 'Taran Thalla');

    // 2. Switch persona to Kenji Watanabe (client)
    const clientUser = service.loginAs('usr-003');
    assert.equal(clientUser.id, 'usr-003');
    assert.equal(clientUser.name, 'Kenji Watanabe');
    assert.equal(service.getDataSourceMode(), 'demo');

    // 3. Reload module and verify Kenji Watanabe is restored
    const serviceReloaded = await loadFreshScopePilotService();
    const restored = await serviceReloaded.restoreSession();
    assert.equal(restored.id, 'usr-003');
    assert.equal(restored.name, 'Kenji Watanabe');
    assert.equal(serviceReloaded.getDataSourceMode(), 'demo');

    // 4. Logout cleans up session
    serviceReloaded.logout();
    assert.equal(serviceReloaded.getSession(), null);
    assert.equal(globalThis.localStorage.getItem('scopepilot:mode'), null);
    assert.equal(globalThis.localStorage.getItem('scopepilot:session'), null);
  });
});
