const fileInput = document.getElementById("fileInput");
const processButton = document.getElementById("processButton");
const outputDiv = document.getElementById("output");
const fileNameTitle = document.getElementById("fileNameTitle");

let characterChoices = {};
let lines = [];
let pdfLoaded = false;

fileInput.addEventListener("change", handleFileChange);
processButton.addEventListener("click", handleProcessScript);

function handleFileChange() {
  const file = fileInput.files[0];
  if (!file) return;
  pdfLoaded = true;
  fileInput.style.display = "none";
  fileNameTitle.textContent = stripExtension(file.name);
  processButton.style.display = "inline-block";
}

function stripExtension(filename) {
  return filename.replace(/\.[^/.]+$/, "");
}

function handleProcessScript() {
  const file = fileInput.files[0];
  if (!file) return alert("Please upload a script.");

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
        const fullText = arr
          .flatMap((tc) => tc.items.map((i) => i.str))
          .join(" ");
        identifyCharacters(fullText);
      });
  };
  reader.readAsArrayBuffer(file);
}

function identifyCharacters(scriptText) {
  const regex = /([A-Z]{2,})[,.]\s*(.+?)(?=[A-Z]{2,}[,.]\s*|$)/gs;
  const chars = new Set();
  let match;

  while ((match = regex.exec(scriptText)) !== null) {
    chars.add(match[1].trim());
  }

  if (chars.size > 0) displayCharacterSelection([...chars], scriptText);
  else alert("No characters found.");
}

function displayCharacterSelection(chars, scriptText) {
  outputDiv.innerHTML = "<h2>Select Voice Type for Each Character</h2>";

  const form = document.createElement("form");
  chars.forEach((ch) => {
    const div = document.createElement("div");
    div.style.marginBottom = "10px";
    div.innerHTML = `
      <label>${ch}:</label>
      <select name="${ch}" style="margin-left:10px;background:black;color:white;border:2px solid white;border-radius:5px;padding:5px;">
        <option value="masc">Masc</option>
        <option value="fem">Fem</option>
        <option value="mute">Mute</option>
        <option value="skip">Skip</option>
      </select>
    `;
    form.appendChild(div);
  });

  const done = document.createElement("button");
  done.textContent = "Done";
  done.style =
    "background:black;color:white;border:2px solid white;border-radius:5px;padding:10px 20px;";
  done.addEventListener("click", (e) => {
    e.preventDefault();
    new FormData(form).forEach((v, k) => (characterChoices[k] = v));
    processScriptWithSelections(scriptText);
  });

  form.appendChild(done);
  outputDiv.appendChild(form);
}
