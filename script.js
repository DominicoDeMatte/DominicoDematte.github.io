// DOM elements
const fileInput = document.getElementById('fileInput');
const processButton = document.getElementById('processButton');
const resetButton = document.getElementById('resetButton');
const clearButton = document.getElementById('clearButton');
const outputDiv = document.getElementById('output');
const controls = document.getElementById('controls');
const nextButton = document.getElementById('nextButton');
const backButton = document.getElementById('backButton');
const skipAheadButton = document.getElementById('skipAheadButton');
const muteButton = document.getElementById('muteButton');
const fileNameTitle = document.getElementById('fileNameTitle');
const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const volumeSlider = document.getElementById('volumeSlider');
const speedSlider = document.getElementById('speedSlider');
const volumeValue = document.getElementById('volumeValue');
const speedValue = document.getElementById('speedValue');

// State
let characterChoices = {};
let lines = [];
let currentLineIndex = -1;
let voices = [];
let isMuted = false;
let pdfLoaded = false;
let buttonFlashTimers = new WeakMap();

let settings = {
  volume: parseFloat(localStorage.getItem('volume')) || 0.8,
  speed: parseFloat(localStorage.getItem('speed')) || 1.0,
};

// Initialize sliders
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

// Event Listeners
fileInput.addEventListener('change', handleFileChange);
processButton.addEventListener('click', handleProcessScript);
nextButton.addEventListener('click', () => {
  flashButton(nextButton);
  playClickChord();
  navigateLine(1);
  if (navigator.vibrate) navigator.vibrate(50);
});
backButton.addEventListener('click', () => {
  flashButton(backButton);
  navigateLine(-1);
});
skipAheadButton.addEventListener('click', () => {
  flashButton(skipAheadButton);
  skipAhead();
});
muteButton.addEventListener('click', () => {
  flashButton(muteButton);
  toggleMute();
});
resetButton.addEventListener('click', () => {
  flashButton(resetButton);
  resetScene();
});
clearButton.addEventListener('click', () => {
  flashButton(clearButton);
  clearPDF();
});
settingsButton.addEventListener('click', () => (settingsModal.style.display = 'block'));
closeSettings.addEventListener('click', () => (settingsModal.style.display = 'none'));

speechSynthesis.onvoiceschanged = loadVoices;

// Functions
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

function toggleMute() {
  isMuted = !isMuted;
  muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
  muteButton.style.backgroundColor = isMuted ? 'green' : 'black';
  muteButton.style.color = 'white';
  if (isMuted) speechSynthesis.cancel();
}

function handleFileChange() {
  const file = fileInput.files[0];
  if (file) {
    pdfLoaded = true;
    fileInput.style.display = 'none';
    fileNameTitle.textContent = stripExtension(file.name);
    processButton.style.display = 'inline-block';
  }
}

function stripExtension(filename) {
  return filename.replace(/\.[^/.]+$/, '');
}

function loadVoices() {
  voices = speechSynthesis.getVoices();
}

function handleProcessScript() {
  const file = fileInput.files[0];
  if (!file) return alert('Please upload a script.');

  const reader = new FileReader();
  reader.onload = (e) => {
    const typedArray = new Uint8Array(e.target.result);
    pdfjsLib
      .getDocument(typedArray)
      .promise.then((pdf) =>
        Promise.all(
          Array.from({ length: pdf.numPages }, (_, i) =>
            pdf.getPage(i + 1).then((p) => p.getTextContent())
          )
        )
      )
      .then((arr) => {
        const fullText = arr.flatMap((tc) => tc.items.map((i) => i.str)).join(' ');
        identifyCharacters(fullText);
      });
  };
  reader.readAsArrayBuffer(file);
}

function identifyCharacters(scriptText) {
  const regex = /([A-Z]{2,})[,.]\s*(.+?)(?=[A-Z]{2,}[,.]\s*|$)/gs;
  const chars = new Set();
  let match;
  while ((match = regex.exec(scriptText)) !== null) chars.add(match[1].trim());
  if (chars.size > 0) displayCharacterSelection([...chars], scriptText);
  else alert('No characters found.');
}

function displayCharacterSelection(chars, scriptText) {
  outputDiv.innerHTML = '<h2>Select Voice Type for Each Character</h2>';
  const form = document.createElement('form');

  chars.forEach((ch) => {
    const div = document.createElement('div');
    div.style.marginBottom = '10px';
    div.innerHTML = `
      <label>${ch}:</label>
      <select name="${ch}" style="margin-left:10px;background:black;color:white;border:2px solid white;border-radius:5px;padding:5px;">
        <option value="masc">Masc</option>
        <option value="fem">Fem</option>
        <option value="mute">Mute</option>
        <option value="skip">Skip</option>
      </select>`;
    form.appendChild(div);
  });

  const done = document.createElement('button');
  done.textContent = 'Done';
  done.style =
    'background:black;color:white;border:2px solid white;border-radius:5px;padding:10px 20px;';
  done.addEventListener('click', (e) => {
    e.preventDefault();
    new FormData(form).forEach((v, k) => (characterChoices[k] = v));
    processScriptWithSelections(scriptText);
  });

  form.appendChild(done);
  outputDiv.appendChild(form);
}

function processScriptWithSelections(scriptText) {
  const regex = /([A-Z]{2,})[,.]\s*(.+?)(?=[A-Z]{2,}[,.]\s*|$)/gs;
  lines = [];
  let match;

  while ((match = regex.exec(scriptText)) !== null) {
    const speaker = match[1].trim();
    const line = match[2].trim();
    const choice = characterChoices[speaker];
    const prefix = getPrefix(choice);
    lines.push({ prefix, speaker, line, choice });
  }

  controls.style.display = 'flex';
  navigateLine(1);
}

function getPrefix(choice) {
  switch (choice) {
    case 'masc': return '++';
    case 'fem': return '--';
    case 'mute': return '!!';
    case 'skip': return 'xx';
    default: return '';
  }
}

function navigateLine(direction) {
  currentLineIndex += direction;
  if (currentLineIndex < 0) currentLineIndex = 0;

  if (currentLineIndex >= lines.length) {
    controls.style.display = 'none';
    outputDiv.innerHTML = '<h2>No more lines to read!</h2>';
    outputDiv.style.borderColor = 'white';
    return;
  }

  const { speaker, line, choice } = lines[currentLineIndex];
  const clean = line.replace(/\(.*?\)/g, '').trim();

  // Determine border color
  let borderColor = 'white';
  if (choice === 'mute' || choice === 'skip') borderColor = 'green';
  else if (
    currentLineIndex < lines.length - 1 &&
    (lines[currentLineIndex + 1].choice === 'mute' ||
      lines[currentLineIndex + 1].choice === 'skip')
  )
    borderColor = 'yellow';

  outputDiv.style.borderColor = borderColor;
  outputDiv.innerHTML = `<h2>${speaker}: ${clean}</h2>`;

  if (!isMuted && choice !== 'mute' && choice !== 'skip') speak(line);
  else speechSynthesis.cancel();

  if (isMuted) {
    muteButton.style.backgroundColor = 'green';
    muteButton.style.color = 'white';
  }
}

function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  const boostedVolume = Math.min(settings.volume * 1.5, 1.0);
  u.volume = boostedVolume;
  u.rate = settings.speed;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function resetScene() {
  if (lines.length === 0) return;
  currentLineIndex = -1;
  navigateLine(1);
}

function clearPDF() {
  pdfLoaded = false;
  fileInput.value = '';
  fileInput.style.display = 'inline-block';
  fileNameTitle.textContent = '';
  outputDiv.innerHTML = '';
  controls.style.display = 'none';
  processButton.style.display = 'none';
  speechSynthesis.cancel();
  outputDiv.style.borderColor = 'white';
}

function skipAhead() {
  let next = -1;
  for (let i = currentLineIndex + 1; i < lines.length; i++) {
    if (lines[i].choice === 'mute' || lines[i].choice === 'skip') {
      next = i;
      break;
    }
  }

  if (next === -1) {
    currentLineIndex = lines.length;
    controls.style.display = 'none';
    outputDiv.innerHTML = '<h2>No more lines to read!</h2>';
    outputDiv.style.borderColor = 'white';
    return;
  }

  currentLineIndex = next - 1;
  navigateLine(0);
}

function playClickChord() {
  const a = new (window.AudioContext || window.webkitAudioContext)();
  const now = a.currentTime;
  [261.63, 329.63, 392.0].forEach((f) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, now);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    o.connect(g).connect(a.destination);
    o.start(now);
    o.stop(now + 0.4);
  });
}
