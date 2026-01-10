browser.storage.local.get(['indicatorStyle', 'customIndicators']).then((result) => {
  const style = result.indicatorStyle || 'numbers';
  const customIndicators = result.customIndicators || ['1', '2', '3', '4', '5'];

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

function saveSettings() {
  const style = document.querySelector('input[name="indicator"]:checked').value;

  const customIndicators = [];
  for (let i = 0; i < 5; i++) {
    const input = document.getElementById(`custom${i}`);
    customIndicators.push(input ? input.value : '');
  }

  browser.storage.local.set({
    indicatorStyle: style,
    customIndicators: customIndicators
  }).then(() => {
    const message = document.getElementById('savedMessage');
    message.classList.add('show');
    setTimeout(() => {
      message.classList.remove('show');
    }, 3000);

    // Notify background script so all tabs update immediately
    browser.runtime.sendMessage({
      type: 'STYLE_CHANGED',
      style: style,
      customIndicators: customIndicators
    });
  });
}
