import { AppError } from '../../utils/errors.js';
import {
  parseTimeInputToMinutes,
  subtractDuration,
  formatMinutesAsClock,
  formatTodayAsDDMMYYYY,
} from '../../utils/timeFormat.js';

const SUPPORT_SPEAKER_NAME = 'support';

/**
 * @typedef {Object} MeetingModel
 * @property {string} participantName   The first non-Support speaker; used as the meeting title.
 * @property {string} date               Today's date, DD-MM-YYYY.
 * @property {string} startingTimeLabel  e.g. "10:40 PM PKT"
 * @property {string} endingTimeLabel    e.g. "11:27 PM PKT"
 * @property {string} spokenText         Cleaned speaker-attributed dialogue, for summarization.
 * @property {string} [summary]          Filled in later by the Gemini step.
 */

/**
 * Builds a full meeting model from parsed transcript cues and the
 * user-supplied ending time, applying the required business rules:
 *
 *  - Start time = ending time minus (last cue end - first "Support" cue start).
 *  - Meeting title = first speaker who is not "Support".
 *
 * @param {import('./vttParser.js').TranscriptCue[]} cues
 * @param {string} endingTimeInput  24-hour "HH:mm" string from the time picker.
 * @returns {MeetingModel}
 */
export function buildMeetingModel(cues, endingTimeInput) {
  const timezoneLabel = process.env.MEETING_TIMEZONE_LABEL?.trim() || 'PKT';

  const firstSupportCue = cues.find((cue) => cue.speaker.trim().toLowerCase() === SUPPORT_SPEAKER_NAME || "roger");
  if (!firstSupportCue) {
    throw new AppError('Could not find a speaker named "Support" in this transcript.');
  }

  const firstParticipantCue = cues.find(
    (cue) => cue.speaker.trim() !== '' && cue.speaker.trim().toLowerCase() !== SUPPORT_SPEAKER_NAME
  );
  if (!firstParticipantCue) {
    throw new AppError('Could not find a participant (non-Support speaker) in this transcript.');
  }

  const lastCue = cues[cues.length - 1];
  const transcriptDurationSeconds = lastCue.endSeconds - firstSupportCue.startSeconds;
  if (transcriptDurationSeconds <= 0) {
    throw new AppError('The transcript timestamps appear to be out of order or invalid.');
  }

  const endingMinutes = parseTimeInputToMinutes(endingTimeInput);
  const startingMinutes = subtractDuration(endingMinutes, transcriptDurationSeconds);

  const spokenText = cues
    .map((cue) => (cue.speaker ? `${cue.speaker}: ${cue.text}` : cue.text))
    .join('\n');

  if (!spokenText.trim()) {
    throw new AppError('No spoken text remained after cleaning this transcript.');
  }

  return {
    participantName: firstParticipantCue.speaker.trim(),
    date: formatTodayAsDDMMYYYY(),
    startingTimeLabel: `${formatMinutesAsClock(startingMinutes)} ${timezoneLabel}`,
    endingTimeLabel: `${formatMinutesAsClock(endingMinutes)} ${timezoneLabel}`,
    spokenText,
    summary: '',
  };
}
