// Prevents duplicate injection if content script is loaded multiple times
if (window.hasOwnProperty('recentTabsTrackerLoaded')) {
  console.log('Recent Tabs Tracker content script already loaded, skipping');
} else {
  window.recentTabsTrackerLoaded = true;
  console.log('Recent Tabs Tracker content script loaded');

const INDICATOR_STYLES = {
  numbers: ['[1]', '[2]', '[3]', '[4]', '[5]'],
  coloredCircles: ['🔴', '🟠', '🟡', '🟢', '🔵'],
  coloredSquares: ['🟥', '🟧', '🟨', '🟩', '🟦'],
  moonPhases: ['🌕', '🌖', '🌗', '🌘', '🌑']
};

let originalTitle = document.title;
let currentRank = null;
let currentStyle = 'numbers';
let customIndicators = ['1', '2', '3', '4', '5'];

// Needed to strip old indicators when switching styles or when page updates its title
function getAllIndicators() {
  const allIndicators = [];
  for (const style in INDICATOR_STYLES) {
    allIndicators.push(...INDICATOR_STYLES[style]);
  }
  allIndicators.push(...customIndicators);
  return allIndicators;
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

function updateTitle(rank, style, customInds) {
  currentRank = rank;
  if (style) {
    currentStyle = style;
  }
  if (customInds) {
    customIndicators = customInds;
  }

  const indicators = currentStyle === 'custom' ? customIndicators : (INDICATOR_STYLES[currentStyle] || INDICATOR_STYLES.numbers);

  if (rank === null) {
    document.title = originalTitle;
  } else if (rank >= 0 && rank < indicators.length) {
    const indicator = indicators[rank];
    document.title = `${indicator} ${originalTitle}`;
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_RANK') {
    updateTitle(message.rank, message.style, message.customIndicators);
  } else if (message.type === 'REMOVE_RANK') {
    updateTitle(null);
  }
});

// Pages can change their own titles dynamically, so we watch for changes and reapply our indicator
const titleObserver = new MutationObserver(() => {
  const newTitle = document.title;
  const cleanTitle = stripIndicator(newTitle);

  // Avoid reapplying indicator if only our own change triggered this
  if (cleanTitle !== originalTitle) {
    originalTitle = cleanTitle;
    if (currentRank !== null) {
      updateTitle(currentRank, currentStyle, customIndicators);
    }
  }
});

const titleElement = document.querySelector('title');
if (titleElement) {
  titleObserver.observe(titleElement, {
    childList: true,
    characterData: true,
    subtree: true
  });
}

}
