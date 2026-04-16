import { getProductFallbackImage, getProductImageSource } from './core/format.js';
import { assetUrl, withBasePath } from './core/site.js';
import Sortable from '../vendor/sortable.esm.js';
import { createEditorCanvas } from './admin/editor-canvas.js';
import { createAutosave } from './admin/autosave.js';
import { createHistory, bindUndoHotkeys } from './admin/history.js';
import { BLOCK_TYPES, openBlockPicker } from './admin/block-picker.js';
import { STRINGS } from './admin/strings.js';

// ── State ──

const editorState = {
  site: null,
  about: null,
  products: null,
  mediaLibrary: [],
  drafts: {
    hero: {},
    quicknav: {},
    about: {},
    products: { items: {}, added: [], removed: {} }
  },
  dirty: { hero: false, quicknav: false, about: false, products: false },
  activeSection: 'hero',
  pages: [],
  activePage: null,
  pageBlocks: [],
  pageDirty: false,
  activeBlockId: null
};

let mediaPickerContext = null;

// ── Helpers ──

function escapeHtml(v = '') {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function linesToArray(v) {
  return String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

function arrayToLines(a = []) {
  return (a || []).join('\n');
}

function paragraphsToArray(v) {
  return String(v || '').split(/\n\s*\n/g).map((s) => s.trim()).filter(Boolean);
}

function arrayToParagraphs(a = []) {
  return (a || []).join('\n\n');
}

function cloneDeep(v) {
  return structuredClone(v);
}

function deepSet(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = keys[i + 1];
    if (current[k] == null) {
      current[k] = /^\d+$/.test(next) ? [] : {};
    }
    current = current[k];
  }
  current[keys[keys.length - 1]] = value;
}

function flattenDraft(draft, prefix = '') {
  const entries = [];
  for (const [k, v] of Object.entries(draft)) {
    if (k.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      entries.push(...flattenDraft(v, path));
    } else {
      entries.push([path, v]);
    }
  }
  return entries;
}

function resolveImagePreview(path, fallback = withBasePath('/assets/img/ashley-portrait.svg')) {
  if (!path) return fallback;
  return assetUrl(path, fallback);
}

const FIELD_TRANSFORMS = {
  'home.heroDetails': linesToArray
};

// ── API ──

async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.replace('/admin/login/');
    throw new Error('Authentication required.');
  }
  if (!response.ok) {
    const detail = payload?.error?.formErrors?.join(', ') || payload?.error || 'Request failed.';
    throw new Error(detail);
  }
  return payload;
}

function showBanner(type, msg) {
  const el = document.getElementById('editor-banner');
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('d-none');
  clearTimeout(showBanner._t);
  showBanner._t = setTimeout(() => el.classList.add('d-none'), 4000);
}

function markDirty(key) {
  editorState.dirty[key] = true;
  updateDirtyIndicator(key);
}

function clearDirty(key) {
  editorState.dirty[key] = false;
  updateDirtyIndicator(key);
}

function updateDirtyIndicator(key) {
  const paletteBtn = document.querySelector(`[data-section-key="${key}"]`);
  if (paletteBtn) paletteBtn.classList.toggle('is-dirty', editorState.dirty[key]);
  const note = document.querySelector('.editor-dirty-note');
  if (note && editorState.activeSection === key) {
    note.hidden = !editorState.dirty[key];
  }
}

function getEffective(key) {
  const section = SECTION_REGISTRY.find((s) => s.key === key);
  if (!section) return {};
  const base = cloneDeep(editorState[section.dataKey]);
  if (!base) return {};
  const draft = editorState.drafts[key];
  if (key === 'products') return base;
  for (const [path, val] of flattenDraft(draft)) {
    deepSet(base, path, val);
  }
  return base;
}

// ── Section Registry ──

const SECTION_REGISTRY = [
  {
    key: 'hero',
    label: 'Home Hero',
    description: 'Opening headline, photo, and intro on home page.',
    dataKey: 'site',
    endpoint: '/api/admin/blocks/site',
    renderPreview: renderHeroPreview,
    renderFields: renderHeroFields,
    bindFields: bindHeroFields,
    buildPayload: buildHeroPayload
  },
  {
    key: 'quicknav',
    label: 'Quick Navigation',
    description: 'Three shortcut cards visitors see on home page.',
    dataKey: 'site',
    endpoint: '/api/admin/blocks/site',
    renderPreview: renderQuicknavPreview,
    renderFields: renderQuicknavFields,
    bindFields: bindQuicknavFields,
    buildPayload: buildQuicknavPayload
  },
  {
    key: 'about',
    label: 'About Page',
    description: 'Bio, portrait, current work, and callout.',
    dataKey: 'about',
    endpoint: '/api/admin/blocks/about',
    renderPreview: renderAboutPreview,
    renderFields: renderAboutFields,
    bindFields: bindAboutFields,
    buildPayload: buildAboutPayload
  },
  {
    key: 'products',
    label: 'My Work',
    description: 'Books, resources, images, and store links.',
    dataKey: 'products',
    endpoint: '/api/admin/blocks/products',
    renderPreview: renderProductsPreview,
    renderFields: renderProductsFields,
    bindFields: bindProductsFields,
    buildPayload: buildProductsPayload
  }
];

// ── Drop Zone Renderer ──

function renderDropZone({ path, value }) {
  const preview = resolveImagePreview(value);
  return `
    <div class="editor-drop-zone" data-drop-zone data-drop-path="${escapeHtml(path)}">
      <img class="editor-drop-preview" data-preview-field="${escapeHtml(path)}" src="${escapeHtml(preview)}" alt="" />
      <div class="editor-drop-zone-overlay">
        <div class="editor-drop-icon"><i class="bi bi-cloud-arrow-up"></i></div>
        <p class="editor-drop-hint">Drop an image or click to upload</p>
        <div class="editor-drop-actions">
          <button type="button" class="btn-outline btn-sm" data-drop-upload>Upload file</button>
          <button type="button" class="btn-outline btn-sm" data-drop-library>Choose from library</button>
        </div>
      </div>
      <input type="file" accept="image/*" hidden data-drop-input />
    </div>`;
}

// ── Hero Section ──

function renderHeroPreview(effective) {
  const home = effective?.home || {};
  const details = Array.isArray(home.heroDetails) ? home.heroDetails : [];
  const ctas = home.heroCTAs || [];
  return `
    <article class="editor-preview-card preview-hero">
      <figure class="preview-hero-figure">
        <img data-preview-field="home.heroImage" src="${escapeHtml(resolveImagePreview(home.heroImage))}" alt="${escapeHtml(home.heroImageAlt || '')}" />
      </figure>
      <div class="preview-hero-copy">
        <p class="preview-eyebrow" data-preview-field="home.heroEyebrow">${escapeHtml(home.heroEyebrow || '')}</p>
        <h2 class="preview-heading" data-preview-field="home.heroHeading">${escapeHtml(home.heroHeading || '')}</h2>
        <p class="preview-body" data-preview-field="home.heroSubheading">${escapeHtml(home.heroSubheading || '')}</p>
        <ul class="preview-facts" data-preview-region="home.heroDetails">
          ${details.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}
        </ul>
        ${ctas.length ? `<div class="preview-cta-row">${ctas.map((c) => `<span class="preview-chip">${escapeHtml(c.label || c.text || 'Button')}</span>`).join('')}</div>` : ''}
        <small class="preview-hint">Homepage buttons are managed in Admin → Buttons & Links.</small>
      </div>
    </article>`;
}

function renderHeroFields(effective) {
  const home = effective?.home || {};
  return `
    <div class="editor-field-group">
      <div class="editor-field">
        <label>Small text above headline</label>
        <input data-field-path="home.heroEyebrow" data-section="hero" value="${escapeHtml(home.heroEyebrow || '')}" />
      </div>
      <div class="editor-field">
        <label>Main heading</label>
        <input data-field-path="home.heroHeading" data-section="hero" value="${escapeHtml(home.heroHeading || '')}" />
      </div>
      <div class="editor-field">
        <label>Intro paragraph</label>
        <textarea data-field-path="home.heroSubheading" data-section="hero" rows="4">${escapeHtml(home.heroSubheading || '')}</textarea>
      </div>
      <div class="editor-field">
        <label>Portrait photo</label>
        ${renderDropZone({ path: 'home.heroImage', value: home.heroImage, label: 'Portrait photo' })}
      </div>
      <div class="editor-field">
        <label>Image description (alt text)</label>
        <input data-field-path="home.heroImageAlt" data-section="hero" value="${escapeHtml(home.heroImageAlt || '')}" />
      </div>
      <div class="editor-field">
        <label>Quick facts</label>
        <textarea data-field-path="home.heroDetails" data-section="hero" rows="5">${escapeHtml(arrayToLines(home.heroDetails || []))}</textarea>
        <span class="editor-helper">One item per line.</span>
      </div>
    </div>`;
}

function bindHeroFields(root) {
  root.querySelectorAll('[data-field-path][data-section="hero"]').forEach((el) => {
    el.addEventListener('input', () => handleFieldChange('hero', el.dataset.fieldPath, el.value));
  });
}

function buildHeroPayload() {
  const base = cloneDeep(editorState.site);
  const draft = editorState.drafts.hero;
  for (const [path, val] of flattenDraft(draft)) {
    deepSet(base, path, val);
  }
  if (typeof base.home.heroDetails === 'string') {
    base.home.heroDetails = linesToArray(base.home.heroDetails);
  }
  return base;
}

// ── Quick Nav Section ──

function renderQuicknavPreview(effective) {
  const cards = effective?.home?.quickNav || [];
  return `
    <div class="editor-preview-card">
      <div class="preview-quicknav-grid">
        ${cards.map((c, i) => `
          <article class="preview-quicknav-card" data-preview-item="${i}">
            <h3 data-preview-field="home.quickNav.${i}.title">${escapeHtml(c.title || '')}</h3>
            <p data-preview-field="home.quickNav.${i}.description">${escapeHtml(c.description || '')}</p>
            <span class="preview-chip" data-preview-field="home.quickNav.${i}.linkText">${escapeHtml(c.linkText || 'Link')}</span>
          </article>`).join('')}
      </div>
    </div>`;
}

function renderQuicknavFields(effective) {
  const cards = effective?.home?.quickNav || [];
  return `<div class="editor-field-group">
    ${cards.map((c, i) => `
      <details class="editor-accordion" ${i === 0 ? 'open' : ''}>
        <summary>Card ${i + 1}: ${escapeHtml(c.title || 'Untitled')}</summary>
        <div class="editor-field">
          <label>Title</label>
          <input data-field-path="home.quickNav.${i}.title" data-section="quicknav" value="${escapeHtml(c.title || '')}" />
        </div>
        <div class="editor-field">
          <label>Description</label>
          <textarea data-field-path="home.quickNav.${i}.description" data-section="quicknav" rows="2">${escapeHtml(c.description || '')}</textarea>
        </div>
        <div class="editor-field">
          <label>Link text</label>
          <input data-field-path="home.quickNav.${i}.linkText" data-section="quicknav" value="${escapeHtml(c.linkText || '')}" />
        </div>
        <div class="editor-field">
          <label>Destination URL</label>
          <input data-field-path="home.quickNav.${i}.href" data-section="quicknav" value="${escapeHtml(c.href || '')}" />
        </div>
      </details>`).join('')}
  </div>`;
}

function bindQuicknavFields(root) {
  root.querySelectorAll('[data-field-path][data-section="quicknav"]').forEach((el) => {
    el.addEventListener('input', () => handleFieldChange('quicknav', el.dataset.fieldPath, el.value));
  });
}

function buildQuicknavPayload() {
  const base = cloneDeep(editorState.site);
  const draft = editorState.drafts.quicknav;
  for (const [path, val] of flattenDraft(draft)) {
    deepSet(base, path, val);
  }
  return base;
}

// ── About Section ──

function renderAboutPreview(effective) {
  const about = effective || {};
  const bioText = Array.isArray(about.bio) ? about.bio.join(' ') : (about.bio || '');
  const bioTrunc = bioText.length > 100 ? bioText.slice(0, 100) + '…' : bioText;
  const cw = about.currentWork || {};
  const cta = about.cta || {};

  return `
    <div class="editor-preview-card">
      <div class="preview-about">
        <div class="preview-about-portrait">
          <img data-preview-field="portrait" src="${escapeHtml(resolveImagePreview(about.portrait))}" alt="" />
        </div>
        <div>
          <h3 data-preview-field="headline" style="margin:0 0 0.25rem">${escapeHtml(about.headline || '')}</h3>
          <p data-preview-field="tagline" style="font-size:0.85rem;color:var(--secondary);margin:0">${escapeHtml(about.tagline || '')}</p>
          <p style="font-size:0.82rem;margin:0.5rem 0 0">${escapeHtml(bioTrunc)}</p>
        </div>
      </div>
      ${cw.heading ? `
        <div class="preview-about-callout" style="margin-top:0.75rem">
          <small style="text-transform:uppercase;letter-spacing:0.1em;color:var(--secondary)" data-preview-field="currentWork.eyebrow">${escapeHtml(cw.eyebrow || '')}</small>
          <h4 data-preview-field="currentWork.heading" style="font-size:1rem;margin:0.2rem 0">${escapeHtml(cw.heading || '')}</h4>
          <p data-preview-field="currentWork.description" style="font-size:0.82rem;color:var(--secondary);margin:0">${escapeHtml(cw.description || '')}</p>
        </div>` : ''}
      ${cta.heading ? `
        <div class="preview-about-callout">
          <strong data-preview-field="cta.heading">${escapeHtml(cta.heading)}</strong>
          <p data-preview-field="cta.description" style="font-size:0.82rem;color:var(--secondary);margin:0.2rem 0 0">${escapeHtml(cta.description || '')}</p>
        </div>` : ''}
    </div>`;
}

function renderAboutFields(effective) {
  const about = effective || {};
  const cw = about.currentWork || {};
  const cta = about.cta || {};
  const bioVal = Array.isArray(about.bio) ? arrayToParagraphs(about.bio) : (about.bio || '');

  return `<div class="editor-field-group">
    <details class="editor-accordion" open>
      <summary>Photos & Identity</summary>
      <div class="editor-field">
        <label>Portrait image</label>
        ${renderDropZone({ path: 'portrait', value: about.portrait, label: 'Portrait' })}
      </div>
      <div class="editor-field">
        <label>Headline</label>
        <input data-field-path="headline" data-section="about" value="${escapeHtml(about.headline || '')}" />
      </div>
      <div class="editor-field">
        <label>Tagline</label>
        <input data-field-path="tagline" data-section="about" value="${escapeHtml(about.tagline || '')}" />
      </div>
      <div class="editor-field">
        <label>Location</label>
        <input data-field-path="location" data-section="about" value="${escapeHtml(about.location || '')}" />
      </div>
    </details>
    <details class="editor-accordion">
      <summary>Biography</summary>
      <div class="editor-field">
        <label>Bio text</label>
        <textarea data-field-path="bio" data-section="about" rows="8">${escapeHtml(bioVal)}</textarea>
        <span class="editor-helper">Separate paragraphs with a blank line.</span>
      </div>
    </details>
    <details class="editor-accordion">
      <summary>Current Work</summary>
      <div class="editor-field">
        <label>Eyebrow</label>
        <input data-field-path="currentWork.eyebrow" data-section="about" value="${escapeHtml(cw.eyebrow || '')}" />
      </div>
      <div class="editor-field">
        <label>Heading</label>
        <input data-field-path="currentWork.heading" data-section="about" value="${escapeHtml(cw.heading || '')}" />
      </div>
      <div class="editor-field">
        <label>Description</label>
        <textarea data-field-path="currentWork.description" data-section="about" rows="4">${escapeHtml(cw.description || '')}</textarea>
      </div>
    </details>
    <details class="editor-accordion">
      <summary>Contact Callout</summary>
      <div class="editor-field">
        <label>Callout title</label>
        <input data-field-path="cta.heading" data-section="about" value="${escapeHtml(cta.heading || '')}" />
      </div>
      <div class="editor-field">
        <label>Description</label>
        <textarea data-field-path="cta.description" data-section="about" rows="3">${escapeHtml(cta.description || '')}</textarea>
      </div>
      <div class="editor-field">
        <label>Button text</label>
        <input data-field-path="cta.linkText" data-section="about" value="${escapeHtml(cta.linkText || '')}" />
      </div>
      <div class="editor-field">
        <label>Button link</label>
        <input data-field-path="cta.linkHref" data-section="about" value="${escapeHtml(cta.linkHref || '')}" />
      </div>
    </details>
    <p class="editor-helper" style="margin:0">Speaking topics and education are managed in the main Admin (too list-heavy for live editing).</p>
  </div>`;
}

function bindAboutFields(root) {
  root.querySelectorAll('[data-field-path][data-section="about"]').forEach((el) => {
    el.addEventListener('input', () => handleFieldChange('about', el.dataset.fieldPath, el.value));
  });
}

function buildAboutPayload() {
  const base = cloneDeep(editorState.about);
  const draft = editorState.drafts.about;
  for (const [path, val] of flattenDraft(draft)) {
    deepSet(base, path, val);
  }
  if (typeof base.bio === 'string') {
    base.bio = paragraphsToArray(base.bio);
  }
  return base;
}

// ── Products Section ──

function getProductPreview(item) {
  const fallback = withBasePath(getProductFallbackImage(item));
  const image = assetUrl(getProductImageSource(item), fallback);
  return { image, fallback };
}

function getEffectiveProduct(item) {
  const patch = editorState.drafts.products.items[item.id];
  if (!patch) return item;
  return { ...item, ...patch };
}

function getAllProducts() {
  const canonical = editorState.products?.products || [];
  const removed = editorState.drafts.products.removed;
  const added = editorState.drafts.products.added || [];
  return [
    ...added.filter((a) => !a._removed),
    ...canonical.filter((p) => !removed[p.id])
  ];
}

function renderProductsPreview() {
  const allProducts = getAllProducts();
  const activeId = editorState.drafts.products.activeId;
  const removed = editorState.drafts.products.removed;

  return `
    <div class="editor-preview-card">
      <div class="preview-products-grid">
        ${allProducts.map((item) => {
          const p = getEffectiveProduct(item);
          const { image, fallback } = getProductPreview(p);
          const isEditing = p.id === activeId;
          const isRemoved = removed[p.id];
          const links = [];
          if (p.amazonUrl) links.push('Amazon');
          if (p.tptUrl) links.push('TPT');
          return `
            <article class="editor-product-card ${isEditing ? 'is-editing' : ''} ${isRemoved ? 'is-removed' : ''}" data-product-card="${escapeHtml(p.id)}">
              <div class="editor-product-thumb">
                <img data-preview-field="product.${p.id}.image" src="${escapeHtml(image)}" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';" alt="" />
              </div>
              <div class="editor-product-category" data-preview-field="product.${p.id}.category">${escapeHtml(p.category || 'Work')}</div>
              <p class="editor-product-title" data-preview-field="product.${p.id}.title">${escapeHtml(p.title || 'Untitled')}</p>
              <p class="editor-product-desc" data-preview-field="product.${p.id}.description">${escapeHtml(p.description || '')}</p>
              ${links.length ? `<div class="editor-product-links">${links.map((l) => `<span class="preview-chip">${l}</span>`).join('')}</div>` : ''}
              <button type="button" class="btn-outline btn-sm" data-edit-product="${escapeHtml(p.id)}" style="justify-self:end">${isEditing ? 'Editing…' : 'Edit'}</button>
            </article>`;
        }).join('')}
      </div>
    </div>`;
}

function renderProductsFields() {
  const activeId = editorState.drafts.products.activeId;
  if (!activeId) {
    return `
      <div class="editor-field-group">
        <p style="color:var(--secondary);margin:0">Click <strong>Edit</strong> on a product card, or add a new one.</p>
        <button type="button" class="ac-btn btn-sm" data-add-product>+ Add Work Item</button>
      </div>`;
  }

  const allProducts = getAllProducts();
  const item = allProducts.find((p) => p.id === activeId);
  if (!item) return '';

  const p = getEffectiveProduct(item);
  const CATS = ['Academic Writing', 'Creative Works', 'Teaching & Resources'];

  return `
    <div class="editor-field-group">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${escapeHtml(p.title || 'Work Item')}</strong>
        <div style="display:flex;gap:0.5rem">
          <button type="button" class="btn-outline btn-sm" data-done-product>Done editing</button>
          <button type="button" class="btn-outline btn-sm" style="color:#c23616" data-remove-product="${escapeHtml(p.id)}">Remove</button>
        </div>
      </div>
      <div class="editor-field">
        <label>Title</label>
        <input data-product-field="title" data-product-id="${escapeHtml(activeId)}" value="${escapeHtml(p.title || '')}" />
      </div>
      <div class="editor-field">
        <label>Category</label>
        <input data-product-field="category" data-product-id="${escapeHtml(activeId)}" list="editor-cat-list" value="${escapeHtml(p.category || '')}" />
        <datalist id="editor-cat-list">${CATS.map((c) => `<option value="${escapeHtml(c)}"></option>`).join('')}</datalist>
      </div>
      <div class="editor-field">
        <label>Short description</label>
        <textarea data-product-field="description" data-product-id="${escapeHtml(activeId)}" rows="3">${escapeHtml(p.description || '')}</textarea>
      </div>
      <div class="editor-field">
        <label>Cover image</label>
        ${renderDropZone({ path: `product.${activeId}.image`, value: p.image, label: 'Cover image' })}
      </div>
      <div class="editor-field">
        <label>Image description (alt text)</label>
        <input data-product-field="imageAlt" data-product-id="${escapeHtml(activeId)}" value="${escapeHtml(p.imageAlt || '')}" />
      </div>
      <div class="editor-field">
        <label>Amazon link</label>
        <input data-product-field="amazonUrl" data-product-id="${escapeHtml(activeId)}" value="${escapeHtml(p.amazonUrl || '')}" />
      </div>
      <div class="editor-field">
        <label>TPT link</label>
        <input data-product-field="tptUrl" data-product-id="${escapeHtml(activeId)}" value="${escapeHtml(p.tptUrl || '')}" />
      </div>
      <div class="editor-field">
        <label>Featured on homepage</label>
        <select data-product-field="featured" data-product-id="${escapeHtml(activeId)}">
          <option value="true" ${p.featured ? 'selected' : ''}>Yes</option>
          <option value="false" ${!p.featured ? 'selected' : ''}>No</option>
        </select>
      </div>
      <button type="button" class="ac-btn btn-sm" data-add-product>+ Add Work Item</button>
    </div>`;
}

function bindProductsFields(root) {
  root.querySelectorAll('[data-edit-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editorState.drafts.products.activeId = btn.dataset.editProduct;
      loadSection('products');
    });
  });

  root.querySelectorAll('[data-product-field]').forEach((el) => {
    const handler = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(handler, () => {
      const pid = el.dataset.productId;
      const field = el.dataset.productField;
      if (!editorState.drafts.products.items[pid]) {
        editorState.drafts.products.items[pid] = {};
      }
      editorState.drafts.products.items[pid][field] = el.value;
      markDirty('products');

      const previewEl = document.querySelector(`[data-preview-field="product.${pid}.${field}"]`);
      if (previewEl) {
        if (previewEl.tagName === 'IMG') {
          previewEl.src = resolveImagePreview(el.value);
        } else {
          previewEl.textContent = el.value;
        }
      }
    });
  });

  root.querySelectorAll('[data-add-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newId = 'tmp_' + crypto.randomUUID();
      const blank = {
        id: newId, title: '', category: '', description: '',
        image: '', imageAlt: '', amazonUrl: '', tptUrl: '', featured: false
      };
      editorState.drafts.products.added.push(blank);
      editorState.drafts.products.activeId = newId;
      markDirty('products');
      loadSection('products');
    });
  });

  const doneBtn = root.querySelector('[data-done-product]');
  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      editorState.drafts.products.activeId = null;
      loadSection('products');
    });
  }

  root.querySelectorAll('[data-remove-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.removeProduct;
      const isAdded = editorState.drafts.products.added.find((a) => a.id === pid);
      if (isAdded) {
        isAdded._removed = true;
      } else {
        editorState.drafts.products.removed[pid] = true;
      }
      if (editorState.drafts.products.activeId === pid) {
        editorState.drafts.products.activeId = null;
      }
      markDirty('products');
      loadSection('products');
    });
  });
}

function buildProductsPayload() {
  const canonical = editorState.products?.products || [];
  const drafts = editorState.drafts.products;
  const items = [];

  for (const item of canonical) {
    if (drafts.removed[item.id]) continue;
    const patch = drafts.items[item.id] || {};
    const merged = { ...item, ...patch };
    if ('featured' in patch) merged.featured = patch.featured === 'true' || patch.featured === true;
    items.push(merged);
  }

  for (const added of drafts.added) {
    if (added._removed) continue;
    const patch = drafts.items[added.id] || {};
    const merged = { ...added, ...patch };
    delete merged._removed;
    if ('featured' in patch) merged.featured = patch.featured === 'true' || patch.featured === true;
    items.push(merged);
  }

  return { products: items };
}

// ── Generic Field Change & Live Preview ──

function handleFieldChange(sectionKey, fieldPath, rawValue) {
  const transform = FIELD_TRANSFORMS[fieldPath];
  const value = transform ? transform(rawValue) : rawValue;
  deepSet(editorState.drafts[sectionKey], fieldPath, value);
  markDirty(sectionKey);
  updateLivePreview(sectionKey, fieldPath, value);
}

function updateLivePreview(sectionKey, path, value) {
  const previewEl = document.querySelector(`[data-preview-field="${path}"]`);
  if (previewEl) {
    if (previewEl.tagName === 'IMG') {
      previewEl.src = resolveImagePreview(value);
    } else {
      previewEl.textContent = Array.isArray(value) ? value.join(', ') : value;
    }
    return;
  }

  const regionEl = document.querySelector(`[data-preview-region="${path}"]`);
  if (regionEl) {
    const arr = Array.isArray(value) ? value : [value];
    regionEl.innerHTML = arr.map((d) => `<li>${escapeHtml(d)}</li>`).join('');
  }
}

// ── Drop Zone Binding ──

function bindDropZones(root, sectionKey) {
  root.querySelectorAll('[data-drop-zone]').forEach((zone) => {
    const path = zone.dataset.dropPath;

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('is-drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-drag-over'));
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('is-drag-over');
      const file = e.dataTransfer.files[0];
      if (file) await uploadFile(file, path, sectionKey);
    });

    const uploadBtn = zone.querySelector('[data-drop-upload]');
    const fileInput = zone.querySelector('[data-drop-input]');
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (file) await uploadFile(file, path, sectionKey);
      });
    }

    const libBtn = zone.querySelector('[data-drop-library]');
    if (libBtn) {
      libBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMediaModal(path, sectionKey);
      });
    }
  });
}

async function uploadFile(file, path, sectionKey) {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await api('/api/admin/media', { method: 'POST', body: form });
    const url = res.item?.path || res.path || '';
    if (res.item) {
      editorState.mediaLibrary = [res.item, ...editorState.mediaLibrary.filter((m) => m.path !== url)];
    }
    applyImageToField(path, url, sectionKey);
    showBanner('success', 'Image uploaded.');
  } catch (err) {
    showBanner('danger', err.message || 'Upload failed.');
  }
}

function applyImageToField(path, url, sectionKey) {
  if (path.startsWith('block.')) {
    handleBlockImageApply(path, url);
    return;
  }

  if (path.startsWith('product.')) {
    const parts = path.split('.');
    const pid = parts[1];
    if (!editorState.drafts.products.items[pid]) {
      editorState.drafts.products.items[pid] = {};
    }
    editorState.drafts.products.items[pid].image = url;
    markDirty('products');
    loadSection('products');
    return;
  }

  handleFieldChange(sectionKey, path, url);
  const img = document.querySelector(`[data-preview-field="${path}"]`);
  if (img && img.tagName === 'IMG') img.src = resolveImagePreview(url);
  const dropImg = document.querySelector(`[data-drop-path="${path}"] .editor-drop-preview`);
  if (dropImg) dropImg.src = resolveImagePreview(url);
}

// ── Media Modal ──

function openMediaModal(path, sectionKey) {
  mediaPickerContext = { path, sectionKey };
  const modal = document.getElementById('editor-media-modal');
  modal.hidden = false;
  renderMediaTab('library');
}

function closeMediaModal() {
  document.getElementById('editor-media-modal').hidden = true;
  mediaPickerContext = null;
}

function renderMediaTab(tab) {
  const body = document.getElementById('editor-modal-body');
  document.querySelectorAll('.editor-modal-tab').forEach((t) => {
    t.classList.toggle('is-active', t.dataset.modalTab === tab);
  });

  if (tab === 'library') {
    if (!editorState.mediaLibrary.length) {
      body.innerHTML = '<p style="color:var(--secondary)">No images in library yet. Upload one first.</p>';
      return;
    }
    body.innerHTML = `<div class="editor-media-grid">${editorState.mediaLibrary.map((m) =>
      `<button class="editor-media-tile" type="button" data-pick-media="${escapeHtml(m.path)}">
        <img src="${escapeHtml(resolveImagePreview(m.path))}" alt="${escapeHtml(m.label || '')}" />
      </button>`
    ).join('')}</div>`;

    body.querySelectorAll('[data-pick-media]').forEach((tile) => {
      tile.addEventListener('click', () => {
        if (!mediaPickerContext) return;
        applyImageToField(mediaPickerContext.path, tile.dataset.pickMedia, mediaPickerContext.sectionKey);
        closeMediaModal();
      });
    });
  } else {
    body.innerHTML = `
      <div style="display:grid;gap:0.85rem;max-width:360px">
        <div class="editor-field">
          <label>Choose image file</label>
          <input type="file" accept="image/*" id="editor-modal-file" style="padding:0.4rem" />
        </div>
        <button type="button" class="ac-btn btn-sm" id="editor-modal-upload-btn">Upload Image</button>
      </div>`;

    document.getElementById('editor-modal-upload-btn')?.addEventListener('click', async () => {
      const file = document.getElementById('editor-modal-file')?.files?.[0];
      if (!file) return;
      if (!mediaPickerContext) return;
      await uploadFile(file, mediaPickerContext.path, mediaPickerContext.sectionKey);
      closeMediaModal();
    });
  }
}

// ── Pane / Section Rendering ──

function renderPalette() {
  const palette = document.getElementById('editor-palette');
  const sectionButtons = SECTION_REGISTRY.map((s) => `
    <button class="editor-palette-item" data-section-key="${s.key}">
      ${escapeHtml(s.label)}
      <small>${escapeHtml(s.description)}</small>
    </button>`).join('');

  const pageButtons = editorState.pages.map((p) => `
    <button class="editor-palette-item" data-page-id="${escapeHtml(p.id)}">
      ${escapeHtml(p.title || 'Untitled')}
      <small>${escapeHtml(p.slug)} ${p.published ? '' : '(draft)'}</small>
    </button>`).join('');

  palette.innerHTML = `
    ${sectionButtons}
    <div class="editor-palette-divider">Pages</div>
    ${pageButtons}
    <button class="editor-palette-item editor-palette-add" data-new-page>
      <i class="bi bi-plus-circle"></i> New Page
    </button>`;

  palette.querySelectorAll('[data-section-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editorState.activePage = null;
      loadSection(btn.dataset.sectionKey);
    });
  });

  palette.querySelectorAll('[data-page-id]').forEach((btn) => {
    btn.addEventListener('click', () => loadPage(btn.dataset.pageId));
  });

  palette.querySelector('[data-new-page]')?.addEventListener('click', () => loadNewPage());
}

function loadSection(key) {
  editorState.activeSection = key;

  document.querySelectorAll('[data-section-key]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.sectionKey === key);
  });

  const section = SECTION_REGISTRY.find((s) => s.key === key);
  if (!section) return;

  const effective = getEffective(key);
  const pane = document.getElementById('editor-pane');

  pane.innerHTML = `
    <header class="editor-pane-head">
      <h2>${escapeHtml(section.label)}</h2>
      <div class="editor-pane-actions">
        <span class="editor-dirty-note" ${editorState.dirty[key] ? '' : 'hidden'}>• unsaved changes</span>
        <button class="ac-btn" type="button" data-editor-save>Save ${escapeHtml(section.label)}</button>
      </div>
    </header>
    <div class="editor-two-col">
      <div class="editor-preview-col">
        <p class="editor-preview-label">Live Preview</p>
        ${section.renderPreview(effective)}
      </div>
      <div class="editor-fields-col">
        ${section.renderFields(effective)}
      </div>
    </div>`;

  section.bindFields(pane);
  bindDropZones(pane, key);
  bindSaveButton(pane, key);
  updateDirtyIndicator(key);
}

function bindSaveButton(root, key) {
  const btn = root.querySelector('[data-editor-save]');
  if (!btn) return;
  btn.addEventListener('click', () => saveSection(key));
}

async function saveSection(key) {
  const section = SECTION_REGISTRY.find((s) => s.key === key);
  if (!section) return;

  const saveBtn = document.querySelector('[data-editor-save]');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
  }

  try {
    const payload = section.buildPayload();
    const updated = await api(section.endpoint, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    editorState[section.dataKey] = updated || payload;

    if (key === 'products') {
      editorState.drafts.products = { items: {}, added: [], removed: {}, activeId: null };
    } else {
      editorState.drafts[key] = {};
    }

    clearDirty(key);

    const [site, about, products, media] = await Promise.all([
      api('/api/admin/blocks/site'),
      api('/api/admin/blocks/about'),
      api('/api/admin/blocks/products'),
      api('/api/admin/media')
    ]);
    editorState.site = site;
    editorState.about = about;
    editorState.products = products;
    editorState.mediaLibrary = Array.isArray(media?.items) ? media.items : (Array.isArray(media) ? media : []);

    showBanner('success', `${section.label} saved.`);
    loadSection(key);
  } catch (err) {
    showBanner('danger', err.message || 'Save failed.');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = `Save ${section.label}`;
    }
  }
}

// ── Block Type Definitions (imported from admin/block-picker.js) ──

function renderBlockFields(block) {
  const d = block.data || {};
  const bid = block.id;
  switch (block.type) {
    case 'hero':
      return `
        <div class="editor-field"><label>Heading</label><input data-block-field="heading" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.heading || '')}" /></div>
        <div class="editor-field"><label>Subheading</label><textarea data-block-field="subheading" data-block-id="${escapeHtml(bid)}" rows="3">${escapeHtml(d.subheading || '')}</textarea></div>
        <div class="editor-field"><label>Background image</label>${renderDropZone({ path: `block.${bid}.image`, value: d.image })}</div>
        <div class="editor-field"><label>Image alt text</label><input data-block-field="imageAlt" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.imageAlt || '')}" /></div>
        <div class="editor-field"><label>Button text</label><input data-block-field="buttonText" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.buttonText || '')}" /></div>
        <div class="editor-field"><label>Button link</label><input data-block-field="buttonHref" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.buttonHref || '')}" /></div>`;
    case 'text':
      return `
        <div class="editor-field"><label>Heading (optional)</label><input data-block-field="heading" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.heading || '')}" /></div>
        <div class="editor-field"><label>Body text</label><textarea data-block-field="body" data-block-id="${escapeHtml(bid)}" rows="8">${escapeHtml(d.body || '')}</textarea><span class="editor-helper">Separate paragraphs with a blank line.</span></div>`;
    case 'image':
      return `
        <div class="editor-field"><label>Image</label>${renderDropZone({ path: `block.${bid}.src`, value: d.src })}</div>
        <div class="editor-field"><label>Alt text</label><input data-block-field="alt" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.alt || '')}" /></div>
        <div class="editor-field"><label>Caption</label><input data-block-field="caption" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.caption || '')}" /></div>
        <div class="editor-field"><label>Link (optional)</label><input data-block-field="href" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.href || '')}" /></div>`;
    case 'gallery':
      return `
        <div class="editor-field"><label>Images</label><span class="editor-helper">Add images to the gallery.</span></div>
        <div id="gallery-items-${bid}">${(d.images || []).map((img, i) => `
          <div class="editor-accordion" style="margin-bottom:0.5rem" data-gallery-item="${i}">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0">
              <strong style="font-size:0.85rem">Image ${i + 1}</strong>
              <button type="button" class="btn-outline btn-sm" data-remove-gallery="${i}" style="font-size:0.75rem">Remove</button>
            </div>
            <div class="editor-field"><label>Image</label>${renderDropZone({ path: `block.${bid}.gallery.${i}`, value: img.src })}</div>
            <div class="editor-field"><label>Alt</label><input data-gallery-field="alt" data-gallery-idx="${i}" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(img.alt || '')}" /></div>
            <div class="editor-field"><label>Caption</label><input data-gallery-field="caption" data-gallery-idx="${i}" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(img.caption || '')}" /></div>
          </div>`).join('')}</div>
        <button type="button" class="btn-outline btn-sm" data-add-gallery="${escapeHtml(bid)}">+ Add Image</button>`;
    case 'cards':
      return `
        <div class="editor-field"><label>Cards</label><span class="editor-helper">Add cards to the grid.</span></div>
        <div id="card-items-${bid}">${(d.cards || []).map((card, i) => `
          <div class="editor-accordion" style="margin-bottom:0.5rem" data-card-item="${i}">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0">
              <strong style="font-size:0.85rem">Card ${i + 1}</strong>
              <button type="button" class="btn-outline btn-sm" data-remove-card="${i}" style="font-size:0.75rem">Remove</button>
            </div>
            <div class="editor-field"><label>Image</label>${renderDropZone({ path: `block.${bid}.card.${i}`, value: card.image })}</div>
            <div class="editor-field"><label>Title</label><input data-card-field="title" data-card-idx="${i}" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(card.title || '')}" /></div>
            <div class="editor-field"><label>Description</label><textarea data-card-field="description" data-card-idx="${i}" data-block-id="${escapeHtml(bid)}" rows="2">${escapeHtml(card.description || '')}</textarea></div>
            <div class="editor-field"><label>Link</label><input data-card-field="href" data-card-idx="${i}" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(card.href || '')}" /></div>
          </div>`).join('')}</div>
        <button type="button" class="btn-outline btn-sm" data-add-card="${escapeHtml(bid)}">+ Add Card</button>`;
    case 'cta':
      return `
        <div class="editor-field"><label>Heading</label><input data-block-field="heading" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.heading || '')}" /></div>
        <div class="editor-field"><label>Description</label><textarea data-block-field="description" data-block-id="${escapeHtml(bid)}" rows="3">${escapeHtml(d.description || '')}</textarea></div>
        <div class="editor-field"><label>Button text</label><input data-block-field="buttonText" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.buttonText || '')}" /></div>
        <div class="editor-field"><label>Button link</label><input data-block-field="buttonHref" data-block-id="${escapeHtml(bid)}" value="${escapeHtml(d.buttonHref || '')}" /></div>`;
    case 'divider':
      return `
        <div class="editor-field"><label>Spacing size</label>
          <select data-block-field="size" data-block-id="${escapeHtml(bid)}">
            <option value="small" ${d.size === 'small' ? 'selected' : ''}>Small</option>
            <option value="medium" ${d.size === 'medium' || !d.size ? 'selected' : ''}>Medium</option>
            <option value="large" ${d.size === 'large' ? 'selected' : ''}>Large</option>
          </select>
        </div>`;
    default:
      return '<p class="editor-helper">Unknown block type.</p>';
  }
}

// ── Page Editor ──

const AUTOSAVE_STORAGE_PREFIX = 'ac-editor-draft:';

let pageCanvas = null;
let pageHistory = null;
let pageAutosave = null;
let pageSortable = null;
let outlineSortable = null;
let unbindUndoHotkeys = null;
let pageStatusTimer = null;
let latestAutosaveStatus = { state: 'idle' };
let metaPanelOpen = false;

function getBlockTypeDef(type) {
  return BLOCK_TYPES.find((t) => t.type === type) || null;
}

function renderBlockLabel(block) {
  const def = getBlockTypeDef(block.type);
  return def?.label || block.type;
}

function cleanupPageEditor() {
  if (pageAutosave) { pageAutosave.flush?.().catch(() => {}); pageAutosave = null; }
  if (pageSortable) { pageSortable.destroy?.(); pageSortable = null; }
  if (outlineSortable) { outlineSortable.destroy?.(); outlineSortable = null; }
  if (unbindUndoHotkeys) { unbindUndoHotkeys(); unbindUndoHotkeys = null; }
  pageCanvas = null;
  pageHistory = null;
  latestAutosaveStatus = { state: 'idle' };
  metaPanelOpen = false;
}

function loadPage(pageId) {
  const page = editorState.pages.find((p) => p.id === pageId);
  if (!page) return;
  cleanupPageEditor();
  editorState.activePage = structuredClone(page);
  editorState.pageBlocks = structuredClone(page.blocks || []);
  editorState.pageDirty = false;
  editorState.activeBlockId = null;
  editorState.activeSection = 'page:' + pageId;
  renderPageEditor();
}

function loadNewPage() {
  cleanupPageEditor();
  editorState.activePage = { id: null, slug: '/', title: '', description: '', blocks: [], published: false, showInNav: false, navOrder: 99, updatedAt: null };
  editorState.pageBlocks = [];
  editorState.pageDirty = true;
  editorState.activeBlockId = null;
  editorState.activeSection = 'page:new';
  renderPageEditor();
}

function buildPagePayload() {
  const page = editorState.activePage;
  if (!page) return null;
  if (!page.id && !(page.title && page.slug)) return null;
  return {
    slug: page.slug,
    title: page.title,
    description: page.description || '',
    blocks: editorState.pageBlocks,
    published: !!page.published,
    showInNav: !!page.showInNav,
    navOrder: page.navOrder ?? 99
  };
}

async function savePagePayload(payload, { ifMatch } = {}) {
  const page = editorState.activePage;
  if (!page) throw new Error('No active page.');
  const headers = ifMatch ? { 'If-Match': ifMatch } : {};

  if (page.id) {
    const result = await api(`/api/admin/pages/${page.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers
    }).catch((err) => {
      if (err && /updated elsewhere/i.test(err.message)) {
        const e = new Error(err.message);
        e.code = 'stale_version';
        throw e;
      }
      throw err;
    });
    return { updatedAt: result?.updatedAt || null };
  }

  const result = await api('/api/admin/pages', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  page.id = result.id;
  editorState.activeSection = 'page:' + result.id;
  await reloadPages();
  renderPalette();
  return { updatedAt: result?.updatedAt || null };
}

function getPageUpdatedAt() {
  return editorState.activePage?.updatedAt || null;
}

function setPageUpdatedAt(value) {
  if (editorState.activePage) editorState.activePage.updatedAt = value;
  const remote = editorState.pages.find((p) => p.id === editorState.activePage?.id);
  if (remote) remote.updatedAt = value;
}

function pageStorageKey() {
  return editorState.activePage?.id ? `${AUTOSAVE_STORAGE_PREFIX}${editorState.activePage.id}` : null;
}

function formatStatusPill(status) {
  if (!status) return { text: STRINGS.status.savedNow, cls: 'is-idle' };
  switch (status.state) {
    case 'saving':
      return { text: STRINGS.status.saving, cls: 'is-saving' };
    case 'pending':
      return { text: STRINGS.status.unsaved, cls: 'is-dirty' };
    case 'saved': {
      const savedAt = status.savedAt || Date.now();
      const secs = (Date.now() - savedAt) / 1000;
      return { text: STRINGS.status.savedAgo(secs), cls: 'is-saved' };
    }
    case 'conflict':
      return { text: STRINGS.status.conflict, cls: 'is-error' };
    case 'error':
      return { text: STRINGS.status.error(status.error?.message), cls: 'is-error' };
    default:
      return { text: '', cls: 'is-idle' };
  }
}

function updateStatusPill() {
  const pill = document.getElementById('editor-status-pill');
  if (!pill) return;
  const { text, cls } = formatStatusPill(latestAutosaveStatus);
  pill.className = `editor-status-pill ${cls}`;
  pill.textContent = text;
  pill.hidden = !text;
}

function scheduleStatusRefresh() {
  if (pageStatusTimer) clearInterval(pageStatusTimer);
  pageStatusTimer = setInterval(updateStatusPill, 15000);
}

function updateUndoButtons() {
  if (!pageHistory) return;
  const snap = pageHistory.snapshot();
  const undoBtn = document.querySelector('[data-history-undo]');
  const redoBtn = document.querySelector('[data-history-redo]');
  if (undoBtn) undoBtn.disabled = !snap.canUndo;
  if (redoBtn) redoBtn.disabled = !snap.canRedo;
}

function markPageMutated({ blockId } = {}) {
  editorState.pageDirty = true;
  if (blockId) editorState.activeBlockId = blockId;
  if (pageAutosave) pageAutosave.schedule();
  refreshOutline();
  renderSidePanel();
}

function applyChange(description, mutator) {
  const before = {
    blocks: structuredClone(editorState.pageBlocks),
    activeId: editorState.activeBlockId
  };
  const returned = mutator();
  const after = {
    blocks: structuredClone(editorState.pageBlocks),
    activeId: editorState.activeBlockId
  };
  if (pageHistory) {
    pageHistory.push(description, {
      undo: () => {
        editorState.pageBlocks = structuredClone(before.blocks);
        editorState.activeBlockId = before.activeId;
        fullCanvasRefresh();
        markPageMutated();
        showBanner('info', STRINGS.status.undo(description));
      },
      redo: () => {
        editorState.pageBlocks = structuredClone(after.blocks);
        editorState.activeBlockId = after.activeId;
        fullCanvasRefresh();
        markPageMutated();
        showBanner('info', STRINGS.status.redo(description));
      }
    });
    updateUndoButtons();
  }
  return returned;
}

function fullCanvasRefresh() {
  if (pageCanvas) {
    pageCanvas.setBlocks(editorState.pageBlocks, { activeId: editorState.activeBlockId });
  }
}

function refreshOutline() {
  const list = document.getElementById('editor-outline-list');
  if (!list) return;
  list.innerHTML = editorState.pageBlocks.map((b, i) => renderOutlineItem(b, i)).join('') ||
    `<p class="editor-outline-empty">${escapeHtml(STRINGS.blocks.emptyCanvas)}</p>`;
  bindOutlineItems(list);
}

function renderOutlineItem(block, i) {
  const def = getBlockTypeDef(block.type);
  const icon = def?.icon || 'bi-square';
  const label = escapeHtml(def?.label || block.type);
  const summary = escapeHtml(String(block.data?.heading || block.data?.title || block.data?.caption || '').slice(0, 60));
  const active = block.id === editorState.activeBlockId ? 'is-active' : '';
  return `
    <div class="editor-outline-item ${active}" data-outline-id="${escapeHtml(block.id)}" tabindex="0" role="button" aria-label="${label} — section ${i + 1}">
      <span class="editor-outline-handle" data-outline-handle title="Drag to reorder"><i class="bi bi-grip-vertical"></i></span>
      <span class="editor-outline-icon"><i class="bi ${escapeHtml(icon)}"></i></span>
      <span class="editor-outline-body">
        <span class="editor-outline-label">${label}</span>
        ${summary ? `<span class="editor-outline-summary">${summary}</span>` : ''}
      </span>
      <span class="editor-outline-actions">
        <button type="button" class="editor-outline-btn" data-outline-duplicate="${escapeHtml(block.id)}" title="Duplicate"><i class="bi bi-files"></i></button>
        <button type="button" class="editor-outline-btn" data-outline-delete="${escapeHtml(block.id)}" title="Remove"><i class="bi bi-trash"></i></button>
      </span>
    </div>`;
}

function bindOutlineItems(list) {
  list.querySelectorAll('[data-outline-id]').forEach((el) => {
    el.addEventListener('click', (event) => {
      if (event.target.closest('.editor-outline-btn') || event.target.closest('.editor-outline-handle')) return;
      selectBlock(el.dataset.outlineId);
    });
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectBlock(el.dataset.outlineId);
      }
    });
  });
  list.querySelectorAll('[data-outline-duplicate]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      duplicateBlock(btn.dataset.outlineDuplicate);
    });
  });
  list.querySelectorAll('[data-outline-delete]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteBlock(btn.dataset.outlineDelete);
    });
  });

  if (outlineSortable) outlineSortable.destroy();
  outlineSortable = new Sortable(list, {
    handle: '[data-outline-handle]',
    animation: 150,
    ghostClass: 'editor-outline-ghost',
    onEnd: () => {
      const newOrder = Array.from(list.querySelectorAll('[data-outline-id]')).map((el) => el.dataset.outlineId);
      reorderBlocks(newOrder, 'Moved section');
    }
  });
}

function selectBlock(id) {
  editorState.activeBlockId = id;
  if (pageCanvas) pageCanvas.setActive(id);
  refreshOutline();
  renderSidePanel();
}

function addBlockBelow(anchorId, typeDef) {
  if (!typeDef) return;
  applyChange(`Added ${typeDef.label}`, () => {
    const block = { id: crypto.randomUUID(), type: typeDef.type, data: structuredClone(typeDef.defaults) };
    if (!anchorId) {
      editorState.pageBlocks.push(block);
    } else {
      const idx = editorState.pageBlocks.findIndex((b) => b.id === anchorId);
      editorState.pageBlocks.splice(idx + 1, 0, block);
    }
    editorState.activeBlockId = block.id;
    fullCanvasRefresh();
  });
  markPageMutated();
}

function duplicateBlock(id) {
  const idx = editorState.pageBlocks.findIndex((b) => b.id === id);
  if (idx < 0) return;
  const source = editorState.pageBlocks[idx];
  applyChange(`Duplicated ${renderBlockLabel(source)}`, () => {
    const copy = { id: crypto.randomUUID(), type: source.type, data: structuredClone(source.data) };
    editorState.pageBlocks.splice(idx + 1, 0, copy);
    editorState.activeBlockId = copy.id;
    fullCanvasRefresh();
  });
  markPageMutated();
}

function deleteBlock(id) {
  const idx = editorState.pageBlocks.findIndex((b) => b.id === id);
  if (idx < 0) return;
  const block = editorState.pageBlocks[idx];
  applyChange(`Removed ${renderBlockLabel(block)}`, () => {
    editorState.pageBlocks.splice(idx, 1);
    if (editorState.activeBlockId === id) editorState.activeBlockId = null;
    fullCanvasRefresh();
  });
  markPageMutated();
}

function reorderBlocks(orderedIds, description) {
  const map = new Map(editorState.pageBlocks.map((b) => [b.id, b]));
  applyChange(description || 'Reordered sections', () => {
    editorState.pageBlocks = orderedIds.map((id) => map.get(id)).filter(Boolean);
    fullCanvasRefresh();
  });
  markPageMutated();
}

function updateBlockField(blockId, field, value) {
  const block = editorState.pageBlocks.find((b) => b.id === blockId);
  if (!block) return;
  const parts = field.split('.');
  if (parts.length === 1) {
    block.data[field] = value;
  } else {
    deepSet(block.data, field, value);
  }
  if (pageCanvas) pageCanvas.updateBlockData(block.id, block.data);
  editorState.pageDirty = true;
  if (pageAutosave) pageAutosave.schedule();
  refreshOutline();
}

function renderPageEditor() {
  const page = editorState.activePage;
  if (!page) return;

  document.querySelectorAll('[data-section-key]').forEach((b) => b.classList.remove('is-active'));
  const pageBtn = document.querySelector(`[data-page-id="${page.id}"]`);
  if (pageBtn) pageBtn.classList.add('is-active');

  const pane = document.getElementById('editor-pane');
  const isNew = !page.id;

  pane.innerHTML = `
    <header class="editor-pane-head editor-page-head">
      <div class="editor-page-title-block">
        <input class="editor-page-title-input" type="text" data-page-title value="${escapeHtml(page.title || '')}" placeholder="${escapeHtml(STRINGS.page.titlePlaceholder)}" aria-label="${escapeHtml(STRINGS.page.titleLabel)}" />
        <span class="editor-status-pill is-idle" id="editor-status-pill" hidden></span>
      </div>
      <div class="editor-pane-actions">
        <button class="btn-outline btn-sm" type="button" data-history-undo title="Undo (Cmd-Z)" disabled><i class="bi bi-arrow-counterclockwise"></i><span class="sr-only">Undo</span></button>
        <button class="btn-outline btn-sm" type="button" data-history-redo title="Redo (Cmd-Shift-Z)" disabled><i class="bi bi-arrow-clockwise"></i><span class="sr-only">Redo</span></button>
        ${!isNew ? `<a class="btn-outline btn-sm" href="${escapeHtml(page.slug)}" target="_blank" rel="noopener">${escapeHtml(page.published ? STRINGS.page.viewLive : STRINGS.page.viewDraft)}</a>` : ''}
        ${!isNew ? `<button class="btn-outline btn-sm" type="button" data-delete-page="${escapeHtml(page.id)}" style="color:#c23616">${escapeHtml(STRINGS.page.deletePage)}</button>` : ''}
      </div>
    </header>

    <div class="editor-page-shell">
      <aside class="editor-outline" aria-label="Section outline">
        <div class="editor-outline-head">
          <strong>Sections</strong>
          <button type="button" class="btn-outline btn-sm" data-add-section>+ ${escapeHtml(STRINGS.blocks.addSection)}</button>
        </div>
        <div class="editor-outline-list" id="editor-outline-list" role="list"></div>
        <p class="editor-outline-hint">${escapeHtml(STRINGS.blocks.selectHint)}</p>
      </aside>

      <section class="editor-canvas-wrap">
        <div id="editor-canvas-root"></div>
        <div class="editor-canvas-footer">
          <button type="button" class="ac-btn editor-add-section-cta" data-add-section-bottom>+ ${escapeHtml(STRINGS.blocks.addSection)}</button>
        </div>
      </section>

      <aside class="editor-side-panel" id="editor-side-panel"></aside>
    </div>

    <details class="editor-page-meta" id="editor-page-meta" ${metaPanelOpen ? 'open' : ''}>
      <summary>${escapeHtml(STRINGS.page.moreOptionsLabel)}</summary>
      <div class="editor-page-meta-body"></div>
    </details>`;

  const canvasRoot = pane.querySelector('#editor-canvas-root');
  pageCanvas = createEditorCanvas({
    root: canvasRoot,
    onSelect: (id) => { editorState.activeBlockId = id; refreshOutline(); renderSidePanel(); },
    onEdit: ({ blockId, field, value }) => { updateBlockField(blockId, field, value); },
    onRequestImage: (id) => {
      const block = editorState.pageBlocks.find((b) => b.id === id);
      if (!block) return;
      const path = block.type === 'hero' ? `block.${id}.image` : `block.${id}.src`;
      openMediaModal(path, 'page-blocks');
    },
    onAddBelow: (id) => openSectionPickerAt(document.querySelector(`[data-block-wrap="${id}"]`) || canvasRoot, id)
  });
  pageCanvas.setBlocks(editorState.pageBlocks, { activeId: editorState.activeBlockId });

  pageHistory = createHistory();
  unbindUndoHotkeys = bindUndoHotkeys(pageHistory);
  pageHistory.subscribe(updateUndoButtons);

  pageAutosave = createAutosave({
    save: savePagePayload,
    buildPayload: buildPagePayload,
    getKey: pageStorageKey,
    getUpdatedAt: getPageUpdatedAt,
    setUpdatedAt: setPageUpdatedAt,
    onStatus: (status) => { latestAutosaveStatus = status; updateStatusPill(); }
  });
  scheduleStatusRefresh();
  updateStatusPill();

  refreshOutline();
  renderSidePanel();
  renderPageMeta();
  bindPageEditorHeader(pane);
}

function renderPageMeta() {
  const body = document.querySelector('#editor-page-meta .editor-page-meta-body');
  if (!body) return;
  const page = editorState.activePage;
  if (!page) return;

  body.innerHTML = `
    <div class="editor-field-group">
      <div class="editor-field">
        <label>${escapeHtml(STRINGS.page.slugLabel)}</label>
        <input data-page-setting="slug" value="${escapeHtml(page.slug || '/')}" placeholder="${escapeHtml(STRINGS.page.slugPlaceholder)}" />
        <span class="editor-helper">${escapeHtml(STRINGS.page.slugHelper)}</span>
      </div>
      <div class="editor-field">
        <label>${escapeHtml(STRINGS.page.descriptionLabel)}</label>
        <textarea data-page-setting="description" rows="3" placeholder="${escapeHtml(STRINGS.page.descriptionPlaceholder)}">${escapeHtml(page.description || '')}</textarea>
        <span class="editor-helper">${escapeHtml(STRINGS.page.descriptionHelper)}</span>
      </div>
      <div class="editor-field">
        <label>${escapeHtml(STRINGS.page.publishedLabel)}</label>
        <div class="editor-toggle-row">
          <label class="editor-toggle-option ${page.published ? 'is-active' : ''}">
            <input type="radio" name="page-published" value="true" ${page.published ? 'checked' : ''} data-page-setting="published" />
            <strong>${escapeHtml(STRINGS.page.publishedOnTitle)}</strong>
            <small>${escapeHtml(STRINGS.page.publishedOnNote)}</small>
          </label>
          <label class="editor-toggle-option ${!page.published ? 'is-active' : ''}">
            <input type="radio" name="page-published" value="false" ${!page.published ? 'checked' : ''} data-page-setting="published" />
            <strong>${escapeHtml(STRINGS.page.publishedOffTitle)}</strong>
            <small>${escapeHtml(STRINGS.page.publishedOffNote)}</small>
          </label>
        </div>
      </div>
      <div class="editor-field">
        <label>${escapeHtml(STRINGS.page.showInNavLabel)}</label>
        <select data-page-setting="showInNav">
          <option value="true" ${page.showInNav ? 'selected' : ''}>${escapeHtml(STRINGS.page.showInNavYes)}</option>
          <option value="false" ${!page.showInNav ? 'selected' : ''}>${escapeHtml(STRINGS.page.showInNavNo)}</option>
        </select>
      </div>
      <div class="editor-field">
        <label>${escapeHtml(STRINGS.page.navOrderLabel)}</label>
        <input data-page-setting="navOrder" type="number" min="0" max="999" value="${page.navOrder ?? 99}" />
        <span class="editor-helper">${escapeHtml(STRINGS.page.navOrderHelper)}</span>
      </div>
    </div>`;

  body.querySelectorAll('[data-page-setting]').forEach((el) => {
    const handler = el.tagName === 'SELECT' ? 'change' : (el.type === 'radio' ? 'change' : 'input');
    el.addEventListener(handler, () => {
      const field = el.dataset.pageSetting;
      let value = el.value;
      if (field === 'published' || field === 'showInNav') value = value === 'true';
      if (field === 'navOrder') value = Number(value) || 0;
      editorState.activePage[field] = value;
      editorState.pageDirty = true;
      if (field === 'published') renderPageMeta();
      if (pageAutosave) pageAutosave.schedule();
    });
  });

  const details = document.getElementById('editor-page-meta');
  if (details) {
    details.addEventListener('toggle', () => { metaPanelOpen = details.open; }, { once: true });
  }
}

function renderSidePanel() {
  const panel = document.getElementById('editor-side-panel');
  if (!panel) return;
  const block = editorState.pageBlocks.find((b) => b.id === editorState.activeBlockId);
  if (!block) {
    panel.innerHTML = `
      <div class="editor-side-empty">
        <p><strong>No section selected.</strong></p>
        <p>${escapeHtml(STRINGS.blocks.selectHint)}</p>
      </div>`;
    return;
  }
  const typeDef = getBlockTypeDef(block.type);
  panel.innerHTML = `
    <header class="editor-side-head">
      <strong><i class="bi ${typeDef?.icon || 'bi-square'}"></i> ${escapeHtml(typeDef?.label || block.type)}</strong>
      <div class="editor-side-actions">
        <button type="button" class="editor-side-btn" data-side-duplicate="${escapeHtml(block.id)}" title="Duplicate"><i class="bi bi-files"></i></button>
        <button type="button" class="editor-side-btn" data-side-delete="${escapeHtml(block.id)}" title="Remove"><i class="bi bi-trash"></i></button>
      </div>
    </header>
    <div class="editor-side-body">
      ${renderBlockFields(block)}
    </div>`;

  bindSideFieldEvents(panel);
}

function bindSideFieldEvents(panel) {
  panel.querySelector('[data-side-duplicate]')?.addEventListener('click', (event) => {
    duplicateBlock(event.currentTarget.dataset.sideDuplicate);
  });
  panel.querySelector('[data-side-delete]')?.addEventListener('click', (event) => {
    deleteBlock(event.currentTarget.dataset.sideDelete);
  });

  panel.querySelectorAll('[data-block-field]').forEach((el) => {
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      updateBlockField(el.dataset.blockId, el.dataset.blockField, el.value);
    });
  });

  panel.querySelectorAll('[data-gallery-field]').forEach((el) => {
    el.addEventListener('input', () => {
      const bid = el.dataset.blockId;
      const idx = Number(el.dataset.galleryIdx);
      const field = el.dataset.galleryField;
      const block = editorState.pageBlocks.find((b) => b.id === bid);
      if (!block?.data?.images?.[idx]) return;
      block.data.images[idx][field] = el.value;
      if (pageCanvas) pageCanvas.updateBlockData(bid, block.data);
      editorState.pageDirty = true;
      if (pageAutosave) pageAutosave.schedule();
    });
  });

  panel.querySelectorAll('[data-add-gallery]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bid = btn.dataset.addGallery;
      const block = editorState.pageBlocks.find((b) => b.id === bid);
      if (!block) return;
      applyChange('Added gallery image', () => {
        if (!block.data.images) block.data.images = [];
        block.data.images.push({ src: '', alt: '', caption: '' });
        fullCanvasRefresh();
      });
      markPageMutated({ blockId: bid });
    });
  });

  panel.querySelectorAll('[data-remove-gallery]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.removeGallery);
      const block = editorState.pageBlocks.find((b) => b.id === editorState.activeBlockId);
      if (!block?.data?.images) return;
      applyChange('Removed gallery image', () => {
        block.data.images.splice(idx, 1);
        fullCanvasRefresh();
      });
      markPageMutated({ blockId: block.id });
    });
  });

  panel.querySelectorAll('[data-card-field]').forEach((el) => {
    el.addEventListener('input', () => {
      const bid = el.dataset.blockId;
      const idx = Number(el.dataset.cardIdx);
      const field = el.dataset.cardField;
      const block = editorState.pageBlocks.find((b) => b.id === bid);
      if (!block?.data?.cards?.[idx]) return;
      block.data.cards[idx][field] = el.value;
      if (pageCanvas) pageCanvas.updateBlockData(bid, block.data);
      editorState.pageDirty = true;
      if (pageAutosave) pageAutosave.schedule();
    });
  });

  panel.querySelectorAll('[data-add-card]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bid = btn.dataset.addCard;
      const block = editorState.pageBlocks.find((b) => b.id === bid);
      if (!block) return;
      applyChange('Added card', () => {
        if (!block.data.cards) block.data.cards = [];
        block.data.cards.push({ image: '', title: '', description: '', href: '' });
        fullCanvasRefresh();
      });
      markPageMutated({ blockId: bid });
    });
  });

  panel.querySelectorAll('[data-remove-card]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.removeCard);
      const block = editorState.pageBlocks.find((b) => b.id === editorState.activeBlockId);
      if (!block?.data?.cards) return;
      applyChange('Removed card', () => {
        block.data.cards.splice(idx, 1);
        fullCanvasRefresh();
      });
      markPageMutated({ blockId: block.id });
    });
  });

  bindDropZones(panel, 'page-blocks');
}

function openSectionPickerAt(anchor, anchorId) {
  openBlockPicker({
    anchor,
    onPick: (block) => {
      addBlockBelow(anchorId, getBlockTypeDef(block.type));
    }
  });
}

function bindPageEditorHeader(pane) {
  const titleInput = pane.querySelector('[data-page-title]');
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      editorState.activePage.title = titleInput.value;
      editorState.pageDirty = true;
      if (pageAutosave) pageAutosave.schedule();
    });
  }

  pane.querySelector('[data-history-undo]')?.addEventListener('click', () => pageHistory?.undo());
  pane.querySelector('[data-history-redo]')?.addEventListener('click', () => pageHistory?.redo());

  pane.querySelector('[data-add-section]')?.addEventListener('click', (event) => {
    openSectionPickerAt(event.currentTarget, null);
  });
  pane.querySelector('[data-add-section-bottom]')?.addEventListener('click', (event) => {
    openSectionPickerAt(event.currentTarget, null);
  });

  pane.querySelector('[data-delete-page]')?.addEventListener('click', async (event) => {
    const id = event.currentTarget.dataset.deletePage;
    if (!id) return;
    const confirmed = confirm('Delete this page permanently? This cannot be undone.');
    if (!confirmed) return;
    try {
      await api(`/api/admin/pages/${id}`, { method: 'DELETE' });
      showBanner('success', 'Page deleted.');
      cleanupPageEditor();
      editorState.activePage = null;
      editorState.pageBlocks = [];
      editorState.pageDirty = false;
      await reloadPages();
      renderPalette();
      loadSection('hero');
    } catch (err) {
      showBanner('danger', err.message || 'Delete failed.');
    }
  });
}

function handleBlockImageApply(path, url) {
  const parts = path.split('.');
  if (parts[0] !== 'block') return false;
  const bid = parts[1];
  const block = editorState.pageBlocks.find((b) => b.id === bid);
  if (!block) return false;

  if (parts[2] === 'gallery' && parts[3] != null) {
    const idx = Number(parts[3]);
    if (!block.data.images?.[idx]) return false;
    applyChange('Updated gallery image', () => {
      block.data.images[idx].src = url;
    });
  } else if (parts[2] === 'card' && parts[3] != null) {
    const idx = Number(parts[3]);
    if (!block.data.cards?.[idx]) return false;
    applyChange('Updated card image', () => {
      block.data.cards[idx].image = url;
    });
  } else {
    const field = parts[2];
    applyChange('Updated image', () => {
      block.data[field] = url;
    });
  }
  if (pageCanvas) pageCanvas.updateBlockData(bid, block.data);
  editorState.pageDirty = true;
  if (pageAutosave) pageAutosave.schedule();
  renderSidePanel();
  refreshOutline();
  return true;
}

async function reloadPages() {
  try {
    const result = await api('/api/admin/pages');
    editorState.pages = result.items || [];
  } catch {
    editorState.pages = [];
  }
}

// ── Logout ──

function setupLogout() {
  document.getElementById('editor-logout')?.addEventListener('click', async () => {
    try {
      await api('/api/admin/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    window.location.replace('/admin/login/');
  });
}

// ── Before Unload ──

function setupBeforeUnload() {
  window.addEventListener('beforeunload', (e) => {
    if (Object.values(editorState.dirty).some(Boolean)) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

// ── Bootstrap ──

async function bootstrap() {
  try {
    const session = await api('/api/admin/session');
    if (!session.authenticated) {
      window.location.replace('/admin/login/');
      return;
    }

    const emailEl = document.getElementById('editor-email');
    if (emailEl) emailEl.textContent = session.email || '';

    const [site, about, products, media, pagesResult] = await Promise.all([
      api('/api/admin/blocks/site'),
      api('/api/admin/blocks/about'),
      api('/api/admin/blocks/products'),
      api('/api/admin/media'),
      api('/api/admin/pages').catch(() => ({ items: [] }))
    ]);

    editorState.site = site;
    editorState.about = about;
    editorState.products = products;
    editorState.mediaLibrary = Array.isArray(media?.items) ? media.items : (Array.isArray(media) ? media : []);
    editorState.pages = pagesResult.items || [];

    renderPalette();
    loadSection('hero');
    setupLogout();
    setupBeforeUnload();

    document.getElementById('editor-modal-close')?.addEventListener('click', closeMediaModal);
    document.querySelectorAll('.editor-modal-tab').forEach((tab) => {
      tab.addEventListener('click', () => renderMediaTab(tab.dataset.modalTab));
    });
    document.getElementById('editor-media-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'editor-media-modal') closeMediaModal();
    });
  } catch (err) {
    console.error(err);
    document.getElementById('editor-pane').innerHTML =
      `<div class="alert alert-danger">${escapeHtml(err.message || 'Unable to load editor.')}</div>`;
  }
}

bootstrap();
