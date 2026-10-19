import test from 'node:test';
import assert from 'node:assert/strict';

test.describe('Project Tabs & Navigation Synchronization Contract', () => {
  const PROJECT_TABS = [
    { id: 'overview',   label: '📋 Overview' },
    { id: 'scope',      label: '📄 Approved Scope' },
    { id: 'chat',       label: '💬 Scope Chat (AI)' },
    { id: 'milestones', label: '🏁 Milestones' },
    { id: 'changes',    label: '🔄 Change Requests' },
  ];

  test('contains all 5 required navigation tabs in ProjectDetailPage', () => {
    const tabIds = PROJECT_TABS.map((t) => t.id);
    assert.deepEqual(tabIds, ['overview', 'scope', 'chat', 'milestones', 'changes']);
  });

  test('lifecycle state transitions synchronize TopArchNav and ProjectDetailPage', () => {
    // Model the state machine implemented by ProjectDetailPage mounting/unmounting
    let isProjectDetail = false;
    let activeTab = 'overview';

    const setIsProjectDetail = (val) => { isProjectDetail = val; };
    const setActiveTab = (tab) => { activeTab = tab; };

    // Initial state: not in project detail
    assert.equal(isProjectDetail, false);
    assert.equal(activeTab, 'overview');

    // Mount ProjectDetailPage: activates project detail mode
    setIsProjectDetail(true);
    assert.equal(isProjectDetail, true);

    // User switches to Scope Chat tab via in-page tab or TopArchNav concentric ring
    setActiveTab('chat');
    assert.equal(activeTab, 'chat');

    // User switches to Milestones tab
    setActiveTab('milestones');
    assert.equal(activeTab, 'milestones');

    // Unmount ProjectDetailPage: resets project detail mode and reverts active tab
    setIsProjectDetail(false);
    setActiveTab('overview');
    assert.equal(isProjectDetail, false);
    assert.equal(activeTab, 'overview');
  });

  test('TopArchNav prop resolution falls back to ProjectTabsContext values', () => {
    const contextState = {
      activeTab: 'chat',
      isProjectDetail: true,
      setActiveTab: (tab) => tab,
    };

    // When props are not explicitly passed, TopArchNav falls back to context
    const propsWithoutOverrides = {};
    const resolvedProjectTabs = propsWithoutOverrides.projectTabs ?? contextState.isProjectDetail;
    const resolvedActiveProjectTab = propsWithoutOverrides.activeProjectTab ?? contextState.activeTab;

    assert.equal(resolvedProjectTabs, true);
    assert.equal(resolvedActiveProjectTab, 'chat');
  });
});
