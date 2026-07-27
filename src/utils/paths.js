import path from 'node:path';
import { app } from 'electron';

/**
 * Resolves the directory where generated Word reports are stored.
 * Uses Electron's userData directory so the app works correctly on
 * every platform (Windows/macOS/Linux) without hardcoding paths, and
 * so it remains writable even when the app is installed system-wide.
 */
export function getOutputDirectory() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'output');
}

/** Absolute path to the single, ever-growing Meetings.docx file. */
export function getOutputFilePath() {
  return path.join(getOutputDirectory(), 'Meetings.docx');
}
