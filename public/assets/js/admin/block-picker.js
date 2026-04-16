import { STRINGS } from './strings.js';

export const BLOCK_TYPES = [
  {
    type: 'hero',
    icon: 'bi-image',
    ...STRINGS.blockTypes.hero,
    defaults: { heading: '', subheading: '', image: '', imageAlt: '', buttonText: '', buttonHref: '' }
  },
  {
    type: 'text',
    icon: 'bi-text-paragraph',
    ...STRINGS.blockTypes.text,
    defaults: { heading: '', body: '' }
  },
  {
    type: 'image',
    icon: 'bi-card-image',
    ...STRINGS.blockTypes.image,
    defaults: { src: '', alt: '', caption: '', href: '' }
  },
  {
    type: 'gallery',
    icon: 'bi-grid-3x3-gap',
    ...STRINGS.blockTypes.gallery,
    defaults: { images: [] }
  },
  {
    type: 'cards',
    icon: 'bi-columns-gap',
    ...STRINGS.blockTypes.cards,
    defaults: { cards: [] }
  },
  {
    type: 'cta',
    icon: 'bi-megaphone',
    ...STRINGS.blockTypes.cta,
    defaults: { heading: '', description: '', buttonText: '', buttonHref: '' }
  },
  {
    type: 'divider',
    icon: 'bi-hr',
    ...STRINGS.blockTypes.divider,
    defaults: { size: 'medium' }
  }
];

function escapeHtml(v = '') {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function openBlockPicker({ anchor, onPick, onDismiss } = {}) {
  const existing = document.querySelector('.editor-block-picker-popover');
  if (existing) existing.remove();

  const pop = document.createElement('div');
  pop.className = 'editor-block-picker-popover';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', STRINGS.blocks.addSection);
  pop.innerHTML = `
    <div class="editor-block-picker-head">
      <strong>${escapeHtml(STRINGS.blocks.addSection)}</strong>
      <button type="button" class="editor-block-picker-close" aria-label="Close">&times;</button>
    </div>
    <div class="editor-block-picker-grid">
      ${BLOCK_TYPES.map((t) => `
        <button type="button" class="editor-block-picker-card" data-pick-type="${escapeHtml(t.type)}">
          <span class="editor-block-picker-icon"><i class="bi ${escapeHtml(t.icon)}"></i></span>
          <span class="editor-block-picker-body">
            <span class="editor-block-picker-label">${escapeHtml(t.label)}</span>
            <span class="editor-block-picker-desc">${escapeHtml(t.description)}</span>
          </span>
        </button>
      `).join('')}
    </div>
  `;

  document.body.appendChild(pop);
  positionPopover(pop, anchor);

  function close() {
    pop.remove();
    document.removeEventListener('mousedown', handleOutside, true);
    document.removeEventListener('keydown', handleKey, true);
    window.removeEventListener('resize', reposition);
    if (typeof onDismiss === 'function') onDismiss();
  }

  function reposition() { positionPopover(pop, anchor); }
  function handleOutside(event) {
    if (!pop.contains(event.target) && event.target !== anchor) close();
  }
  function handleKey(event) {
    if (event.key === 'Escape') close();
  }

  pop.querySelector('.editor-block-picker-close').addEventListener('click', close);
  pop.querySelectorAll('[data-pick-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.pickType;
      const def = BLOCK_TYPES.find((t) => t.type === type);
      if (def) {
        const block = { id: crypto.randomUUID(), type: def.type, data: structuredClone(def.defaults) };
        if (typeof onPick === 'function') onPick(block);
      }
      close();
    });
  });

  setTimeout(() => {
    document.addEventListener('mousedown', handleOutside, true);
    document.addEventListener('keydown', handleKey, true);
    window.addEventListener('resize', reposition);
    pop.querySelector('.editor-block-picker-card')?.focus();
  }, 0);

  return { close };
}

function positionPopover(pop, anchor) {
  const rect = anchor?.getBoundingClientRect?.();
  if (!rect) {
    pop.style.left = '50%';
    pop.style.top = '20%';
    pop.style.transform = 'translateX(-50%)';
    return;
  }
  const popRect = pop.getBoundingClientRect();
  const margin = 8;
  let top = rect.bottom + margin + window.scrollY;
  let left = rect.left + window.scrollX;
  if (left + popRect.width > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - popRect.width - margin);
  }
  if (top + popRect.height > window.innerHeight + window.scrollY - margin) {
    top = rect.top + window.scrollY - popRect.height - margin;
  }
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  pop.style.transform = 'none';
}
