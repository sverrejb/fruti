// Prevents duplicate injection if content script is loaded multiple times
if (window.hasOwnProperty('recentTabsTrackerLoaded')) {
  console.log('Recent Tabs Tracker content script already loaded, skipping');
} else {
  window.recentTabsTrackerLoaded = true;

const INDICATOR_STYLES = {
  numbers: ['[1]', '[2]', '[3]', '[4]', '[5]'],
  coloredCircles: ['🔴', '🟠', '🟡', '🟢', '🔵'],
  coloredSquares: ['🟥', '🟧', '🟨', '🟩', '🟦'],
  moonPhases: ['🌕', '🌖', '🌗', '🌘', '🌑']
};

let currentRank = null;
let currentStyle = 'numbers';
let customIndicators = ['1', '2', '3', '4', '5'];
let cachedIndicators = null;

function rebuildIndicatorsCache() {
  const allIndicators = [];
  for (const style in INDICATOR_STYLES) {
    allIndicators.push(...INDICATOR_STYLES[style]);
  }
  allIndicators.push(...customIndicators);
  cachedIndicators = allIndicators;
}

// Cache avoids rebuilding indicator list on every stripIndicator call
function getAllIndicators() {
  if (!cachedIndicators) {
    rebuildIndicatorsCache();
  }
  return cachedIndicators;
}

function stripIndicator(title) {
  const allIndicators = getAllIndicators();
  for (const indicator of allIndicators) {
    if (title.startsWith(indicator + ' ')) {
      return title.substring(indicator.length + 1);
    }
  }
  return title;
}

// Prevents stacking indicators on reload or when tab already has one
let originalTitle = stripIndicator(document.title);
let lastSetTitle = document.title;

function setTitle(title) {
  document.title = title;
  lastSetTitle = document.title;
}

function updateTitle(rank, style, customInds) {
  currentRank = rank;
  if (style) {
    currentStyle = style;
  }
  if (customInds) {
    customIndicators = customInds;
    cachedIndicators = null;
  }

  if (rank === null) {
    setTitle(originalTitle);
    return;
  }

  const indicators = currentStyle === 'custom' ? customIndicators : (INDICATOR_STYLES[currentStyle] || INDICATOR_STYLES.numbers);
  if (rank >= 0 && rank < indicators.length) {
    const indicator = indicators[rank];
    setTitle(`${indicator} ${originalTitle}`);
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_RANK') {
    updateTitle(message.rank, message.style, message.customIndicators);
  } else if (message.type === 'REMOVE_RANK') {
    updateTitle(null);
  }
});

// Syncs rank on load/navigation since content scripts don't persist
browser.runtime.sendMessage({type: 'REQUEST_RANK'}).then(response => {
  if (response && response.rank !== null && response.rank !== undefined) {
    updateTitle(response.rank, response.style, response.customIndicators);
  }
}).catch(error => {
  // Fails gracefully if background not ready or tab closing
  console.log('Could not request rank:', error);
});

// Gmail, YouTube, etc. change titles; MutationObserver reapplies indicators
let titleChangeTimeout = null;
const titleObserver = new MutationObserver(() => {
  if (document.title === lastSetTitle) {
    return;
  }
  if (titleChangeTimeout) {
    clearTimeout(titleChangeTimeout);
  }

  // Debounced to avoid excessive processing on frequently changing titles
  titleChangeTimeout = setTimeout(() => {
    titleChangeTimeout = null;
    if (document.title === lastSetTitle) {
      return;
    }
    originalTitle = stripIndicator(document.title);
    lastSetTitle = document.title;
    if (currentRank !== null) {
      updateTitle(currentRank, currentStyle, customIndicators);
    }
  }, 150);
});

titleObserver.observe(document.head || document.documentElement, {
  childList: true,
  characterData: true,
  subtree: true
});

}
