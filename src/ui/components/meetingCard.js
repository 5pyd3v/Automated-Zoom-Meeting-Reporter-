/**
 * Builds the DOM element for a single uploaded transcript row, showing
 * its detected meeting number, file name (or a parse error), an
 * ending-time picker, and a remove button.
 *
 * @param {{ id: string, fileName: string, meetingNumber: number, error: string|null }} entry
 * @param {{ onTimeChange: (id: string, value: string) => void, onRemove: (id: string) => void }} handlers
 * @returns {HTMLElement}
 */
export function createMeetingCard(entry, handlers) {
  const card = document.createElement('div');
  card.className = 'meeting-card';
  card.dataset.id = entry.id;

  const info = document.createElement('div');
  info.className = 'meeting-card-info';

  const badge = document.createElement('div');
  badge.className = 'meeting-index';
  badge.textContent = String(entry.meetingNumber);

  const nameWrap = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'meeting-name';
  name.textContent = `Meeting ${entry.meetingNumber} — ${entry.fileName}`;
  nameWrap.appendChild(name);

  if (entry.error) {
    const errEl = document.createElement('div');
    errEl.className = 'meeting-file-error';
    errEl.textContent = entry.error;
    nameWrap.appendChild(errEl);
  }

  info.appendChild(badge);
  info.appendChild(nameWrap);

  const timeField = document.createElement('div');
  timeField.className = 'meeting-time-field';

  const label = document.createElement('label');
  label.setAttribute('for', `time-${entry.id}`);
  label.textContent = 'Ending Time';

  const input = document.createElement('input');
  input.type = 'time';
  input.className = 'time-input';
  input.id = `time-${entry.id}`;
  input.value = entry.endingTime || '';
  input.addEventListener('change', (e) => handlers.onTimeChange(entry.id, e.target.value));

  timeField.appendChild(label);
  timeField.appendChild(input);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.type = 'button';
  removeBtn.title = 'Remove';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => handlers.onRemove(entry.id));

  card.appendChild(info);
  card.appendChild(timeField);
  card.appendChild(removeBtn);

  return card;
}
