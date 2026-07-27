import { AppError } from '../../utils/errors.js';

/**
 * @typedef {Object} TranscriptCue
 * @property {string} speaker     Detected speaker name (or "" if none found).
 * @property {string} text        Spoken text for this cue, speaker prefix stripped.
 * @property {string} timestamp   Optional timestamp (for VTT format: "HH:MM:SS.mmm" or "MM:SS.mmm")
 */

const CUE_TIME_REGEX =
  /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/;

// Regex for identifying lines that contain timestamps or are WEBVTT headers
// Used for detecting cue identifier lines and header lines in VTT format
const LINE_REGEX = /^(\d{2}:)?\d{2}:\d{2}\.\d{3}$|^WEBVTT$/;

// Zoom (and most VTT exports) attribute speech either as:
//   "Speaker Name: the spoken line"
// or using WebVTT voice tags:
//   "<v Speaker Name>the spoken line</v>"
const SPEAKER_PREFIX_REGEX = /^([^:<>]{1,80}):\s*(.*)$/
const VOICE_TAG_REGEX = /^<v\s+([^>]+)>(.*?)(<\/v>)?$/i;

/**
 * Converts a WebVTT timestamp ("HH:MM:SS.mmm" or "MM:SS.mmm") to seconds.
 * @param {string} timestamp
 * @returns {number}
 */
function timestampToSeconds(timestamp) {
  const parts = timestamp.split(':').map((p) => p.trim());
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    [hours, minutes, seconds] = parts.map(Number);
  } else if (parts.length === 2) {
    [minutes, seconds] = parts.map(Number);
  } else {
    throw new AppError('Transcript contains an unrecognized timestamp format.');
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Extracts speaker + spoken text from a single line of cue text.
 * Falls back to speaker "" (unknown) if no attribution pattern is found.
 * @param {string} line
 * @returns {{ speaker: string, text: string }}
 */
function extractSpeakerAndText(line) {
  const voiceMatch = line.match(VOICE_TAG_REGEX);
  if (voiceMatch) {
    return { speaker: voiceMatch[1].trim(), text: voiceMatch[2].trim() };
  }

  const prefixMatch = line.match(SPEAKER_PREFIX_REGEX);
  if (prefixMatch) {
    return { speaker: prefixMatch[1].trim(), text: prefixMatch[2].trim() };
  }

  return { speaker: '', text: line.trim() };
}

/**
 * Parses raw WebVTT file content into a clean list of timestamped,
 * speaker-attributed cues. Strips the WEBVTT header, cue numbers,
 * NOTE/STYLE/REGION metadata blocks, and blank lines.
 *
 * @param {string} rawContent
 * @returns {TranscriptCue[]}
 */
export function parseTranscriptFile(rawContent, isVttFormat = true) {
  if (!rawContent || !rawContent.trim()) {
    throw new AppError('The transcript file is empty.');
  }

  // Normalize line endings.
  const lines = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const cues = [];
  let i = 0;

  if (isVttFormat) {
    // Skip everything up to (and including) the WEBVTT header line, if present.
    while (i < lines.length && !LINE_REGEX.test(lines[i]) && !/^WEBVTT/i.test(lines[i].trim())) {
      i++;
    }
    if (i < lines.length && /^WEBVTT/i.test(lines[i].trim())) {
      i++;
    }

    while (i < lines.length) {
      const line = lines[i].trim();

      // Skip blank lines.
      if (line === '') {
        i++;
        continue;
      }

      // Skip metadata blocks (NOTE / STYLE / REGION) until the next blank line.
      if (/^(NOTE|STYLE|REGION)\b/i.test(line)) {
        i++;
        while (i < lines.length && lines[i].trim() !== '') i++;
        continue;
      }

      // Skip a bare cue identifier (a line that is just a number or id,
      // immediately followed by a timing line).
      if (!LINE_REGEX.test(line) && i + 1 < lines.length && LINE_REGEX.test(lines[i + 1])) {
        i++;
        continue;
      }

      const timeMatch = line.match(CUE_TIME_REGEX);
      if (timeMatch) {
        const startTime = timeMatch[1];
        const endTime = timeMatch[2];
        i++;

        // Collect all following non-blank lines as this cue's text.
        const textLines = [];
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i].trim());
          i++;
        }

        const combinedText = textLines.join(' ').trim();
        if (combinedText !== '') {
          const { speaker, text } = extractSpeakerAndText(combinedText);
          if (text !== '') {
            cues.push({
              startTime,
              endTime,
              startSeconds: timestampToSeconds(startTime),
              endSeconds: timestampToSeconds(endTime),
              speaker,
              text,
            });
          }
        }
        continue;
      }

      // Any other stray line (shouldn't normally happen) is skipped.
      i++;
    }

    if (cues.length === 0) {
      throw new AppError('No spoken dialogue could be found in this transcript file.');
    }

    return cues;
  } else {
    // For plain text files (.txt)
    while (i < lines.length) {
      const line = lines[i].trim();

      // Skip blank lines.
      if (line === '') {
        i++;
        continue;
      }

      // Extract speaker and text from each line
      const { speaker, text } = extractSpeakerAndText(line);

      // Only add if there's meaningful text
      if (text !== '') {
        cues.push({
          speaker,
          text,
          timestamp: null, // Plain text files don't have timestamps
        });
      }

      i++;
    }

    if (cues.length === 0) {
      throw new AppError('No spoken dialogue could be found in this transcript file.');
    }

    return cues;
  }
}
