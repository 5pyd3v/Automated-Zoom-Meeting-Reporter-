/**
 * Builds the DOM element summarizing the outcome of processing one
 * transcript: either the generated meeting preview, or a friendly
 * error message.
 *
 * @param {{ fileName: string, error: string|null, preview: object|null }} result
 * @returns {HTMLElement}
 */
export function createResultCard(result) {
  const card = document.createElement('div');
  card.className = `result-card${result.error ? ' error' : ''}`;

  const title = document.createElement('div');
  title.className = 'result-title';

  const badge = document.createElement('span');
  badge.className = `result-badge ${result.error ? 'fail' : 'ok'}`;
  badge.textContent = result.error ? 'Failed' : 'Success';

  const titleText = document.createElement('span');
  titleText.textContent = result.fileName;

  title.appendChild(badge);
  title.appendChild(titleText);
  card.appendChild(title);

  if (result.error) {
    const errEl = document.createElement('div');
    errEl.className = 'result-error-message';
    errEl.textContent = result.error;
    card.appendChild(errEl);
    return card;
  }

  const meta = document.createElement('div');
  meta.className = 'result-meta';
  meta.textContent = `${result.preview.title} · ${result.preview.date} · ${result.preview.startingTime} – ${result.preview.endingTime}`;
  card.appendChild(meta);

  const summary = document.createElement('div');
  summary.className = 'result-summary';
  summary.textContent = result.preview.summary;
  card.appendChild(summary);

  return card;
}
