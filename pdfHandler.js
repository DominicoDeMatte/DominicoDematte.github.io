const fileInput = document.getElementById('fileInput');
const processButton = document.getElementById('processButton');
const fileNameTitle = document.getElementById('fileNameTitle');
let pdfLoaded = false;

// Event listeners
fileInput.addEventListener('change', handleFileChange);
processButton.addEventListener('click', handleProcessScript);

// Handle file selection
function handleFileChange() {
    const file = fileInput.files[0];
    if (file) {
        pdfLoaded = true;
        fileInput.style.display = "none";
        fileNameTitle.textContent = stripExtension(file.name);
        processButton.style.display = "inline-block";
    }
}

// Remove file extension
function stripExtension(filename) {
    return filename.replace(/\.[^/.]+$/, "");
}

// Read PDF and process
function handleProcessScript() {
    const file = fileInput.files[0];
    if (!file) return alert("Please upload a script.");
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const typedArray = new Uint8Array(e.target.result);
        pdfjsLib.getDocument(typedArray).promise.then(pdf =>
            Promise.all(Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1).then(p => p.getTextContent())))
        ).then(arr => {
            const rawText = arr.flatMap(tc => tc.items.map(i => i.str)).join('\n');
            const cleanedText = cleanScriptText(rawText);
            processExtractedText(cleanedText); // Pass to scriptPlayer.js
        });
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Clean script text:
 * - Remove page numbers and credits
 * - Merge lines for the same character
 * - Remove parentheticals
 * - Avoid first letter bleeding into previous line
 */
function cleanScriptText(text) {
    const lines = text.split('\n');
    const outputLines = [];
    let currentChar = '';
    let buffer = '';

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // Remove page numbers and credits
        if (/^\d+$/.test(line)) return;
        if (/Prepared for|Invoice|Clue: On Stage/i.test(line)) return;

        // Detect CHARACTER line
        const match = line.match(/^([A-Z][A-Z\s]*?)\.?\s*(.*)/);
        if (match) {
            // Save previous character's buffer
            if (currentChar && buffer) {
                let cleanedLine = currentChar + '. ' + buffer.trim();
                cleanedLine = cleanedLine.replace(/\([^)]*\)/g, '').trim();
                outputLines.push(cleanedLine);
                outputLines.push('');
            }
            // Start new character
            currentChar = match[1].trim();
            buffer = match[2] || '';
        } else {
            buffer += ' ' + line;
        }
    });

    // Push last character's lines
    if (currentChar && buffer) {
        let cleanedLine = currentChar + '. ' + buffer.trim();
        cleanedLine = cleanedLine.replace(/\([^)]*\)/g, '').trim();
        outputLines.push(cleanedLine);
    }

    return outputLines.join('\n');
}

// Clipboard helpers (optional for future UI buttons)
async function pasteClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        return text;
    } catch (err) {
        console.error('Failed to read clipboard: ', err);
        return '';
    }
}

async function copyOutput(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error('Failed to copy to clipboard: ', err);
    }
}
