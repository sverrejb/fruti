browser.storage.local.get(['indicatorStyle', 'customIndicators', 'enableMinTabThreshold', 'minTabThreshold']).then((result) => {
  const style = result.indicatorStyle || 'numbers';
  const customIndicators = result.customIndicators || ['1', '2', '3', '4', '5'];
  const enableMinTabThreshold = result.enableMinTabThreshold || false;
  const minTabThreshold = result.minTabThreshold || 10;

  const radio = document.querySelector(`input[value="${style}"]`);
  if (radio) {
    radio.checked = true;
  }

  for (let i = 0; i < 5; i++) {
    const input = document.getElementById(`custom${i}`);
    if (input) {
      input.value = customIndicators[i] || '';
    }
  }

  if (style === 'custom') {
    document.getElementById('customInputs').classList.add('show');
  }

  document.getElementById('enableMinTabThreshold').checked = enableMinTabThreshold;
  document.getElementById('minTabThreshold').value = minTabThreshold;
});

document.querySelectorAll('input[name="indicator"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    const customInputs = document.getElementById('customInputs');
    if (e.target.value === 'custom') {
      customInputs.classList.add('show');
    } else {
      customInputs.classList.remove('show');
    }
  });
});

document.querySelectorAll('input[name="indicator"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    saveSettings();
  });
});

for (let i = 0; i < 5; i++) {
  const input = document.getElementById(`custom${i}`);
  if (input) {
    input.addEventListener('input', () => {
      saveSettings();
    });
  }
}

document.getElementById('enableMinTabThreshold').addEventListener('change', () => {
  saveSettings();
});

document.getElementById('minTabThreshold').addEventListener('input', () => {
  saveSettings();
});

function saveSettings() {
  const style = document.querySelector('input[name="indicator"]:checked').value;

  const customIndicators = [];
  for (let i = 0; i < 5; i++) {
    const input = document.getElementById(`custom${i}`);
    customIndicators.push(input ? input.value : '');
  }

  const enableMinTabThreshold = document.getElementById('enableMinTabThreshold').checked;
  const minTabThreshold = parseInt(document.getElementById('minTabThreshold').value) || 10;

  browser.storage.local.set({
    indicatorStyle: style,
    customIndicators: customIndicators,
    enableMinTabThreshold: enableMinTabThreshold,
    minTabThreshold: minTabThreshold
  }).then(() => {
    const message = document.getElementById('savedMessage');
    message.classList.add('show');
    setTimeout(() => {
      message.classList.remove('show');
    }, 3000);

    // Triggers background to update all tabs without requiring reload
    browser.runtime.sendMessage({
      type: 'STYLE_CHANGED',
      style: style,
      customIndicators: customIndicators,
      enableMinTabThreshold: enableMinTabThreshold,
      minTabThreshold: minTabThreshold
    });
  });
}
