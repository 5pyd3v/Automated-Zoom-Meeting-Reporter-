import fs from 'node:fs/promises';
import path from 'node:path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const HEADING_COLOR = '1F3A5F';
const SUBHEADING_COLOR = '2E2E2E';
const LABEL_COLOR = '4A4A4A';
const TEXT_COLOR = '333333';
const TABLE_HEADER_BG = '1F3A5F';
const TABLE_HEADER_FG = 'FFFFFF';
const TABLE_ROW_ALT_BG = 'F2F6FA';
const TABLE_BORDER_COLOR = 'CCCCCC';

/**
 * The `docx` npm package can only build a document from scratch —
 * it cannot open and modify an existing .docx binary. To honor the
 * "append, never overwrite" requirement, every meeting that has ever
 * been generated is kept in a small JSON index file living next to
 * Meetings.docx. Each time a new meeting is added, the full document
 * is rebuilt from that index (old entries + the new one), so no
 * previously generated meeting is ever lost.
 *
 * @param {string} outputPath  Absolute path to Meetings.docx
 * @returns {string} Absolute path to the sidecar index file.
 */
function getIndexPath(outputPath) {
  const dir = path.dirname(outputPath);
  const base = path.basename(outputPath, path.extname(outputPath));
  return path.join(dir, `.${base}.index.json`);
}

/**
 * @param {string} indexPath
 * @returns {Promise<Array<Object>>}
 */
async function loadExistingMeetings(indexPath) {
  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    logger.warn('Meeting index file was unreadable or corrupt; starting a fresh index.', err.message);
    return [];
  }
}

/**
 * Formats a date string (DD-MM-YYYY) to a professional display format
 * e.g., "Monday, 28 July 2025"
 * @param {string} dateStr - Date in DD-MM-YYYY format
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(dateStr) {
  const [day, month, year] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Creates a table cell with consistent formatting.
 */
function createCell(text, options = {}) {
  const {
    bold = false,
    color = TEXT_COLOR,
    size = 20,
    bgColor = null,
    alignment = AlignmentType.LEFT,
  } = options;

  return new TableCell({
    width: { size: options.width || 0, type: WidthType.AUTO },
    shading: bgColor ? { fill: bgColor, type: ShadingType.CLEAR } : undefined,
    children: [
      new Paragraph({
        alignment,
        spacing: { top: 80, bottom: 80 },
        children: [
          new TextRun({
            text: String(text),
            bold,
            color,
            size,
            font: 'Calibri',
          }),
        ],
      }),
    ],
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
  });
}

/**
 * Creates a header cell for the meetings table.
 */
function createHeaderCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { top: 100, bottom: 100 },
        children: [
          new TextRun({
            text: String(text),
            bold: true,
            color: TABLE_HEADER_FG,
            size: 20,
            font: 'Calibri',
          }),
        ],
      }),
    ],
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
  });
}

/**
 * Calculates duration between two time strings (e.g., "10:40 AM" and "11:27 AM")
 * @returns {string} Duration in format "Xh Ym" or "Ym"
 */
function calculateDuration(startTimeStr, endTimeStr) {
  try {
    const parseTime = (timeStr) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      return hour24 * 60 + minutes;
    };

    const startMinutes = parseTime(startTimeStr);
    const endMinutes = parseTime(endTimeStr);
    let diff = endMinutes - startMinutes;
    if (diff < 0) diff += 24 * 60; // Handle overnight

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  } catch {
    return '--';
  }
}

/**
 * Builds the meetings summary table (without Summary column).
 *
 * @param {Array<Object>} meetings
 * @returns {Table}
 */
function buildMeetingsTable(meetings) {
  const rows = [];

  // Header row
  rows.push(
    new TableRow({
      children: [
        createHeaderCell('Date', 18),
        createHeaderCell('Participant', 22),
        createHeaderCell('Start Time', 15),
        createHeaderCell('End Time', 15),
        createHeaderCell('Duration', 15),
        createHeaderCell('Status', 15),
      ],
    })
  );

  // Data rows
  meetings.forEach((meeting, index) => {
    const bgColor = index % 2 === 0 ? null : TABLE_ROW_ALT_BG;

    const startTime = meeting.startingTimeLabel.replace(' PKT', '');
    const endTime = meeting.endingTimeLabel.replace(' PKT', '');
    const duration = calculateDuration(startTime, endTime);

    rows.push(
      new TableRow({
        children: [
          createCell(meeting.date, { bold: true, color: SUBHEADING_COLOR, size: 18, bgColor, width: 18 }),
          createCell(meeting.participantName, { bold: true, color: SUBHEADING_COLOR, size: 18, bgColor, width: 22 }),
          createCell(startTime, { color: TEXT_COLOR, size: 18, bgColor, alignment: AlignmentType.CENTER, width: 15 }),
          createCell(endTime, { color: TEXT_COLOR, size: 18, bgColor, alignment: AlignmentType.CENTER, width: 15 }),
          createCell(duration, { bold: true, color: HEADING_COLOR, size: 18, bgColor, alignment: AlignmentType.CENTER, width: 15 }),
          createCell('Completed', { color: '28A745', size: 18, bgColor, alignment: AlignmentType.CENTER, width: 15 }),
        ],
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: TABLE_BORDER_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: TABLE_BORDER_COLOR },
      left: { style: BorderStyle.SINGLE, size: 1, color: TABLE_BORDER_COLOR },
      right: { style: BorderStyle.SINGLE, size: 1, color: TABLE_BORDER_COLOR },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: TABLE_BORDER_COLOR },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: TABLE_BORDER_COLOR },
    },
    rows,
  });
}

/**
 * Builds the cumulative summary section.
 *
 * @param {Array<Object>} meetings
 * @returns {Paragraph[]}
 */
function buildCumulativeSummary(meetings) {
  const totalMeetings = meetings.length;
  const uniqueParticipants = [...new Set(meetings.map((m) => m.participantName))].length;
  const uniqueDates = [...new Set(meetings.map((m) => m.date))].length;

  // Calculate total duration
  let totalMinutes = 0;
  for (const meeting of meetings) {
    const startTime = meeting.startingTimeLabel.replace(' PKT', '');
    const endTime = meeting.endingTimeLabel.replace(' PKT', '');
    const parseTime = (timeStr) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      return hour24 * 60 + minutes;
    };
    let diff = parseTime(endTime) - parseTime(startTime);
    if (diff < 0) diff += 24 * 60;
    totalMinutes += diff;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const totalDurationStr = totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${remainingMinutes}m`;

  // Combine all summaries
  const allSummaries = meetings.map((m) => m.summary).join('\n\n');

  return [
    // Section heading
    new Paragraph({
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: 'Cumulative Meeting Summary',
          bold: true,
          size: 32,
          color: HEADING_COLOR,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: '────────────────────────────────────────────────────────',
          color: HEADING_COLOR,
          size: 14,
        }),
      ],
    }),
    // Stats summary
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'Overview', bold: true, size: 24, color: SUBHEADING_COLOR }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Total Meetings: ', bold: true, color: LABEL_COLOR, size: 22 }),
        new TextRun({ text: String(totalMeetings), color: TEXT_COLOR, size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Total Duration: ', bold: true, color: LABEL_COLOR, size: 22 }),
        new TextRun({ text: totalDurationStr, color: TEXT_COLOR, size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Unique Participants: ', bold: true, color: LABEL_COLOR, size: 22 }),
        new TextRun({ text: String(uniqueParticipants), color: TEXT_COLOR, size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Meeting Days: ', bold: true, color: LABEL_COLOR, size: 22 }),
        new TextRun({ text: String(uniqueDates), color: TEXT_COLOR, size: 22 }),
      ],
    }),
    // Combined summaries
    new Paragraph({
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({ text: 'Combined Meeting Notes', bold: true, size: 24, color: SUBHEADING_COLOR }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: '────────────────────────────────────────────────────────',
          color: 'CCCCCC',
          size: 14,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: allSummaries, color: TEXT_COLOR, size: 22 }),
      ],
    }),
  ];
}

/**
 * Builds the complete document children for all meetings.
 *
 * @param {Array<Object>} allMeetings
 * @returns {Array<Paragraph | Table>}
 */
function buildAllMeetingsDocument(allMeetings) {
  const children = [];

  // Report title
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 100 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Zoom Meeting Report',
          bold: true,
          size: 40,
          color: HEADING_COLOR,
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 50 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
          color: LABEL_COLOR,
          size: 22,
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: '────────────────────────────────────────────────────────',
          color: HEADING_COLOR,
          size: 14,
        }),
      ],
    })
  );

  // Meetings table (without Summary column)
  children.push(buildMeetingsTable(allMeetings));

  // Cumulative summary
  children.push(...buildCumulativeSummary(allMeetings));

  return children;
}

/**
 * Appends one or more freshly-generated meetings to Meetings.docx,
 * preserving every meeting generated previously. Creates the file
 * (and its parent directory) if it does not exist yet.
 *
 * Output format:
 * 1. Report title with generation date
 * 2. Table of all meetings (Date, Participant, Start Time, End Time, Duration, Status)
 * 3. Cumulative summary with stats and combined notes
 *
 * @param {Array<{ participantName: string, date: string, startingTimeLabel: string, endingTimeLabel: string, summary: string }>} newMeetings
 * @param {string} outputPath  Absolute path to Meetings.docx
 */
export async function appendMeetingsToDocx(newMeetings, outputPath) {
  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const indexPath = getIndexPath(outputPath);
    const existingMeetings = await loadExistingMeetings(indexPath);
    const allMeetings = [...existingMeetings, ...newMeetings];

    const children = buildAllMeetingsDocument(allMeetings);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);
    await fs.writeFile(indexPath, JSON.stringify(allMeetings, null, 2), 'utf-8');
  } catch (err) {
    logger.error('appendMeetingsToDocx failed:', err);
    throw new AppError('Failed to write Meetings.docx. Please make sure the file is not open elsewhere.', {
      cause: err,
    });
  }
}