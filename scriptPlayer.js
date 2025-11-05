// scriptPlayer.js
// Handles script reading, line navigation, and speech synthesis

// DOM elements
const outputDiv = document.getElementById('output');
const controls = document.getElementById('controls');
const nextButton = document.getElementById('nextButton');
const backButton = document.getElementById('backButton');
const skipAheadButton = document.getElementById('skipAheadButton');
const muteButton = document.getElementById('muteButton');

let characterChoices = {};
let lines = [];
let currentLineIndex = -1;
let isMuted = false;
let settings = {
    volume: parseFloat(localStorage.getItem('volume')) || 0.8,
    speed: parseFloat(localStorage.getItem('speed')) || 1.0
};
let buttonFlashTimers = new WeakMap();

// ----------------------
// BUTTON FLASH FUNCTION
// ----------------------
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

// ----------------------
// SPEECH FUNCTIONS
// ----------------------
function toggleMute() {
    isMuted = !isMuted;
    muteButton.textContent = isMuted ? "Unmute" : "Mute";
    muteButton.style.backgroundColor = isMuted ? "green" : "black";
    muteButton.style.color = "white";
    if (isMuted) speechSynthesis.cancel();
}

function speak(text) {
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.volume = Math.min(settings.volume * 1.5, 1.0);
    utter.rate = settings.speed;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
}

// ----------------------
// SCRIPT PROCESSING
// ----------------------
function processScriptWithSelections(scriptText) {
    // Normalize newlines
    scriptText = scriptText.replace(/\r\n/g, '\n').replace(/\n+/g, '\n');

    // Regex to match character names and lines without losing first letters
    const regex = /([A-Z][A-Z]+)[,.]?\s*(.*?)(?=(?:\n|[A-Z][A-Z]+[,.]))/gs;
    lines = [];
    let match;

    while ((match = regex.exec(scriptText)) !== null) {
        const speaker = match[1].trim();
        const line = match[2].trim();
        const choice = characterChoices[speaker] || 'masc';
        const prefix = getPrefix(choice);
        lines.push({ prefix, speaker, line, choice });
    }

    if (lines.length === 0) {
        outputDiv.innerHTML = "<h2>No lines found!</h2>";
        controls.style.display = 'none';
        return;
    }

    controls.style.display = 'flex';
    currentLineIndex = -1;
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

// ----------------------
// NAVIGATION
// ----------------------
function navigateLine(direction) {
    currentLineIndex += direction;

    // Skip 'skip' lines automatically
    while (currentLineIndex >= 0 && currentLineIndex < lines.length && lines[currentLineIndex].choice === 'skip') {
        currentLineIndex += direction;
    }

    if (currentLineIndex < 0 || currentLineIndex >= lines.length) {
        controls.style.display = 'none';
        outputDiv.innerHTML = "<h2>No more lines to read!</h2>";
        outputDiv.style.borderColor = "white";
        return;
    }

    const { speaker, line, choice } = lines[currentLineIndex];
    const cleanLine = line.replace(/\(.*?\)/g, '').trim();
    outputDiv.innerHTML = `<h2>${speaker}: ${cleanLine}</h2>`;
    outputDiv.style.borderColor = choice === 'mute' ? 'green' : 'white';

    if (!isMuted && choice !== 'mute' && choice !== 'skip') speak(line);
    else speechSynthesis.cancel();

    if (isMuted) {
        muteButton.style.backgroundColor = 'green';
        muteButton.style.color = 'white';
    }
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
        outputDiv.innerHTML = "<h2>No more lines to read!</h2>";
        outputDiv.style.borderColor = 'white';
        return;
    }

    currentLineIndex = next - 1;
    navigateLine(0);
}

function resetScene() {
    if (lines.length === 0) return;
    currentLineIndex = -1;
    navigateLine(1);
}

// ----------------------
// CLICK SOUND
// ----------------------
function playClickChord() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const now = context.currentTime;
    [261.63, 329.63, 392.00].forEach(frequency => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
    });
}

// ----------------------
// BUTTON EVENT LISTENERS
// ----------------------
nextButton.addEventListener('click', () => { flashButton(nextButton); playClickChord(); navigateLine(1); if (navigator.vibrate) navigator.vibrate(50); });
backButton.addEventListener('click', () => { flashButton(backButton); navigateLine(-1); });
skipAheadButton.addEventListener('click', () => { flashButton(skipAheadButton); skipAhead(); });
muteButton.addEventListener('click', () => { flashButton(muteButton); toggleMute(); });

export { processScriptWithSelections, resetScene, flashButton };
