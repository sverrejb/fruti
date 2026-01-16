// Tracking excludes active tab to keep indicators only on background tabs
const MAX_TRACKED_TABS = 5;
const windowStates = new Map();
let currentStyle = 'numbers';
let customIndicators = ['1', '2', '3', '4', '5'];
let enableMinTabThreshold = false;
let minTabThreshold = 10;

function getWindowState(windowId) {
  if (!windowStates.has(windowId)) {
    windowStates.set(windowId, {
      recentTabs: [],
      currentActiveTabId: null,
      tabCount: 0,
      lastRanks: new Map()
    });
  }
  return windowStates.get(windowId);
}

async function saveWindowStates() {
  const statesObj = {};
  for (const [windowId, state] of windowStates.entries()) {
    statesObj[windowId] = {
      recentTabs: state.recentTabs,
      currentActiveTabId: state.currentActiveTabId,
      tabCount: state.tabCount
      // Don't save lastRanks Map, it's just for diffing
    };
  }
  await browser.storage.local.set({ windowStates: statesObj });
}

async function loadWindowStates() {
  const result = await browser.storage.local.get('windowStates');
  if (result.windowStates) {
    for (const [windowId, state] of Object.entries(result.windowStates)) {
      windowStates.set(parseInt(windowId), {
        recentTabs: state.recentTabs || [],
        currentActiveTabId: state.currentActiveTabId || null,
        tabCount: state.tabCount || 0,
        lastRanks: new Map()
      });
    }
  }
}

async function loadIndicatorStyle() {
  const result = await browser.storage.local.get(['indicatorStyle', 'customIndicators', 'enableMinTabThreshold', 'minTabThreshold']);
  currentStyle = result.indicatorStyle || 'numbers';
  customIndicators = result.customIndicators || ['1', '2', '3', '4', '5'];
  enableMinTabThreshold = result.enableMinTabThreshold || false;
  minTabThreshold = result.minTabThreshold || 10;
}

function findTabIndex(windowId, tabId) {
  const state = getWindowState(windowId);
  return state.recentTabs.indexOf(tabId);
}

async function sendRankUpdate(tabId, rank) {
  try {
    await browser.tabs.sendMessage(tabId, {
      type: 'UPDATE_RANK',
      rank: rank,
      style: currentStyle,
      customIndicators: customIndicators
    });
  } catch (error) {
    // System pages (about:, chrome://) don't allow content scripts
  }
}

async function sendRankRemoval(tabId) {
  try {
    await browser.tabs.sendMessage(tabId, {
      type: 'REMOVE_RANK'
    });
  } catch (error) {
    // System pages (about:, chrome://) don't allow content scripts
  }
}

function shouldTrackWindow(windowId) {
  if (!enableMinTabThreshold) {
    return true;
  }
  const state = getWindowState(windowId);
  return state.tabCount >= minTabThreshold;
}

// Only sends updates to tabs whose rank changed, avoiding unnecessary IPC
async function updateAllTabRanks(windowId) {
  const state = getWindowState(windowId);

  if (!shouldTrackWindow(windowId)) {
    for (let i = 0; i < state.recentTabs.length; i++) {
      const tabId = state.recentTabs[i];
      if (state.lastRanks.has(tabId)) {
        await sendRankRemoval(tabId);
        state.lastRanks.delete(tabId);
      }
    }
    return;
  }

  const newRanks = new Map();
  for (let i = 0; i < state.recentTabs.length; i++) {
    const tabId = state.recentTabs[i];
    newRanks.set(tabId, i);

    if (state.lastRanks.get(tabId) !== i) {
      await sendRankUpdate(tabId, i);
    }
  }

  for (const [tabId] of state.lastRanks) {
    if (!newRanks.has(tabId)) {
      await sendRankRemoval(tabId);
    }
  }

  state.lastRanks = newRanks;
}

async function onTabActivated(tabId, windowId) {
  const state = getWindowState(windowId);

  if (state.currentActiveTabId !== null) {
    const existingIndex = state.recentTabs.indexOf(state.currentActiveTabId);
    if (existingIndex !== -1) {
      state.recentTabs.splice(existingIndex, 1);
    }

    state.recentTabs.unshift(state.currentActiveTabId);

    if (state.recentTabs.length > MAX_TRACKED_TABS) {
      const removedTabId = state.recentTabs.pop();
      await sendRankRemoval(removedTabId);
    }
  }

  const newActiveIndex = state.recentTabs.indexOf(tabId);
  if (newActiveIndex !== -1) {
    state.recentTabs.splice(newActiveIndex, 1);
  }
  await sendRankRemoval(tabId);

  state.currentActiveTabId = tabId;

  await updateAllTabRanks(windowId);
  await saveWindowStates();
}

browser.tabs.onActivated.addListener(async (activeInfo) => {
  await onTabActivated(activeInfo.tabId, activeInfo.windowId);
});

browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const windowId = removeInfo.windowId;
  const state = getWindowState(windowId);

  state.tabCount = Math.max(0, state.tabCount - 1);

  if (tabId === state.currentActiveTabId) {
    state.currentActiveTabId = null;
  }

  const tabIndex = state.recentTabs.indexOf(tabId);
  if (tabIndex !== -1) {
    state.recentTabs.splice(tabIndex, 1);
    await updateAllTabRanks(windowId);
  }

  await saveWindowStates();
});

browser.tabs.onCreated.addListener(async (tab) => {
  const state = getWindowState(tab.windowId);
  state.tabCount++;
  await saveWindowStates();
});

browser.windows.onRemoved.addListener(async (windowId) => {
  windowStates.delete(windowId);
  await saveWindowStates();
});

browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'STYLE_CHANGED') {
    currentStyle = message.style;
    if (message.customIndicators) {
      customIndicators = message.customIndicators;
    }
    if (message.enableMinTabThreshold !== undefined) {
      enableMinTabThreshold = message.enableMinTabThreshold;
    }
    if (message.minTabThreshold !== undefined) {
      minTabThreshold = message.minTabThreshold;
    }
    for (const windowId of windowStates.keys()) {
      updateAllTabRanks(windowId);
    }
  } else if (message.type === 'REQUEST_RANK') {
    // Allows content scripts to sync on load/navigation
    if (sender.tab) {
      const state = getWindowState(sender.tab.windowId);
      const index = state.recentTabs.indexOf(sender.tab.id);

      if (!shouldTrackWindow(sender.tab.windowId)) {
        return Promise.resolve({rank: null, style: currentStyle, customIndicators: customIndicators});
      }

      if (index >= 0 && index < MAX_TRACKED_TABS) {
        return Promise.resolve({rank: index, style: currentStyle, customIndicators: customIndicators});
      } else {
        return Promise.resolve({rank: null, style: currentStyle, customIndicators: customIndicators});
      }
    }
  }
});

Promise.all([loadIndicatorStyle(), loadWindowStates()]).then(() => {
  return browser.windows.getAll({populate: true, windowTypes: ['normal']});
}).then(windows => {
  for (const window of windows) {
    const state = getWindowState(window.id);
    state.tabCount = window.tabs.length;

    const activeTabs = window.tabs.filter(tab => tab.active);
    if (activeTabs.length > 0) {
      state.currentActiveTabId = activeTabs[0].id;
    }
  }
  return saveWindowStates();
});
