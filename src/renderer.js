const promptInput       = document.getElementById('promptInput');
const wpmInput          = document.getElementById('wpmInput');
const accuracyInput     = document.getElementById('accuracyInput');
const typedOutput       = document.getElementById('typedOutput');
const startBtn          = document.getElementById('startBtn');
const stopBtn           = document.getElementById('stopBtn');
const clearBtn          = document.getElementById('clearBtn');
const downloadSetupBtn  = document.getElementById('downloadSetupBtn');
const downloadStatus    = document.getElementById('downloadStatus');
const windowSelect      = document.getElementById('windowSelect');
const refreshWindowsBtn = document.getElementById('refreshWindowsBtn');
const windowHint        = document.getElementById('windowHint');
const countdownDisplay  = document.getElementById('countdownDisplay');
const outputModeLabel   = document.getElementById('outputModeLabel');

// ── Ripple effect on all buttons ─────────────────────────────────────────────
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', function (e) {
    if (this.disabled) return;
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});

// ── State ─────────────────────────────────────────────────────────────────────
let typingTimer  = null;
let typingIndex  = 0;
let sourceText   = '';
let running      = false;

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function charDelayMs(wpm, currentChar) {
  const charsPerMinute = Math.max(1, wpm * 5);
  const base = 60000 / charsPerMinute;
  const jitter = randomBetween(0.85, 1.2);

  let pause = base * jitter;
  if (currentChar === '.' || currentChar === '!' || currentChar === '?') {
    pause += randomBetween(120, 320);
  } else if (currentChar === ',' || currentChar === ';') {
    pause += randomBetween(70, 180);
  }

  return pause;
}

function maybeMistype(char, accuracy) {
  if (char === ' ' || char === '\n') {
    return { typed: char, corrected: false };
  }

  if (Math.random() * 100 < accuracy) {
    return { typed: char, corrected: false };
  }

  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const typo = letters[Math.floor(Math.random() * letters.length)];
  return { typed: typo, corrected: true, intended: char };
}

function setRunningState(isRunning) {
  running = isRunning;
  startBtn.disabled = isRunning;
  stopBtn.disabled  = !isRunning;
  refreshWindowsBtn.disabled = isRunning;
  windowSelect.disabled = isRunning;
}

function stopTyping() {
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
  countdownDisplay.textContent = '';
  setRunningState(false);
}

// ── Window listing ────────────────────────────────────────────────────────────
async function loadWindows() {
  windowHint.textContent = 'Scanning for open windows…';
  refreshWindowsBtn.disabled = true;

  try {
    const result = await window.electronAPI.listWindows();

    // Keep the default "none" option, then add discovered windows
    const currentVal = windowSelect.value;
    windowSelect.innerHTML = '<option value="">— Type in output area below —</option>';

    if (result.ok && result.windows.length > 0) {
      result.windows.forEach(({ id, title }) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = title.length > 60 ? title.slice(0, 57) + '…' : title;
        windowSelect.appendChild(opt);
      });

      // Restore selection if window still exists
      if (currentVal && [...windowSelect.options].some(o => o.value === currentVal)) {
        windowSelect.value = currentVal;
      }

      windowHint.textContent = `${result.windows.length} window${result.windows.length !== 1 ? 's' : ''} found. Select one to type into it.`;
    } else if (result.ok) {
      windowHint.textContent = 'No other windows found. Open an app and click Refresh.';
    } else {
      windowHint.textContent = result.error || 'Could not list windows.';
    }
  } catch (err) {
    windowHint.textContent = `Error: ${err.message}`;
  }

  refreshWindowsBtn.disabled = false;
}

// Update the output area label based on selected window
function updateOutputLabel() {
  const sel = windowSelect.selectedOptions[0];
  if (sel && sel.value) {
    outputModeLabel.textContent = `(mirroring — typing into "${sel.textContent.trim()}")`;
  } else {
    outputModeLabel.textContent = '';
  }
}

windowSelect.addEventListener('change', updateOutputLabel);

// ── Core typing loop ──────────────────────────────────────────────────────────
async function typeNext() {
  if (!running || typingIndex >= sourceText.length) {
    stopTyping();
    return;
  }

  const wpm      = Number(wpmInput.value);
  const accuracy = Number(accuracyInput.value);
  const char     = sourceText[typingIndex];
  const targetId = windowSelect.value;

  const result = maybeMistype(char, accuracy);

  // Always mirror to the preview textarea
  typedOutput.value += result.typed;
  typedOutput.scrollTop = typedOutput.scrollHeight;

  // Type into the external window if one is selected
  if (targetId) {
    await window.electronAPI.typeCharacter(result.typed);
  }

  if (result.corrected) {
    typingTimer = setTimeout(async () => {
      if (!running) return;
      // Correct the typo: backspace + correct char
      typedOutput.value = typedOutput.value.slice(0, -1) + result.intended;
      if (targetId) {
        await window.electronAPI.typeBackspace();
        await window.electronAPI.typeCharacter(result.intended);
      }
      typingIndex += 1;
      typingTimer = setTimeout(typeNext, charDelayMs(wpm, char));
    }, randomBetween(90, 190));
    return;
  }

  typingIndex += 1;
  typingTimer = setTimeout(typeNext, charDelayMs(wpm, char));
}

// ── Button handlers ───────────────────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  const prompt   = promptInput.value;
  const wpm      = Number(wpmInput.value);
  const accuracy = Number(accuracyInput.value);
  const targetId = windowSelect.value;

  if (!prompt.trim()) {
    alert('Please paste a prompt first.');
    return;
  }
  if (Number.isNaN(wpm) || wpm < 10 || wpm > 300) {
    alert('WPM must be between 10 and 300.');
    return;
  }
  if (Number.isNaN(accuracy) || accuracy < 70 || accuracy > 100) {
    alert('Accuracy must be between 70 and 100.');
    return;
  }

  sourceText   = prompt;
  typingIndex  = 0;
  typedOutput.value = '';
  setRunningState(true);

  if (targetId) {
    // 3-second countdown so the user can see AutoType switch away
    for (let i = 3; i >= 1; i--) {
      if (!running) return;
      countdownDisplay.textContent = `Switching to window in ${i}…`;
      await sleep(1000);
    }
    if (!running) return;
    countdownDisplay.textContent = 'Typing…';

    const focusResult = await window.electronAPI.focusWindow(targetId);
    if (!focusResult.ok) {
      countdownDisplay.textContent = `Could not focus window: ${focusResult.error}`;
      setRunningState(false);
      return;
    }

    // Brief pause after focus so the OS has time to switch
    await sleep(150);
  }

  typeNext();
});

stopBtn.addEventListener('click', stopTyping);

clearBtn.addEventListener('click', () => {
  typedOutput.value = '';
  stopTyping();
});

refreshWindowsBtn.addEventListener('click', loadWindows);

downloadSetupBtn.addEventListener('click', async () => {
  downloadStatus.textContent = 'Preparing setup download...';
  try {
    const result = await window.electronAPI.downloadSetup();
    downloadStatus.textContent = result.message;
  } catch (error) {
    downloadStatus.textContent = `Failed to download setup: ${error.message}`;
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadWindows();
