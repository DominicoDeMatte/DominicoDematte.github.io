const fileInput = document.getElementById('fileInput');
const processButton = document.getElementById('processButton');
const fileNameTitle = document.getElementById('fileNameTitle');
let pdfLoaded = false;

// Event listener for file upload
fileInput.addEventListener('change', handleFileChange);
processButton.addEventListener('click', handleProcessScript);

function handleFileChange() {
    const file = fileInput.files[0];
    if (file) {
        pdfLoaded = true;
        fileInput.style.display = "none";
        fileNameTitle.textContent = stripExtension(file.name);
        processButton.style.display = "inline-block";
    }
}

// Remove extension from filename
function stripExtension(filename) {
    return filename.replace(/\.[^/.]+$/, "");
}

// Read PDF and extract text
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
            processExtractedText(cleanedText);  // passes to scriptPlayer.js
        });
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Cleans script text by:
 * - Removing page numbers and credits
 * - Merging lines for the same character
 * - Removing parentheticals
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

        // Check if line starts with CHARACTER. (all caps)
        const match = line.match(/^([A-Z][A-Z\s]*?)\.?\s*(.*)/);
        if (match) {
            if (currentChar && buffer) {
                let cleanedLine = currentChar + '. ' + buffer.trim();
                cleanedLine = cleanedLine.replace(/\([^)]*\)/g, '').trim();
                outputLines.push(cleanedLine);
                outputLines.push(''); // extra newline between blocks
            }
            currentChar = match[1].trim();
            buffer = match[2];
        } else {
            buffer += ' ' + line;
        }
    });

    if (currentChar && buffer) {
        let cleanedLine = currentChar + '. ' + buffer.trim();
        cleanedLine = cleanedLine.replace(/\([^)]*\)/g, '').trim();
        outputLines.push(cleanedLine);
    }

    return outputLines.join('\n');
}

// Optional clipboard integration (for future buttons if needed)
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
