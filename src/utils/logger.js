/**
 * Minimal structured logger. Kept dependency-free on purpose so the
 * app has no extra runtime requirements just for logging.
 */
function timestamp() {
  return new Date().toISOString();
}

export const logger = {
  info(...args) {
    console.log(`[INFO ${timestamp()}]`, ...args);
  },
  warn(...args) {
    console.warn(`[WARN ${timestamp()}]`, ...args);
  },
  error(...args) {
    console.error(`[ERROR ${timestamp()}]`, ...args);
  },
};
