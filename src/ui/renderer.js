import { createMeetingCard } from './components/meetingCard.js';
import { createResultCard } from './components/resultCard.js';

/**
 * @typedef {Object} UploadedTranscript
 * @property {string} id
 * @property {string} fileName
 * @property {string|null} content
 * @property {string|null} error
 * @property {string} endingTime  "HH:mm" from the time picker, or "".
 */

/** @type {UploadedTranscript[]} */
let transcripts = [];
let idCounter = 0;

const dropZone = document.getElementById('dropZone');
const browseBtn = document.getElementById('browseBtn');
const meetingsSection = document.getElementById('meetingsSection');
const meetingsCount = document.getElementById('meetingsCount');
const meetingsList = document.getElementById('meetingsList');
const clearBtn = document.getElementById('clearBtn');
const generateBtn = document.getElementById('generateBtn');
const statusText = document.getElementById('statusText');
const resultsSection = document.getElementById('resultsSection');
const resultsList = document.getElementById('resultsList');
const openFolderBtn = document.getElementById('openFolderBtn');

function nextId() {
  idCounter += 1;
  return `t${idCounter}`;
}

/** Adds newly loaded files (from dialog or drag-drop) into state, skipping non-.txt files. */
function addFiles(files) {
  for (const file of files) {
    if (!file.fileName.toLowerCase().endsWith('.txt')) {
      continue;
    }
    transcripts.push({
      id: nextId(),
      fileName: file.fileName,
      content: file.content,
      error: file.error,
      endingTime: '',
    });
  }
  render();
}

function removeTranscript(id) {
  transcripts = transcripts.filter((t) => t.id !== id);
  render();
}

function setEndingTime(id, value) {
  const entry = transcripts.find((t) => t.id === id);
  if (entry) entry.endingTime = value;
  updateGenerateButtonState();
}

function updateGenerateButtonState() {
  const hasValidEntries = transcripts.some((t) => !t.error);
  const allTimesSet = transcripts.filter((t) => !t.error).every((t) => t.endingTime && t.endingTime.trim() !== '');
  generateBtn.disabled = !(hasValidEntries && allTimesSet && transcripts.length > 0);
}

function render() {
  const hasFiles = transcripts.length > 0;
  meetingsSection.classList.toggle('hidden', !hasFiles);

  meetingsCount.textContent = `${transcripts.length} transcript${transcripts.length === 1 ? '' : 's'} uploaded`;

  meetingsList.innerHTML = '';
  transcripts.forEach((entry, index) => {
    const card = createMeetingCard(
      { ...entry, meetingNumber: index + 1 },
      { onTimeChange: setEndingTime, onRemove: removeTranscript }
    );
    meetingsList.appendChild(card);
  });

  updateGenerateButtonState();

  if (!hasFiles) {
    resultsSection.classList.add('hidden');
    resultsList.innerHTML = '';
    statusText.textContent = '';
    statusText.className = 'status-text';
  }
}

/* --------------------------- Drag & drop --------------------------- */

// Electron/Chromium's default behavior for an unhandled 'dragover' or
// 'drop' anywhere in the window is to navigate the page to the dropped
// file (replacing the whole app). Blocking that at the document level
// guarantees dragging is smooth across the entire window and that a
// drop always reaches our dropZone handler below, instead of only
// working when the cursor's exact path never leaves the drop zone.
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('drop', async (e) => {
  const droppedFiles = Array.from(e.dataTransfer.files || []);
  if (droppedFiles.length === 0) return;

  const loaded = await Promise.all(
    droppedFiles.map(async (file) => {
      try {
        const text = await file.text();
        return { fileName: file.name, content: text, error: null };
      } catch (err) {
        return { fileName: file.name, content: null, error: 'Could not read this file.' };
      }
    })
  );

  addFiles(loaded);
});

/* --------------------------- Browse button --------------------------- */

browseBtn.addEventListener('click', async () => {
  const filePaths = await window.api.selectTranscripts();
  if (!filePaths || filePaths.length === 0) return;

  const loaded = await window.api.readFiles(filePaths);
  addFiles(loaded);
});

/* --------------------------- Clear --------------------------- */

clearBtn.addEventListener('click', () => {
  transcripts = [];
  render();
});

/* --------------------------- Generate report --------------------------- */

generateBtn.addEventListener('click', async () => {
  const validEntries = transcripts.filter((t) => !t.error && t.content);

  if (validEntries.length === 0) {
    statusText.textContent = 'No valid transcripts to process.';
    statusText.className = 'status-text error';
    return;
  }

  generateBtn.disabled = true;
  statusText.textContent = 'Summarizing meetings and generating your Word report…';
  statusText.className = 'status-text';

  try {
    const payload = validEntries.map((t) => ({
      fileName: t.fileName,
      content: t.content,
      endingTime: t.endingTime,
    }));

    const response = await window.api.generateReport(payload);
    renderResults(response);

    if (response.docxError) {
      statusText.textContent = response.docxError;
      statusText.className = 'status-text error';
    } else {
      statusText.textContent = `Report updated: ${response.outputPath}`;
      statusText.className = 'status-text success';
    }
  } catch (err) {
    statusText.textContent = 'Something went wrong while generating the report.';
    statusText.className = 'status-text error';
  } finally {
    updateGenerateButtonState();
  }
});

function renderResults(response) {
  resultsSection.classList.remove('hidden');
  resultsList.innerHTML = '';
  response.results.forEach((result) => {
    resultsList.appendChild(createResultCard(result));
  });
}

/* --------------------------- Output folder --------------------------- */

openFolderBtn.addEventListener('click', () => {
  window.api.openOutputFolder();
});

render();
