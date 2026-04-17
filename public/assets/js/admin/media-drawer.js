// Right-side media drawer. Replaces the old modal.
// Features: search, tag chips, drag-upload, multi-file upload, "used on N pages" counter,
// click-to-apply, add/remove tags.

function escapeHtml(v = '') {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createMediaDrawer({
  fetchItems,
  uploadFile,
  addTag,
  removeTag,
  onPick,
  onClose,
  assetUrl
} = {}) {
  if (typeof fetchItems !== 'function') throw new Error('createMediaDrawer: fetchItems required');

  let state = { items: [], tags: [], loading: false, search: '', activeTag: null };
  let root = null;
  let onPickCallback = onPick;
  let onCloseCallback = onClose;

  function render() {
    if (!root) return;
    const filtered = state.items.filter((item) => {
      if (state.activeTag && !(item.tags || []).includes(state.activeTag)) return false;
      if (!state.search) return true;
      const q = state.search.toLowerCase();
      if ((item.label || '').toLowerCase().includes(q)) return true;
      if ((item.path || '').toLowerCase().includes(q)) return true;
      if ((item.tags || []).some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });

    root.innerHTML = `
      <div class="editor-drawer-backdrop" data-drawer-backdrop></div>
      <aside class="editor-drawer" role="dialog" aria-label="Media library">
        <header class="editor-drawer-head">
          <strong>Photos &amp; images</strong>
          <button type="button" class="editor-drawer-close" aria-label="Close">&times;</button>
        </header>
        <div class="editor-drawer-actions">
          <label class="editor-drawer-upload">
            <input type="file" accept="image/*" multiple hidden data-drawer-upload />
            <span class="ac-btn btn-sm"><i class="bi bi-cloud-arrow-up"></i> Upload photos</span>
          </label>
          <input type="search" class="editor-drawer-search" data-drawer-search value="${escapeHtml(state.search)}" placeholder="Search photos by name or tag…" />
        </div>
        <div class="editor-drawer-tagbar" role="group" aria-label="Filter by tag">
          <button type="button" class="editor-drawer-chip ${!state.activeTag ? 'is-active' : ''}" data-drawer-tag="">All</button>
          ${state.tags.map((tag) => `
            <button type="button" class="editor-drawer-chip ${state.activeTag === tag ? 'is-active' : ''}" data-drawer-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
          `).join('')}
        </div>
        ${state.loading ? '<p class="editor-drawer-loading">Loading…</p>' : ''}
        <div class="editor-drawer-grid" data-drawer-grid>
          ${filtered.length === 0 && !state.loading ? `
            <p class="editor-drawer-empty">No photos match. Upload one with the button above.</p>
          ` : filtered.map((item) => `
            <figure class="editor-drawer-item" data-drawer-item="${escapeHtml(item.path)}">
              <button type="button" class="editor-drawer-thumb" data-drawer-pick="${escapeHtml(item.path)}" aria-label="Use ${escapeHtml(item.label || 'photo')}">
                <img src="${escapeHtml(assetUrl ? assetUrl(item.path) : item.path)}" alt="${escapeHtml(item.label || '')}" loading="lazy" />
              </button>
              <figcaption class="editor-drawer-caption">
                <strong>${escapeHtml(item.label || 'Untitled')}</strong>
                <small>${item.usageCount ? `Used on ${item.usageCount} page${item.usageCount === 1 ? '' : 's'}` : 'Unused'}</small>
                <div class="editor-drawer-tags">
                  ${(item.tags || []).map((t) => `
                    <span class="editor-drawer-tag">
                      ${escapeHtml(t)}
                      <button type="button" class="editor-drawer-tag-remove" data-drawer-tag-remove data-path="${escapeHtml(item.path)}" data-tag="${escapeHtml(t)}" aria-label="Remove tag ${escapeHtml(t)}">&times;</button>
                    </span>
                  `).join('')}
                  <button type="button" class="editor-drawer-tag-add" data-drawer-tag-add data-path="${escapeHtml(item.path)}" title="Add tag">+ tag</button>
                </div>
              </figcaption>
            </figure>
          `).join('')}
        </div>
      </aside>`;

    wireEvents();
  }

  function wireEvents() {
    root.querySelector('[data-drawer-backdrop]')?.addEventListener('click', close);
    root.querySelector('.editor-drawer-close')?.addEventListener('click', close);
    root.querySelector('[data-drawer-search]')?.addEventListener('input', (event) => {
      state.search = event.target.value;
      renderGrid();
    });
    root.querySelectorAll('[data-drawer-tag]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeTag = btn.dataset.drawerTag || null;
        render();
      });
    });
    root.querySelectorAll('[data-drawer-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (typeof onPickCallback === 'function') onPickCallback(btn.dataset.drawerPick);
      });
    });
    root.querySelectorAll('[data-drawer-tag-add]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tag = prompt('Add a tag (e.g. "retreat", "portrait"):');
        if (!tag || !tag.trim()) return;
        try {
          await addTag?.(btn.dataset.path, tag.trim());
          await reload();
        } catch (err) {
          alert(err?.message || 'Could not add tag.');
        }
      });
    });
    root.querySelectorAll('[data-drawer-tag-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await removeTag?.(btn.dataset.path, btn.dataset.tag);
          await reload();
        } catch (err) {
          alert(err?.message || 'Could not remove tag.');
        }
      });
    });

    const fileInput = root.querySelector('[data-drawer-upload]');
    fileInput?.addEventListener('change', async () => {
      const files = Array.from(fileInput.files || []);
      fileInput.value = '';
      await uploadMany(files);
    });

    const grid = root.querySelector('[data-drawer-grid]');
    if (grid) {
      grid.addEventListener('dragover', (event) => {
        event.preventDefault();
        grid.classList.add('is-drag-over');
      });
      grid.addEventListener('dragleave', () => grid.classList.remove('is-drag-over'));
      grid.addEventListener('drop', async (event) => {
        event.preventDefault();
        grid.classList.remove('is-drag-over');
        const files = Array.from(event.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
        await uploadMany(files);
      });
    }
  }

  function renderGrid() {
    render();
  }

  async function uploadMany(files) {
    if (!files.length || typeof uploadFile !== 'function') return;
    state.loading = true;
    render();
    try {
      for (const file of files) {
        await uploadFile(file);
      }
      await reload();
    } catch (err) {
      alert(err?.message || 'Upload failed.');
      state.loading = false;
      render();
    }
  }

  async function reload() {
    state.loading = true;
    render();
    const data = await fetchItems();
    state.items = data.items || [];
    state.tags = data.tags || [];
    state.loading = false;
    render();
  }

  function open() {
    if (!root) {
      root = document.createElement('div');
      root.className = 'editor-drawer-root';
      document.body.appendChild(root);
    }
    reload();
  }

  function close() {
    if (root) { root.remove(); root = null; }
    if (typeof onCloseCallback === 'function') onCloseCallback();
  }

  return { open, close, reload, setHandlers(next = {}) {
    if (next.onPick) onPickCallback = next.onPick;
    if (next.onClose) onCloseCallback = next.onClose;
  }};
}
