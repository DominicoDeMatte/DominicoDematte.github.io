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
            const fullText = arr.flatMap(tc => tc.items.map(i => i.str)).join(' ');
            processExtractedText(fullText);
        });
    };
    reader.readAsArrayBuffer(file);
}
