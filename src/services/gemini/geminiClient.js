import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const SUMMARY_PROMPT = `Summarize this meeting.

Write one concise professional paragraph.

Maximum 120 words.

Mention:
Main discussion
Important decisions
Action items

Simple English.
Do not include timestamps.
Do not include greetings.
Return paragraph only.

Transcript:
`;

let cachedClient = null;

/**
 * Lazily creates (and caches) the Gemini SDK client using the API key
 * from the environment. Throws a friendly error if it is missing.
 */
function getClient() {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(
      'Gemini API key is missing. Add GEMINI_API_KEY to your .env file and restart the application.'
    );
  }

  cachedClient = new GoogleGenerativeAI(apiKey);
  return cachedClient;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends the cleaned spoken transcript text to Gemini and returns a
 * single professional summary paragraph. Retries transient failures
 * up to MAX_RETRIES times with a short backoff delay before giving up.
 *
 * @param {string} spokenText
 * @returns {Promise<string>}
 */
export async function summarizeMeeting(spokenText) {
  const client = getClient();
  const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(SUMMARY_PROMPT + spokenText);
      const text = result?.response?.text()?.trim();

      if (!text) {
        throw new AppError('Gemini returned an empty summary.');
      }

      return text;
    } catch (err) {
      lastError = err;
      logger.warn(`Gemini summarization attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new AppError(
    'Gemini summarization failed after multiple attempts. Please check your API key, network connection, and quota.',
    { cause: lastError }
  );
}
