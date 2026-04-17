import { sanitizeEditorHtml } from './sanitize-client.js';

const TOOLBAR_BUTTONS = [
  { cmd: 'bold', icon: 'bi-type-bold', title: 'Bold (Cmd+B)', shortcut: ['b'] },
  { cmd: 'italic', icon: 'bi-type-italic', title: 'Italic (Cmd+I)', shortcut: ['i'] },
  { cmd: 'link', icon: 'bi-link-45deg', title: 'Add link (Cmd+K)', shortcut: ['k'] },
  { cmd: 'heading', icon: 'bi-type-h2', title: 'Toggle heading' },
  { cmd: 'clear', icon: 'bi-eraser', title: 'Clear formatting' }
];

let activeToolbar = null;
let savedRange = null;

function saveSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
}

function restoreSelection() {
  if (!savedRange) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedRange);
}

function createToolbar() {
  const bar = document.createElement('div');
  bar.className = 'editor-rt-toolbar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Text formatting');
  bar.innerHTML = TOOLBAR_BUTTONS.map((b) =>
    `<button type="button" class="editor-rt-btn" data-rt-cmd="${b.cmd}" title="${b.title}" aria-label="${b.title}"><i class="bi ${b.icon}"></i></button>`
  ).join('');
  bar.style.position = 'absolute';
  bar.style.display = 'none';
  document.body.appendChild(bar);
  bar.addEventListener('mousedown', (e) => e.preventDefault());
  bar.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-rt-cmd]');
    if (!btn) return;
    event.preventDefault();
    runCommand(btn.dataset.rtCmd);
  });
  return bar;
}

function ensureToolbar() {
  if (!activeToolbar) activeToolbar = createToolbar();
  return activeToolbar;
}

function positionToolbar(bar, target) {
  const rect = target.getBoundingClientRect();
  const top = rect.top + window.scrollY - bar.offsetHeight - 8;
  const left = rect.left + window.scrollX;
  bar.style.top = `${Math.max(8, top)}px`;
  bar.style.left = `${left}px`;
  bar.style.display = 'flex';
}

function hideToolbar() {
  if (activeToolbar) activeToolbar.style.display = 'none';
}

function runCommand(cmd) {
  restoreSelection();
  switch (cmd) {
    case 'bold': document.execCommand('bold'); break;
    case 'italic': document.execCommand('italic'); break;
    case 'link': {
      const url = prompt('Enter link URL (https:// or /your-page):');
      if (url && url.trim()) document.execCommand('createLink', false, url.trim());
      break;
    }
    case 'heading': {
      document.execCommand('formatBlock', false, 'h2');
      break;
    }
    case 'clear': document.execCommand('removeFormat'); break;
  }
  saveSelection();
  if (currentTarget) notifyEdit(currentTarget);
}

let currentTarget = null;
let editCallback = null;

function notifyEdit(el) {
  if (typeof editCallback !== 'function') return;
  const dirty = el.innerHTML;
  const clean = sanitizeEditorHtml(dirty);
  if (clean !== dirty) el.innerHTML = clean;
  editCallback({ element: el, html: clean });
}

export function attachRichtext(el, { onEdit } = {}) {
  if (!el || el.dataset.rtReady === '1') return;
  el.dataset.rtReady = '1';
  editCallback = onEdit;

  el.addEventListener('focus', () => {
    currentTarget = el;
    const bar = ensureToolbar();
    positionToolbar(bar, el);
  });
  el.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement !== el && !document.activeElement?.closest('.editor-rt-toolbar')) {
        hideToolbar();
        currentTarget = null;
      }
    }, 120);
  });
  el.addEventListener('keyup', () => { saveSelection(); });
  el.addEventListener('mouseup', () => { saveSelection(); });
  el.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'b') { event.preventDefault(); runCommand('bold'); }
    else if (key === 'i') { event.preventDefault(); runCommand('italic'); }
    else if (key === 'k') { event.preventDefault(); runCommand('link'); }
  });
  el.addEventListener('input', () => notifyEdit(el));
  el.addEventListener('paste', (event) => {
    event.preventDefault();
    const html = event.clipboardData?.getData('text/html') || '';
    const text = event.clipboardData?.getData('text/plain') || '';
    if (html) {
      const clean = sanitizeEditorHtml(html);
      document.execCommand('insertHTML', false, clean);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
    notifyEdit(el);
  });
}

export function detachAllRichtext() {
  hideToolbar();
  currentTarget = null;
}
