/**
 * Application-level error carrying a user-friendly message.
 * Thrown intentionally by services so the UI can display a clean
 * message instead of a raw stack trace.
 */
export class AppError extends Error {
  /**
   * @param {string} message  User-friendly message safe to show in the UI.
   * @param {{ cause?: unknown, code?: string }} [options]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code ?? 'APP_ERROR';
    if (options.cause) this.cause = options.cause;
  }
}
