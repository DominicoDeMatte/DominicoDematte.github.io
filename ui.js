// Handles UI, settings, and button interactions

const fileInput = document.getElementById('fileInput');
const processButton = document.getElementById('processButton');
const resetButton = document.getElementById('resetButton');
const clearButton = document.getElementById('clearButton');
const nextButton = document.getElementById('nextButton');
const backButton = document.getElementById('backButton');
const skipAheadButton = document.getElementById('skipAheadButton');
const muteButton = document.getElementById('muteButton');
const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const volumeSlider = document.getElementById('volumeSlider');
const speedSlider = document.getElementById('speedSlider');
const volumeValue = document.getElementById('volumeValue');
const speedValue = document.getElementById('speedValue');

let buttonFlashTimers = new WeakMap();

// ===== SETTINGS =====
volumeSlider.value = settings.volume;
speedSlider.value = settings.speed;
volumeValue.textContent = settings.volume.toFixed(2);
speedValue.textContent = settings.speed.toFixed(1);

volumeSlider.addEventListener('input', () => {
  settings.volume = parseFloat(volumeSlider.value);
  volumeValue.textContent = settings.volume.toFixed(2);
  localStorage.setItem('volume', settings.volume);
});

speedSlider.addEventListener('input', () => {
  settings.speed = parseFloat(speedSlider.value);
  speedValue.textContent = settings.speed.toFixed(1);
  localStorage.setItem('speed', settings.speed);
});

// ===== BUTTONS =====
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    fileInput.style.display = 'none';
    document.getElementById('fileNameTitle').textContent = stripExtension(file.name);
    processButton.style.display = 'inline-block';
  }
});

processButton.addEventListener('click', () => handleProcessScript(fileInput.files[0]));
nextButton.addEventListener('click', () => { flashButton(nextButton); playClickChord(); navigateLine(1); });
backButton.addEventListener('click', () => { flashButton(backButton); navigateLine(-1); });
skipAheadButton.addEventListener('click', () => { flashButton(skipAheadButton); skipAhead(); });
muteButton.addEventListener('click', () => { flashButton(muteButton); toggleMute(); });
resetButton.addEventListener('click', () => { flashButton(resetButton); resetScene(); });
clearButton.addEventListener('click', () => { flashButton(clearButton); clearPDF(); });
settingsButton.addEventListener('click', () => settingsModal.style.display = 'block');
closeSettings.addEventListener('click', () => settingsModal.style.display = 'none');

// ===== UTIL =====
function flashButton(btn) {
  if (buttonFlashTimers.has(btn)) {
    clearTimeout(buttonFlashTimers.get(btn));
    buttonFlashTimers.delete(btn);
  }
  btn.style.transition = 'background-color 0.15s ease';
  btn.style.backgroundColor = 'green';
  btn.style.color = 'white';
  const timer = setTimeout(() => {
    if (btn === muteButton && isMuted) return;
    btn.style.backgroundColor = 'black';
    btn.style.color = 'white';
    buttonFlashTimers.delete(btn);
  }, 500);
  buttonFlashTimers.set(btn, timer);
}

function stripExtension(filename) {
  return filename.replace(/\.[^/.]+$/, '');
}
