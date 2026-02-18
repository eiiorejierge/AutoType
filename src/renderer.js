const promptInput = document.getElementById('promptInput');
const wpmInput = document.getElementById('wpmInput');
const accuracyInput = document.getElementById('accuracyInput');
const typedOutput = document.getElementById('typedOutput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadSetupBtn = document.getElementById('downloadSetupBtn');
const checkReleaseBtn = document.getElementById('checkReleaseBtn');
const downloadReleaseBtn = document.getElementById('downloadReleaseBtn');
const repoOwnerInput = document.getElementById('repoOwnerInput');
const repoNameInput = document.getElementById('repoNameInput');
const downloadStatus = document.getElementById('downloadStatus');

let typingTimer = null;
let typingIndex = 0;
let sourceText = '';
let running = false;
let latestReleaseAsset = null;

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
  stopBtn.disabled = !isRunning;
}

function stopTyping() {
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
  setRunningState(false);
}

function typeNext() {
  if (!running || typingIndex >= sourceText.length) {
    stopTyping();
    return;
  }

  const wpm = Number(wpmInput.value);
  const accuracy = Number(accuracyInput.value);
  const char = sourceText[typingIndex];

  const result = maybeMistype(char, accuracy);
  typedOutput.value += result.typed;

  if (result.corrected) {
    typingTimer = setTimeout(() => {
      typedOutput.value = typedOutput.value.slice(0, -1) + result.intended;
      typingIndex += 1;
      typingTimer = setTimeout(typeNext, charDelayMs(wpm, char));
    }, randomBetween(90, 190));
    return;
  }

  typingIndex += 1;
  typingTimer = setTimeout(typeNext, charDelayMs(wpm, char));
}

startBtn.addEventListener('click', () => {
  const prompt = promptInput.value;
  const wpm = Number(wpmInput.value);
  const accuracy = Number(accuracyInput.value);

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

  sourceText = prompt;
  typingIndex = 0;
  typedOutput.value = '';
  setRunningState(true);
  typeNext();
});

stopBtn.addEventListener('click', stopTyping);

clearBtn.addEventListener('click', () => {
  typedOutput.value = '';
  stopTyping();
});

downloadSetupBtn.addEventListener('click', async () => {
  downloadStatus.textContent = 'Preparing local setup download...';
  try {
    const result = await window.electronAPI.downloadSetup();
    downloadStatus.textContent = result.message;
  } catch (error) {
    downloadStatus.textContent = `Failed to download setup: ${error.message}`;
  }
});

checkReleaseBtn.addEventListener('click', async () => {
  const owner = repoOwnerInput.value.trim();
  const repo = repoNameInput.value.trim();

  if (!owner || !repo) {
    downloadStatus.textContent = 'Enter both GitHub owner and repository name.';
    return;
  }

  downloadReleaseBtn.disabled = true;
  latestReleaseAsset = null;
  downloadStatus.textContent = 'Checking latest GitHub release...';

  try {
    const result = await window.electronAPI.getLatestRelease(owner, repo);
    if (!result.ok) {
      downloadStatus.textContent = result.message;
      return;
    }

    latestReleaseAsset = {
      assetUrl: result.assetUrl,
      fileName: result.assetName
    };
    downloadReleaseBtn.disabled = false;
    downloadStatus.textContent = `Latest release ${result.tag || ''} found. EXE asset: ${result.assetName}`;
  } catch (error) {
    downloadStatus.textContent = `Failed to check latest release: ${error.message}`;
  }
});

downloadReleaseBtn.addEventListener('click', async () => {
  if (!latestReleaseAsset) {
    downloadStatus.textContent = 'Check the latest release first.';
    return;
  }

  downloadStatus.textContent = 'Downloading EXE from latest release...';
  try {
    const result = await window.electronAPI.downloadReleaseAsset(
      latestReleaseAsset.assetUrl,
      latestReleaseAsset.fileName
    );
    downloadStatus.textContent = result.message;
  } catch (error) {
    downloadStatus.textContent = `Failed to download release EXE: ${error.message}`;
  }
});
