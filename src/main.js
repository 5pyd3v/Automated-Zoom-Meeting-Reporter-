import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { parseTranscriptFile } from './services/parser/txtParser.js';
import { buildMeetingModel } from './services/parser/meetingBuilder.js';
import { summarizeMeeting } from './services/gemini/geminiClient.js';
import { appendMeetingsToDocx } from './services/word/docxBuilder.js';
import { getOutputDirectory, getOutputFilePath } from './utils/paths.js';
import { AppError } from './utils/errors.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env (works both in dev and packaged app).
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 860,
    minHeight: 620,
    backgroundColor: '#111318',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/* ---------------------------------------------------------------------- */
/*  IPC Handlers                                                          */
/* ---------------------------------------------------------------------- */

/**
 * Lets the renderer open a native file picker restricted to .txt files.
 * Returns an array of absolute file paths (empty array if cancelled).
 */
ipcMain.handle('dialog:selectTranscripts', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Zoom Transcript Files',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Text Transcript', extensions: ['txt'] }],
  });

  if (result.canceled) return [];
  return result.filePaths;
});

/**
 * Reads raw file contents for a list of paths (used for drag-and-drop,
 * where the renderer only has File objects with paths).
 */
ipcMain.handle('fs:readFiles', async (_event, filePaths) => {
  const files = [];
  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      files.push({ filePath, fileName: path.basename(filePath), content, error: null });
    } catch (err) {
      logger.error(`Failed to read file ${filePath}:`, err);
      files.push({ filePath, fileName: path.basename(filePath), content: null, error: err.message });
    }
  }
  return files;
});

/**
 * Main pipeline: takes the parsed transcript text + user-provided ending
 * times, runs Gemini summarization, and appends everything to Meetings.docx.
 *
 * payload: Array<{ fileName, content, endingTime: string (HH:mm, 24h) }>
 */
ipcMain.handle('meetings:generateReport', async (_event, payload) => {
  const results = [];

  for (const item of payload) {
    try {
      const parsed = parseTranscriptFile(item.content);
      const meeting = buildMeetingModel(parsed, item.endingTime);

      const summary = await summarizeMeeting(meeting.spokenText);
      meeting.summary = summary;

      results.push({ fileName: item.fileName, meeting, error: null });
    } catch (err) {
      logger.error(`Failed to process ${item.fileName}:`, err);
      const message = err instanceof AppError ? err.message : 'Unexpected error while processing this transcript.';
      results.push({ fileName: item.fileName, meeting: null, error: message });
    }
  }

  const successfulMeetings = results.filter((r) => r.meeting).map((r) => r.meeting);

  let docxError = null;
  let outputPath = null;

  if (successfulMeetings.length > 0) {
    try {
      outputPath = getOutputFilePath();
      await appendMeetingsToDocx(successfulMeetings, outputPath);
    } catch (err) {
      logger.error('Failed to generate/append Word document:', err);
      docxError = err instanceof AppError ? err.message : 'Failed to write the Word document.';
    }
  }

  return {
    results: results.map((r) => ({
      fileName: r.fileName,
      error: r.error,
      preview: r.meeting
        ? {
            title: r.meeting.participantName,
            date: r.meeting.date,
            startingTime: r.meeting.startingTimeLabel,
            endingTime: r.meeting.endingTimeLabel,
            summary: r.meeting.summary,
          }
        : null,
    })),
    docxError,
    outputPath,
  };
});

/** Opens the output folder in the OS file explorer. */
ipcMain.handle('shell:openOutputFolder', async () => {
  const { shell } = await import('electron');
  const dir = getOutputDirectory();
  await fs.mkdir(dir, { recursive: true });
  await shell.openPath(dir);
});
