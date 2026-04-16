import { renderBlocks } from '../core/blocks.js';

export function createEditorCanvas({ root, onSelect, onEdit, onRequestImage, onAddBelow }) {
  if (!root) throw new Error('createEditorCanvas: root element required');
  root.classList.add('editor-canvas');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Page preview — click a section to edit it');

  let blocks = [];
  let activeId = null;
  let isUpdatingFromEdit = false;

  function render() {
    root.innerHTML = renderBlocks(blocks, { editable: true, activeId });
    if (!blocks.length) {
      root.innerHTML = '<div class="editor-canvas-empty">This page is empty. Add your first section below.</div>';
    }
    attachHandlers();
  }

  function rerenderBlock(id) {
    const wrap = root.querySelector(`[data-block-wrap="${cssEscape(id)}"]`);
    const block = blocks.find((b) => b.id === id);
    if (!wrap || !block) {
      render();
      return;
    }
    const html = renderBlocks([block], { editable: true, activeId });
    const parent = wrap.parentElement;
    const next = document.createElement('div');
    next.innerHTML = html.trim();
    const fresh = next.firstChild;
    if (fresh instanceof HTMLElement) {
      parent.replaceChild(fresh, wrap);
      attachBlockHandlers(fresh);
      highlightActive();
    } else {
      render();
    }
  }

  function highlightActive() {
    root.querySelectorAll('[data-block-wrap]').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.blockWrap === activeId);
    });
  }

  function attachHandlers() {
    root.querySelectorAll('[data-block-wrap]').forEach(attachBlockHandlers);
  }

  function attachBlockHandlers(wrap) {
    wrap.addEventListener('click', (event) => {
      if (event.target.closest('.editor-block-toolbar')) return;
      const id = wrap.dataset.blockWrap;
      if (id) handleSelect(id);
    });
    wrap.addEventListener('focusin', () => {
      const id = wrap.dataset.blockWrap;
      if (id && id !== activeId) handleSelect(id);
    });

    wrap.querySelectorAll('[data-edit]').forEach((el) => {
      bindContentEditable(el, wrap.dataset.blockWrap);
    });

    injectBlockChrome(wrap);
  }

  function injectBlockChrome(wrap) {
    if (wrap.querySelector(':scope > .editor-block-toolbar')) return;
    const id = wrap.dataset.blockWrap;
    const toolbar = document.createElement('div');
    toolbar.className = 'editor-block-toolbar';
    toolbar.innerHTML = `
      <button type="button" class="editor-block-toolbar-btn" data-chrome="drag" title="Drag to reorder"><i class="bi bi-grip-vertical"></i></button>
      <button type="button" class="editor-block-toolbar-btn" data-chrome="image" title="Change image" hidden><i class="bi bi-image"></i></button>
      <button type="button" class="editor-block-toolbar-btn" data-chrome="add-below" title="Insert section below"><i class="bi bi-plus-circle"></i></button>
    `;
    wrap.prepend(toolbar);

    const type = wrap.dataset.blockType;
    const imgBtn = toolbar.querySelector('[data-chrome="image"]');
    if (imgBtn && HAS_IMAGE.has(type)) imgBtn.hidden = false;

    imgBtn?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (typeof onRequestImage === 'function') onRequestImage(id);
    });
    toolbar.querySelector('[data-chrome="add-below"]').addEventListener('click', (event) => {
      event.stopPropagation();
      if (typeof onAddBelow === 'function') onAddBelow(id);
    });
  }

  function bindContentEditable(el, blockId) {
    el.addEventListener('input', () => {
      if (!blockId) return;
      const field = el.dataset.edit;
      const value = el.innerText.replace(/\u00a0/g, ' ');
      isUpdatingFromEdit = true;
      try {
        if (typeof onEdit === 'function') onEdit({ blockId, field, value });
      } finally {
        isUpdatingFromEdit = false;
      }
    });
    el.addEventListener('paste', (event) => {
      event.preventDefault();
      const text = (event.clipboardData || window.clipboardData)?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && el.tagName === 'H1') {
        event.preventDefault();
        el.blur();
      }
    });
    el.addEventListener('focus', () => {
      const id = el.closest('[data-block-wrap]')?.dataset.blockWrap;
      if (id) handleSelect(id);
    });
  }

  function handleSelect(id) {
    if (id === activeId) return;
    activeId = id;
    highlightActive();
    if (typeof onSelect === 'function') onSelect(id);
  }

  function setBlocks(next, { activeId: nextActive } = {}) {
    blocks = Array.isArray(next) ? next.slice() : [];
    if (nextActive !== undefined) activeId = nextActive;
    render();
  }

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    highlightActive();
  }

  function updateBlockData(id, nextData, { fullRerender = false } = {}) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    block.data = nextData;
    if (fullRerender || isUpdatingFromEdit) {
      if (!isUpdatingFromEdit) rerenderBlock(id);
    } else {
      rerenderBlock(id);
    }
  }

  function getBlocksOrder() {
    return blocks.slice();
  }

  function reorderFromDom(orderedIds) {
    const map = new Map(blocks.map((b) => [b.id, b]));
    const next = [];
    for (const id of orderedIds) {
      const block = map.get(id);
      if (block) next.push(block);
    }
    for (const block of blocks) {
      if (!orderedIds.includes(block.id)) next.push(block);
    }
    blocks = next;
  }

  return {
    root,
    setBlocks,
    setActive,
    rerenderBlock,
    updateBlockData,
    getBlocksOrder,
    reorderFromDom,
    getActiveId: () => activeId
  };
}

const HAS_IMAGE = new Set(['hero', 'image']);

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}
