// Active tab is excluded from tracking so it never shows an indicator
const MAX_TRACKED_TABS = 5;
const windowStates = new Map();
let currentStyle = 'numbers';
let customIndicators = ['1', '2', '3', '4', '5'];

function getWindowState(windowId) {
  if (!windowStates.has(windowId)) {
    windowStates.set(windowId, {
      recentTabs: [],
      currentActiveTabId: null
    });
  }
  return windowStates.get(windowId);
}

async function loadIndicatorStyle() {
  const result = await browser.storage.local.get(['indicatorStyle', 'customIndicators']);
  currentStyle = result.indicatorStyle || 'numbers';
  customIndicators = result.customIndicators || ['1', '2', '3', '4', '5'];
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
    // Tab might not have content script (system pages like about:, chrome://, etc.)
  }
}

async function sendRankRemoval(tabId) {
  try {
    await browser.tabs.sendMessage(tabId, {
      type: 'REMOVE_RANK'
    });
  } catch (error) {
    // Tab might not have content script (system pages like about:, chrome://, etc.)
  }
}

async function updateAllTabRanks(windowId) {
  const state = getWindowState(windowId);
  for (let i = 0; i < state.recentTabs.length; i++) {
    await sendRankUpdate(state.recentTabs[i], i);
  }
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
}

browser.tabs.onActivated.addListener(async (activeInfo) => {
  await onTabActivated(activeInfo.tabId, activeInfo.windowId);
});

browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const windowId = removeInfo.windowId;
  const state = getWindowState(windowId);

  if (tabId === state.currentActiveTabId) {
    state.currentActiveTabId = null;
  }

  const tabIndex = state.recentTabs.indexOf(tabId);
  if (tabIndex !== -1) {
    state.recentTabs.splice(tabIndex, 1);
    await updateAllTabRanks(windowId);
  }
});

browser.windows.onRemoved.addListener((windowId) => {
  windowStates.delete(windowId);
});

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'STYLE_CHANGED') {
    currentStyle = message.style;
    if (message.customIndicators) {
      customIndicators = message.customIndicators;
    }
    for (const windowId of windowStates.keys()) {
      updateAllTabRanks(windowId);
    }
  }
});

loadIndicatorStyle().then(() => {
  return browser.windows.getAll({populate: true, windowTypes: ['normal']});
}).then(windows => {
  for (const window of windows) {
    const activeTabs = window.tabs.filter(tab => tab.active);
    if (activeTabs.length > 0) {
      const state = getWindowState(window.id);
      state.currentActiveTabId = activeTabs[0].id;
    }
  }
});
