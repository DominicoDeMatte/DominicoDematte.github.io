// Handles parsing, navigation, and speech synthesis

let characterChoices = {};
let lines = [];
let currentLineIndex = -1;
let voices = [];
let isMuted = false;

let settings = {
  volume: parseFloat(localStorage.getItem('volume')) || 0.8,
  speed: parseFloat(localStorage.getItem('speed')) || 1.0,
};

// ===== SPEECH HANDLING =====
speechSynthesis.onvoiceschanged = () => {
  voices = speechSynthesis.getVoices();
};

function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  const boostedVolume = Math.min(settings.volume * 1.5, 1.0);
  u.volume = boostedVolume;
  u.rate = settings.speed;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function toggleMute() {
  isMuted = !isMuted;
  const muteButton = document.getElementById('muteButton');
  muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
  muteButton.style.backgroundColor = isMuted ? 'green' : 'black';
  muteButton.style.color = 'white';
  if (isMuted) speechSynthesis.cancel();
}

// ===== SCRIPT PROCESSING =====
function handleProcessScript(file) {
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
  const outputDiv = document.getElementById('output');
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

  document.getElementById('controls').style.display = 'flex';
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

// ===== LINE NAVIGATION =====
function navigateLine(direction) {
  const outputDiv = document.getElementById('output');
  const muteButton = document.getElementById('muteButton');
  const controls = document.getElementById('controls');

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

// ===== CONTROLS =====
function resetScene() {
  if (lines.length === 0) return;
  currentLineIndex = -1;
  navigateLine(1);
}

function clearPDF() {
  const fileInput = document.getElementById('fileInput');
  const outputDiv = document.getElementById('output');
  const fileNameTitle = document.getElementById('fileNameTitle');
  const processButton = document.getElementById('processButton');

  fileInput.value = '';
  fileInput.style.display = 'inline-block';
  fileNameTitle.textContent = '';
  outputDiv.innerHTML = '';
  document.getElementById('controls').style.display = 'none';
  processButton.style.display = 'none';
  speechSynthesis.cancel();
  outputDiv.style.borderColor = 'white';
}

function skipAhead() {
  const controls = document.getElementById('controls');
  const outputDiv = document.getElementById('output');
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
