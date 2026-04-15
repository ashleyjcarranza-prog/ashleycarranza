import { getProductFallbackImage, getProductImageSource, safeHref } from './core/format.js';
import { assetUrl, withBasePath } from './core/site.js';

const state = {
  session: null,
  authSettings: null,
  links: [],
  products: [],
  speaking: [],
  site: null,
  about: null,
  legal: null,
  analytics: null,
  mediaLibrary: [],
  deleteAction: null,
  editing: null
};

const DEFAULT_PANEL = 'site';
const LINK_GROUP_LABELS = {
  hero_cta: 'Homepage buttons',
  professional: 'About page links',
  social: 'Social links'
};
const SPEAKING_TYPE_LABELS = {
  upcoming_conference: 'Upcoming conference',
  speaking_engagement: 'Speaking engagement',
  past_appearance: 'Past appearance'
};
const PRODUCT_CATEGORY_SUGGESTIONS = ['Academic Writing', 'Creative Works', 'Teaching & Resources'];

const editModalEl = document.getElementById('admin-edit-modal');
const deleteModalEl = document.getElementById('admin-delete-modal');

function createModalController(element) {
  if (!element) {
    return {
      show() {},
      hide() {}
    };
  }

  let backdrop = null;

  function removeBackdrop() {
    backdrop?.remove();
    backdrop = null;
  }

  function show() {
    if (element.classList.contains('show')) return;
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    document.body.append(backdrop);
    document.body.classList.add('modal-open');
    element.style.display = 'block';
    element.removeAttribute('aria-hidden');
    element.setAttribute('aria-modal', 'true');
    element.classList.add('show');
  }

  function hide() {
    element.classList.remove('show');
    element.setAttribute('aria-hidden', 'true');
    element.removeAttribute('aria-modal');
    element.style.display = 'none';
    document.body.classList.remove('modal-open');
    removeBackdrop();
  }

  element.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target === element || target.closest('[data-bs-dismiss="modal"]')) {
      hide();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && element.classList.contains('show')) {
      hide();
    }
  });

  return { show, hide };
}

const editModal = createModalController(editModalEl);
const deleteModal = createModalController(deleteModalEl);

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function linesToArray(value) {
  return String(value || '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function paragraphsToArray(value) {
  return String(value || '')
    .split(/\n\s*\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function arrayToLines(items = []) {
  return (items || []).join('\n');
}

function arrayToParagraphs(items = []) {
  return (items || []).join('\n\n');
}

function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getLinkGroupLabel(value) {
  return LINK_GROUP_LABELS[value] || value;
}

function getSpeakingTypeLabel(value) {
  return SPEAKING_TYPE_LABELS[value] || value;
}

function getRecentItemKindLabel(value) {
  return (
    {
      link: 'link',
      media: 'image',
      speaking: 'event',
      document: 'page content'
    }[value] || value
  );
}

function resolveImagePreview(path, fallback = withBasePath('/assets/img/ashley-portrait.svg')) {
  if (!path) return fallback;
  return assetUrl(path, fallback);
}

function getProductPreview(item) {
  const fallback = withBasePath(getProductFallbackImage(item));
  const image = assetUrl(getProductImageSource(item), fallback);
  return { image, fallback };
}

function getProductStoreLinks(item) {
  const links = [];
  if (item.amazonUrl) links.push({ label: 'Amazon', href: item.amazonUrl });
  if (item.tptUrl) links.push({ label: 'TPT', href: item.tptUrl });
  return links;
}

function renderImageField({ name, label, value, helper = '', placeholder = '' }) {
  return `
    <div class="full" data-media-field>
      <label class="form-label">${label}</label>
      <div class="admin-media-field">
        <input name="${name}" class="form-control" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(placeholder)}" />
        <div class="admin-media-actions">
          <button class="btn-outline btn-sm" type="button" data-media-open="existing">Use Existing</button>
          <button class="btn-outline btn-sm" type="button" data-media-open="upload">Upload New</button>
        </div>
        <div class="admin-media-panel d-none" data-media-panel></div>
      </div>
      ${helper ? `<div class="admin-helper mt-1">${helper}</div>` : ''}
    </div>`;
}

function setActivePanel(target) {
  document.querySelectorAll('.admin-nav-link').forEach((entry) => {
    entry.classList.toggle('is-active', entry.dataset.target === target);
  });
  document.querySelectorAll('.admin-panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.panel === target);
  });
}

function showBanner(type, message) {
  const banner = document.getElementById('admin-banner');
  banner.className = `alert alert-${type}`;
  banner.textContent = message;
  banner.classList.remove('d-none');
  window.clearTimeout(showBanner.timeoutId);
  showBanner.timeoutId = window.setTimeout(() => banner.classList.add('d-none'), 4000);
}

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

function renderBarList(items, emptyMessage) {
  if (!items?.length) return `<p class="admin-helper mb-0">${escapeHtml(emptyMessage)}</p>`;

  const max = Math.max(...items.map((item) => item.count), 1);
  return `
    <div class="admin-bar-list">
      ${items
        .map(
          (item) => `
            <div class="admin-bar-row">
              <div class="admin-bar-header">
                <span>${escapeHtml(item.label)}</span>
                <strong>${item.count}</strong>
              </div>
              <div class="admin-bar-track">
                <div class="admin-bar-fill" style="width:${Math.max((item.count / max) * 100, 6)}%"></div>
              </div>
            </div>`
        )
        .join('')}
    </div>`;
}

function renderSparkbars(items) {
  if (!items?.length) return '<p class="admin-helper mb-0">No changes logged yet.</p>';
  const max = Math.max(...items.map((item) => item.count), 1);
  return `
    <div class="admin-sparkbars">
      ${items
        .map(
          (item) => `<div class="admin-sparkbar" title="${escapeHtml(item.day)}: ${item.count}" style="height:${Math.max(
            (item.count / max) * 100,
            8
          )}%"></div>`
        )
        .join('')}
    </div>`;
}

function renderOverview() {
  const root = document.getElementById('overview-content');
  const analytics = state.analytics;
  if (!analytics) {
    root.innerHTML = '<div class="admin-empty">Unable to load site activity.</div>';
    return;
  }

  root.innerHTML = `
    <div class="admin-grid">
      <div class="admin-metric-grid">
        <div class="admin-metric-card">
          <span class="text-muted-ui small">My Work items</span>
          <strong>${state.products.length}</strong>
        </div>
        <div class="admin-metric-card">
          <span class="text-muted-ui small">Buttons & links</span>
          <strong>${analytics.summary.linkCount}</strong>
        </div>
        <div class="admin-metric-card">
          <span class="text-muted-ui small">Events & appearances</span>
          <strong>${analytics.summary.speakingCount}</strong>
        </div>
        <div class="admin-metric-card">
          <span class="text-muted-ui small">Editable page groups</span>
          <strong>${analytics.summary.documentCount}</strong>
        </div>
        <div class="admin-metric-card">
          <span class="text-muted-ui small">Last update</span>
          <strong class="fs-6">${escapeHtml(formatDate(analytics.summary.lastUpdated))}</strong>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-6">
          <div class="admin-list-card h-100">
            <h3 class="h5 mb-3">Recent Changes</h3>
            <ul>
              ${analytics.recentActivity
                .map(
                  (item) => `
                    <li>
                      <strong>${escapeHtml(item.summary)}</strong><br />
                      <span class="text-muted-ui small">${escapeHtml(item.actorEmail)} &middot; ${escapeHtml(formatDate(item.createdAt))}</span>
                    </li>`
                )
                .join('')}
            </ul>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="admin-list-card h-100">
            <h3 class="h5 mb-3">Recently Updated</h3>
            <ul>
              ${analytics.recentlyUpdatedItems
                .map(
                  (item) => `
                    <li>
                      <strong>${escapeHtml(item.title)}</strong><br />
                      <span class="text-muted-ui small">${escapeHtml(getRecentItemKindLabel(item.kind))} &middot; ${escapeHtml(formatDate(item.updatedAt))}</span>
                    </li>`
                )
                .join('')}
            </ul>
          </div>
        </div>
      </div>

      <details class="admin-disclosure">
        <summary>See detailed activity</summary>
        <div class="admin-disclosure-body">
          <div class="row g-4">
            <div class="col-lg-6">
              <div class="admin-chart-card h-100">
                <h3 class="h5 mb-3">Buttons & Links by Area</h3>
                ${renderBarList(
                  analytics.countsByLinkGroup.map((item) => ({ ...item, label: getLinkGroupLabel(item.label) })),
                  'No managed links yet.'
                )}
              </div>
            </div>
            <div class="col-lg-6">
              <div class="admin-chart-card h-100">
                <h3 class="h5 mb-3">Speaking Items by Type</h3>
                ${renderBarList(
                  analytics.countsBySpeakingType.map((item) => ({ ...item, label: getSpeakingTypeLabel(item.label) })),
                  'No speaking entries yet.'
                )}
              </div>
            </div>
          </div>

          <div class="row g-4 mt-1">
            <div class="col-lg-6">
              <div class="admin-chart-card h-100">
                <h3 class="h5 mb-3">Changes in Last 30 Days</h3>
                ${renderSparkbars(analytics.changeSeries)}
              </div>
            </div>
            <div class="col-lg-6">
              <div class="admin-list-card h-100">
                <h3 class="h5 mb-3">Top Pages</h3>
                ${
                  analytics.trafficTopPages
                    ? `<ul>${analytics.trafficTopPages
                        .map((item) => `<li><strong>${escapeHtml(item.path)}</strong><br /><span class="text-muted-ui small">${item.count} views</span></li>`)
                        .join('')}</ul>`
                    : '<p class="admin-helper mb-0">Traffic detail is not available yet.</p>'
                }
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>`;
}

function renderLinks() {
  const root = document.getElementById('links-content');
  if (!state.links.length) {
    root.innerHTML = '<div class="admin-empty">No links yet. Add one to place a button or link on website.</div>';
    return;
  }

  root.innerHTML = `
    <div class="card-item p-3">
      <p class="admin-helper mb-3">Use this section for homepage buttons, About page links, and social destinations.</p>
      <div class="table-responsive">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Where It Shows</th>
              <th>Link Text</th>
              <th>Destination</th>
              <th>Show on Site</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${state.links
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(getLinkGroupLabel(item.groupName))}</td>
                    <td><strong>${escapeHtml(item.label)}</strong>${item.slotKey ? `<br /><span class="text-muted-ui small">${escapeHtml(item.slotKey)}</span>` : ''}</td>
                    <td><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.href)}</a></td>
                    <td>${item.visible ? 'Yes' : 'No'}</td>
                    <td class="text-end">
                      <button class="btn-outline btn-sm me-2" data-action="edit-link" data-id="${item.id}" type="button">Edit</button>
                      <button class="btn-outline btn-sm" data-action="delete-link" data-id="${item.id}" type="button">Delete</button>
                    </td>
                  </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderProducts() {
  const root = document.getElementById('products-content');
  if (!state.products.length) {
    root.innerHTML = '<div class="admin-empty">No work items yet. Add one to show a book, project, or resource on website.</div>';
    return;
  }

  root.innerHTML = `
    <div class="card-item p-3">
      <p class="admin-helper mb-3">Best place to manage books, resources, short descriptions, cover images, and store links.</p>
      <div class="admin-work-grid">
        ${state.products
          .map((item) => {
            const { image, fallback } = getProductPreview(item);
            const storeLinks = getProductStoreLinks(item);
            return `
              <article class="admin-work-card">
                <div class="admin-work-card-top">
                  <img class="admin-work-thumb" src="${escapeHtml(image)}" alt="${escapeHtml(
                    item.imageAlt || `Cover image for ${item.title || 'work item'}`
                  )}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';" />
                  <div class="d-grid gap-3">
                    <div class="d-grid gap-2">
                      <div class="admin-work-meta">
                        <span class="admin-tag">${escapeHtml(item.category || 'Work')}</span>
                        ${item.featured ? '<span class="admin-tag">Featured on homepage</span>' : ''}
                        ${item.isNew ? '<span class="admin-tag">Marked new</span>' : ''}
                      </div>
                      <div>
                        <h3 class="h5 mb-1">${escapeHtml(item.title || 'Untitled work')}</h3>
                        <p class="text-muted-ui mb-0">${escapeHtml(item.description || 'No short description yet.')}</p>
                      </div>
                    </div>
                    ${
                      storeLinks.length
                        ? `<div class="admin-work-link-list">
                            ${storeLinks
                              .map(
                                (link) =>
                                  `<a class="btn-outline btn-sm" href="${escapeHtml(safeHref(link.href))}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
                              )
                              .join('')}
                          </div>`
                        : '<p class="admin-helper mb-0">No store links yet.</p>'
                    }
                  </div>
                </div>
                <div class="d-flex justify-content-end gap-2">
                  <button class="btn-outline btn-sm" data-action="edit-product" data-id="${escapeHtml(item.id)}" type="button">Edit</button>
                  <button class="btn-outline btn-sm" data-action="delete-product" data-id="${escapeHtml(item.id)}" type="button">Delete</button>
                </div>
              </article>`;
          })
          .join('')}
      </div>
    </div>`;
}

function renderSpeaking() {
  const root = document.getElementById('speaking-content');
  if (!state.speaking.length) {
    root.innerHTML = '<div class="admin-empty">No events yet. Add one to show it on website.</div>';
    return;
  }

  root.innerHTML = `
    <div class="card-item p-3">
      <p class="admin-helper mb-3">Add upcoming events, speaking engagements, and past appearances visitors should see.</p>
      <div class="table-responsive">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Date Shown</th>
              <th>Event Title</th>
              <th>Type</th>
              <th>Location</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${state.speaking
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.displayDate || item.date)}</td>
                    <td><strong>${escapeHtml(item.talkTitle)}</strong>${item.venue ? `<br /><span class="text-muted-ui small">${escapeHtml(item.venue)}</span>` : ''}</td>
                    <td>${escapeHtml(getSpeakingTypeLabel(item.type))}</td>
                    <td>${escapeHtml(item.city || item.venueAddress || '')}</td>
                    <td class="text-end">
                      <button class="btn-outline btn-sm me-2" data-action="edit-speaking" data-id="${item.id}" type="button">Edit</button>
                      <button class="btn-outline btn-sm" data-action="delete-speaking" data-id="${item.id}" type="button">Delete</button>
                    </td>
                  </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function repeatListMarkup(items, type) {
  return items
    .map(
      (item, index) => `
        <div class="admin-repeat-item" data-repeat-item data-type="${type}">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <strong>${type === 'quick-nav' ? `Featured Shortcut ${index + 1}` : `Speaking Topic ${index + 1}`}</strong>
            <button class="btn-outline btn-sm" type="button" data-remove-repeat>Remove</button>
          </div>
          ${
            type === 'quick-nav'
              ? `
                <div class="admin-form-grid">
                  <div><label class="form-label">Shortcut title</label><input class="form-control" data-field="title" value="${escapeHtml(item.title || '')}" /></div>
                  <div><label class="form-label">Button text</label><input class="form-control" data-field="linkText" value="${escapeHtml(item.linkText || '')}" /></div>
                  <div class="full"><label class="form-label">Short description</label><textarea class="form-control" rows="3" data-field="description">${escapeHtml(item.description || '')}</textarea></div>
                  <div class="full"><label class="form-label">Button link</label><input class="form-control" data-field="href" value="${escapeHtml(item.href || '')}" /></div>
                </div>`
              : `
                <div class="admin-form-grid">
                  <div class="full"><label class="form-label">Topic title</label><input class="form-control" data-field="title" value="${escapeHtml(item.title || '')}" /></div>
                  <div class="full"><label class="form-label">Description</label><textarea class="form-control" rows="3" data-field="description">${escapeHtml(item.description || '')}</textarea></div>
                </div>`
          }
        </div>`
    )
    .join('');
}

function bindRepeatList(root, type) {
  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches('[data-remove-repeat]')) {
      target.closest('[data-repeat-item]')?.remove();
    }
  });

  root.parentElement.querySelector('[data-add-repeat]')?.addEventListener('click', () => {
    root.insertAdjacentHTML(
      'beforeend',
      repeatListMarkup(
        [
          type === 'quick-nav'
            ? { title: '', description: '', href: '', linkText: '' }
            : { title: '', description: '' }
        ],
        type
      )
    );
  });
}

function readRepeatList(root) {
  return [...root.querySelectorAll('[data-repeat-item]')].map((item) => {
    const fields = [...item.querySelectorAll('[data-field]')];
    return fields.reduce((accumulator, field) => {
      accumulator[field.dataset.field] = field.value.trim();
      return accumulator;
    }, {});
  });
}

function renderSiteForms() {
  const siteForm = document.getElementById('site-form');
  const aboutForm = document.getElementById('about-form');
  const legalForm = document.getElementById('legal-form');
  const authForm = document.getElementById('auth-form');
  const siteLastUpdated = document.getElementById('site-last-updated');

  const site = state.site;
  const about = state.about;
  const legal = state.legal;
  const authSettings = state.authSettings;
  const analytics = state.analytics;

  if (siteLastUpdated) {
    siteLastUpdated.textContent = analytics?.summary?.lastUpdated
      ? `Last website update: ${formatDate(analytics.summary.lastUpdated)}`
      : 'Last website update unavailable';
  }

  siteForm.innerHTML = `
    <div class="admin-form-stack">
      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Intro</h4>
          <p>Update headline and short intro visitors see first.</p>
        </div>
        <div class="admin-form-grid">
          <div><label class="form-label">Small text above headline</label><input name="heroEyebrow" class="form-control" value="${escapeHtml(site.home.heroEyebrow || '')}" /></div>
          <div><label class="form-label">Main headline</label><input name="heroHeading" class="form-control" value="${escapeHtml(site.home.heroHeading || '')}" /></div>
          <div class="full"><label class="form-label">Intro paragraph</label><textarea name="heroSubheading" class="form-control" rows="4">${escapeHtml(site.home.heroSubheading || '')}</textarea></div>
        </div>
      </section>

      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Main Image</h4>
          <p>Choose image file path and short description for screen readers.</p>
        </div>
        <div class="admin-form-grid">
          ${renderImageField({
            name: 'heroImage',
            label: 'Main image path',
            value: site.home.heroImage || '',
            helper: 'Use existing image, upload new one, or paste full image link.'
          })}
          <div><label class="form-label">Image description</label><input name="heroImageAlt" class="form-control" value="${escapeHtml(site.home.heroImageAlt || '')}" /></div>
        </div>
      </section>

      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Highlights</h4>
          <p>Short lines that help visitors understand key work at a glance.</p>
        </div>
        <div class="admin-form-grid">
          <div><label class="form-label">Quick facts</label><textarea name="heroDetails" class="form-control" rows="5">${escapeHtml(arrayToLines(site.home.heroDetails || []))}</textarea><div class="admin-helper mt-1">One item per line.</div></div>
          <div><label class="form-label">Highlights</label><textarea name="proofItems" class="form-control" rows="5">${escapeHtml(arrayToLines(site.home.proofItems || []))}</textarea><div class="admin-helper mt-1">One item per line.</div></div>
        </div>
      </section>

      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Featured Shortcuts</h4>
          <p>Small cards on homepage that guide visitors to important pages.</p>
        </div>
        <div class="admin-repeat-field">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="admin-helper">Add, remove, or rewrite homepage shortcuts.</span>
            <button class="btn-outline btn-sm" type="button" data-add-repeat>Add Shortcut</button>
          </div>
          <div id="site-quick-nav-list" class="admin-repeat-list">${repeatListMarkup(site.home.quickNav || [], 'quick-nav')}</div>
        </div>
      </section>

      <details class="admin-disclosure">
        <summary>More homepage options</summary>
        <div class="admin-disclosure-body">
          <section class="admin-form-section">
            <div class="admin-section-heading">
              <h4>Website Basics</h4>
              <p>Shared details used across website.</p>
            </div>
            <div class="admin-form-grid">
              <div><label class="form-label">Site name</label><input name="siteName" class="form-control" value="${escapeHtml(site.siteName || '')}" /></div>
              <div><label class="form-label">Website address</label><input name="domain" class="form-control" value="${escapeHtml(site.domain || '')}" /></div>
              <div class="full"><label class="form-label">Contact email</label><input name="contactEmail" class="form-control" type="email" value="${escapeHtml(site.contactEmail || '')}" /></div>
            </div>
          </section>

          <section class="admin-form-section">
            <div class="admin-section-heading">
              <h4>Homepage Counts</h4>
              <p>Choose how many items homepage should highlight.</p>
            </div>
            <div class="admin-form-grid">
              <div><label class="form-label">Books to show</label><input name="featuredProducts" class="form-control" type="number" min="1" max="12" value="${escapeHtml(site.home.featuredProducts || 3)}" /></div>
              <div><label class="form-label">Events to show</label><input name="featuredEvents" class="form-control" type="number" min="1" max="12" value="${escapeHtml(site.home.featuredEvents || 2)}" /></div>
              <div><label class="form-label">Posts to show</label><input name="featuredPosts" class="form-control" type="number" min="1" max="12" value="${escapeHtml(site.home.featuredPosts || 2)}" /></div>
            </div>
          </section>
        </div>
      </details>

      <div class="full d-flex justify-content-end">
        <button class="ac-btn" type="submit">Save Home Page</button>
      </div>
    </div>`;

  aboutForm.innerHTML = `
    <div class="admin-form-stack">
      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Intro</h4>
          <p>Short opening details for About page.</p>
        </div>
        <div class="admin-form-grid">
          <div><label class="form-label">Page headline</label><input name="headline" class="form-control" value="${escapeHtml(about.headline || '')}" /></div>
          <div><label class="form-label">Short tagline</label><input name="tagline" class="form-control" value="${escapeHtml(about.tagline || '')}" /></div>
          <div><label class="form-label">Location</label><input name="location" class="form-control" value="${escapeHtml(about.location || '')}" /></div>
        </div>
      </section>

      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Photos</h4>
          <p>Update portrait and supporting image used on About page.</p>
        </div>
        <div class="admin-form-grid">
          ${renderImageField({
            name: 'portrait',
            label: 'Portrait image path',
            value: about.portrait || '',
            helper: 'Choose from library, upload new file, or paste image link.'
          })}
          ${renderImageField({
            name: 'secondaryImage',
            label: 'Secondary image path',
            value: about.secondaryImage || '',
            helper: 'Choose from library, upload new file, or paste image link.'
          })}
          <div class="full"><label class="form-label">Secondary image description</label><input name="secondaryImageAlt" class="form-control" value="${escapeHtml(about.secondaryImageAlt || '')}" /></div>
        </div>
      </section>

      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Bio</h4>
          <p>Main biography text shown to readers.</p>
        </div>
        <div class="admin-form-grid">
          <div class="full"><label class="form-label">Biography</label><textarea name="bio" class="form-control" rows="7">${escapeHtml(arrayToParagraphs(about.bio || []))}</textarea><div class="admin-helper mt-1">Separate paragraphs with a blank line.</div></div>
        </div>
      </section>

      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Current Work</h4>
          <p>Describe what Ashley is working on now.</p>
        </div>
        <div class="admin-form-grid">
          <div><label class="form-label">Small label above section</label><input name="currentWorkEyebrow" class="form-control" value="${escapeHtml(about.currentWork?.eyebrow || '')}" /></div>
          <div><label class="form-label">Section title</label><input name="currentWorkHeading" class="form-control" value="${escapeHtml(about.currentWork?.heading || '')}" /></div>
          <div class="full"><label class="form-label">Description</label><textarea name="currentWorkDescription" class="form-control" rows="4">${escapeHtml(about.currentWork?.description || '')}</textarea></div>
        </div>
      </section>

      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Speaking Topics</h4>
          <p>Reusable topic blocks for About page speaking section.</p>
        </div>
        <div class="admin-repeat-field">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="admin-helper">Add, remove, or rewrite speaking topics.</span>
            <button class="btn-outline btn-sm" type="button" data-add-repeat>Add Topic</button>
          </div>
          <div id="about-topics-list" class="admin-repeat-list">${repeatListMarkup(about.speakingTopics || [], 'topic')}</div>
        </div>
      </section>

      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Contact Callout</h4>
          <p>Small invitation at bottom of About page.</p>
        </div>
        <div class="admin-form-grid">
          <div><label class="form-label">Callout title</label><input name="ctaHeading" class="form-control" value="${escapeHtml(about.cta?.heading || '')}" /></div>
          <div><label class="form-label">Button text</label><input name="ctaLinkText" class="form-control" value="${escapeHtml(about.cta?.linkText || '')}" /></div>
          <div><label class="form-label">Button link</label><input name="ctaLinkHref" class="form-control" value="${escapeHtml(about.cta?.linkHref || '')}" /></div>
          <div class="full"><label class="form-label">Callout description</label><textarea name="ctaDescription" class="form-control" rows="3">${escapeHtml(about.cta?.description || '')}</textarea></div>
        </div>
      </section>

      <details class="admin-disclosure">
        <summary>More About page details</summary>
        <div class="admin-disclosure-body">
          <section class="admin-form-section">
            <div class="admin-section-heading">
              <h4>Professional Background</h4>
              <p>Optional detail lists shown on About page.</p>
            </div>
            <div class="admin-form-grid">
              <div><label class="form-label">Editing experience</label><textarea name="editingExperience" class="form-control" rows="6">${escapeHtml(arrayToLines(about.editingExperience || []))}</textarea><div class="admin-helper mt-1">One item per line.</div></div>
              <div><label class="form-label">Education</label><textarea name="education" class="form-control" rows="6">${escapeHtml(arrayToLines(about.education || []))}</textarea><div class="admin-helper mt-1">One item per line.</div></div>
            </div>
          </section>
        </div>
      </details>

      <div class="full d-flex justify-content-end">
        <button class="ac-btn" type="submit">Save About Page</button>
      </div>
    </div>`;

  legalForm.innerHTML = `
    <div class="admin-form-stack">
      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Privacy Policy</h4>
          <p>Wording shown on privacy page.</p>
        </div>
        <div class="admin-form-grid">
          <div><label class="form-label">Page title</label><input name="privacyTitle" class="form-control" value="${escapeHtml(legal.privacy.title || '')}" /></div>
          <div><label class="form-label">Updated date label</label><input name="privacyUpdatedLabel" class="form-control" value="${escapeHtml(legal.privacy.updatedLabel || '')}" /></div>
          <div class="full"><label class="form-label">Intro text</label><textarea name="privacyIntro" class="form-control" rows="3">${escapeHtml(legal.privacy.intro || '')}</textarea></div>
          <div class="full"><label class="form-label">Page body</label><textarea name="privacyBody" class="form-control" rows="10">${escapeHtml(legal.privacy.body || '')}</textarea><div class="admin-helper mt-1">Use blank lines for paragraphs. Use lines starting with <code>## </code> for section headings.</div></div>
        </div>
      </section>

      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Terms of Use</h4>
          <p>Wording shown on terms page.</p>
        </div>
        <div class="admin-form-grid">
          <div><label class="form-label">Page title</label><input name="termsTitle" class="form-control" value="${escapeHtml(legal.terms.title || '')}" /></div>
          <div><label class="form-label">Updated date label</label><input name="termsUpdatedLabel" class="form-control" value="${escapeHtml(legal.terms.updatedLabel || '')}" /></div>
          <div class="full"><label class="form-label">Intro text</label><textarea name="termsIntro" class="form-control" rows="3">${escapeHtml(legal.terms.intro || '')}</textarea></div>
          <div class="full"><label class="form-label">Page body</label><textarea name="termsBody" class="form-control" rows="10">${escapeHtml(legal.terms.body || '')}</textarea></div>
        </div>
      </section>

      <div class="full d-flex justify-content-end">
        <button class="ac-btn" type="submit">Save Legal Pages</button>
      </div>
    </div>`;

  authForm.innerHTML = `
    <div class="admin-form-stack">
      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Sign-In Details</h4>
          <p>Change email or password used to sign in here.</p>
        </div>
        <div class="admin-form-grid">
          <div class="full">
            <label class="form-label">Admin email</label>
            <input name="email" class="form-control" type="email" value="${escapeHtml(authSettings?.email || '')}" required />
          </div>
        </div>
      </section>

      <section class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Password</h4>
          <p>Use current password to confirm changes. Leave new password blank if email only is changing.</p>
        </div>
        <div class="admin-form-grid">
          <div>
            <label class="form-label">Current password</label>
            <input name="currentPassword" class="form-control" type="password" autocomplete="current-password" required />
          </div>
          <div>
            <label class="form-label">New password</label>
            <input name="newPassword" class="form-control" type="password" autocomplete="new-password" />
            <div class="admin-helper mt-1">Leave blank to keep current password.</div>
          </div>
          <div class="full">
            <label class="form-label">Confirm new password</label>
            <input name="confirmPassword" class="form-control" type="password" autocomplete="new-password" />
          </div>
        </div>
      </section>

      <div class="full d-flex justify-content-end">
        <button class="ac-btn" type="submit">Save Sign-In Settings</button>
      </div>
    </div>`;

  bindRepeatList(document.getElementById('site-quick-nav-list'), 'quick-nav');
  bindRepeatList(document.getElementById('about-topics-list'), 'topic');
}

function buildSitePayload(form) {
  return {
    ...state.site,
    siteName: form.siteName.value.trim(),
    domain: form.domain.value.trim(),
    contactEmail: form.contactEmail.value.trim(),
    home: {
      ...state.site.home,
      heroEyebrow: form.heroEyebrow.value.trim(),
      heroHeading: form.heroHeading.value.trim(),
      heroSubheading: form.heroSubheading.value.trim(),
      heroImage: form.heroImage.value.trim(),
      heroImageAlt: form.heroImageAlt.value.trim(),
      heroDetails: linesToArray(form.heroDetails.value),
      proofItems: linesToArray(form.proofItems.value),
      quickNav: readRepeatList(document.getElementById('site-quick-nav-list')),
      featuredProducts: Number(form.featuredProducts.value),
      featuredEvents: Number(form.featuredEvents.value),
      featuredPosts: Number(form.featuredPosts.value),
      heroCTAs: state.site.home.heroCTAs || []
    }
  };
}

function buildAboutPayload(form) {
  return {
    ...state.about,
    headline: form.headline.value.trim(),
    tagline: form.tagline.value.trim(),
    location: form.location.value.trim(),
    portrait: form.portrait.value.trim(),
    secondaryImage: form.secondaryImage.value.trim(),
    secondaryImageAlt: form.secondaryImageAlt.value.trim(),
    bio: paragraphsToArray(form.bio.value),
    currentWork: {
      eyebrow: form.currentWorkEyebrow.value.trim(),
      heading: form.currentWorkHeading.value.trim(),
      description: form.currentWorkDescription.value.trim()
    },
    editingExperience: linesToArray(form.editingExperience.value),
    education: linesToArray(form.education.value),
    professionalLinks: state.about.professionalLinks || [],
    speakingTopics: readRepeatList(document.getElementById('about-topics-list')),
    cta: {
      heading: form.ctaHeading.value.trim(),
      description: form.ctaDescription.value.trim(),
      linkText: form.ctaLinkText.value.trim(),
      linkHref: form.ctaLinkHref.value.trim()
    }
  };
}

function buildProductPayload(form, item = null) {
  return {
    id: item?.id || crypto.randomUUID(),
    title: form.title.value.trim(),
    category: form.category.value.trim(),
    description: form.description.value.trim(),
    longDescription: form.longDescription.value.trim(),
    image: form.image.value.trim(),
    imageAlt: form.imageAlt.value.trim(),
    amazonUrl: form.amazonUrl.value.trim(),
    tptUrl: form.tptUrl.value.trim(),
    featured: form.featured.value === 'true',
    isNew: form.isNew.value === 'true',
    publishDate: form.publishDate.value.trim()
  };
}

function buildLegalPayload(form) {
  return {
    privacy: {
      title: form.privacyTitle.value.trim(),
      intro: form.privacyIntro.value.trim(),
      body: form.privacyBody.value.trim(),
      updatedLabel: form.privacyUpdatedLabel.value.trim()
    },
    terms: {
      title: form.termsTitle.value.trim(),
      intro: form.termsIntro.value.trim(),
      body: form.termsBody.value.trim(),
      updatedLabel: form.termsUpdatedLabel.value.trim()
    }
  };
}

async function saveProducts(products, message) {
  await api('/api/admin/blocks/products', {
    method: 'PATCH',
    body: JSON.stringify({ products })
  });

  showBanner('success', message);
  editModal.hide();
  await reloadAll();
}

function closeMediaPanel(panel) {
  if (!panel) return;
  panel.innerHTML = '';
  panel.classList.add('d-none');
}

function closeAllMediaPanels(except = null) {
  document.querySelectorAll('[data-media-panel]').forEach((panel) => {
    if (panel !== except) closeMediaPanel(panel);
  });
}

function renderExistingMediaPanel() {
  if (!state.mediaLibrary.length) {
    return `
      <div class="admin-helper">No saved images yet. Upload one, or paste image link instead.</div>
      <div class="d-flex justify-content-end">
        <button class="btn-outline btn-sm" type="button" data-close-media-panel>Close</button>
      </div>`;
  }

  return `
    <div class="d-flex justify-content-between align-items-center gap-2">
      <p class="admin-helper mb-0">Choose already available image.</p>
      <button class="btn-outline btn-sm" type="button" data-close-media-panel>Close</button>
    </div>
    <div class="admin-media-grid">
      ${state.mediaLibrary
        .map(
          (item) => `
            <button class="admin-media-option" type="button" data-use-existing-image="${escapeHtml(item.path)}">
              <img src="${escapeHtml(resolveImagePreview(item.path))}" alt="${escapeHtml(item.label)}" loading="lazy" />
              <strong>${escapeHtml(item.label)}</strong>
              <span class="admin-helper">${escapeHtml(item.source || 'Image')}</span>
            </button>`
        )
        .join('')}
    </div>`;
}

function renderUploadMediaPanel() {
  return `
    <div class="d-flex justify-content-between align-items-center gap-2">
      <p class="admin-helper mb-0">Upload file, or paste direct image link.</p>
      <button class="btn-outline btn-sm" type="button" data-close-media-panel>Close</button>
    </div>
    <div class="admin-media-upload-grid">
      <div class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Upload File</h4>
          <p>Image becomes part of your saved library.</p>
        </div>
        <div class="d-grid gap-2">
          <input class="form-control" type="file" accept="image/*" data-upload-file />
          <button class="ac-btn btn-sm" type="button" data-upload-image>Upload Image</button>
        </div>
      </div>
      <div class="admin-form-section">
        <div class="admin-section-heading">
          <h4>Use Link</h4>
          <p>Paste full image URL instead of uploading file.</p>
        </div>
        <div class="d-grid gap-2">
          <input class="form-control" type="url" placeholder="https://example.com/image.jpg" data-image-url />
          <button class="btn-outline btn-sm" type="button" data-use-image-url>Use This Link</button>
        </div>
      </div>
    </div>`;
}

function openMediaPanel(wrapper, mode) {
  const panel = wrapper?.querySelector('[data-media-panel]');
  if (!panel) return;
  closeAllMediaPanels(panel);
  panel.innerHTML = mode === 'upload' ? renderUploadMediaPanel() : renderExistingMediaPanel();
  panel.classList.remove('d-none');
}

function buildAuthPayload(form) {
  const newPassword = form.newPassword.value.trim();
  const confirmPassword = form.confirmPassword.value.trim();

  if (newPassword !== confirmPassword) {
    throw new Error('New password confirmation does not match.');
  }

  return {
    email: form.email.value.trim(),
    currentPassword: form.currentPassword.value,
    newPassword
  };
}

function openEditModal(kind, item = null) {
  state.editing = { kind, item };
  const title = document.getElementById('admin-edit-modal-title');
  const form = document.getElementById('admin-edit-form');

  if (kind === 'link') {
    title.textContent = item ? 'Edit Link' : 'Add Link';
    form.innerHTML = `
      <div class="admin-form-stack">
        <section class="admin-form-section">
          <div class="admin-section-heading">
            <h4>Basic Details</h4>
            <p>Set where link appears, what button says, and where it goes.</p>
          </div>
          <div class="admin-form-grid">
            <div><label class="form-label">Where this appears</label><select name="groupName" class="form-select">
              ${['hero_cta', 'professional', 'social']
                .map((value) => `<option value="${value}" ${item?.groupName === value ? 'selected' : ''}>${getLinkGroupLabel(value)}</option>`)
                .join('')}
            </select></div>
            <div><label class="form-label">Link text</label><input name="label" class="form-control" value="${escapeHtml(item?.label || '')}" required /></div>
            <div class="full"><label class="form-label">Destination link</label><input name="href" class="form-control" value="${escapeHtml(item?.href || '')}" required /></div>
            <div><label class="form-label">Show on site</label><select name="visible" class="form-select"><option value="true" ${item?.visible !== false ? 'selected' : ''}>Yes</option><option value="false" ${item?.visible === false ? 'selected' : ''}>No</option></select></div>
          </div>
        </section>

        <details class="admin-disclosure">
          <summary>More link options</summary>
          <div class="admin-disclosure-body">
            <div class="admin-form-grid">
              <div><label class="form-label">Link key</label><input name="slotKey" class="form-control" value="${escapeHtml(item?.slotKey || '')}" /></div>
              <div><label class="form-label">Icon name</label><input name="icon" class="form-control" value="${escapeHtml(item?.icon || '')}" /></div>
              <div><label class="form-label">Style</label><input name="style" class="form-control" value="${escapeHtml(item?.style || '')}" /></div>
              <div><label class="form-label">Display order</label><input name="sortOrder" class="form-control" type="number" min="0" max="999" value="${escapeHtml(item?.sortOrder ?? 0)}" /></div>
            </div>
          </div>
        </details>

        <div class="full d-flex justify-content-end">
          <button class="ac-btn" type="submit">${item ? 'Save Link' : 'Create Link'}</button>
        </div>
      </div>`;
  }

  if (kind === 'speaking') {
    title.textContent = item ? 'Edit Event' : 'Add Event';
    form.innerHTML = `
      <div class="admin-form-stack">
        <section class="admin-form-section">
          <div class="admin-section-heading">
            <h4>Basic Details</h4>
            <p>Main details visitors need to see.</p>
          </div>
          <div class="admin-form-grid">
            <div><label class="form-label">Type</label><select name="type" class="form-select">
              ${['upcoming_conference', 'speaking_engagement', 'past_appearance']
                .map((value) => `<option value="${value}" ${item?.type === value ? 'selected' : ''}>${getSpeakingTypeLabel(value)}</option>`)
                .join('')}
            </select></div>
            <div><label class="form-label">Actual date</label><input name="date" class="form-control" type="date" value="${escapeHtml(item?.date || '')}" required /></div>
            <div><label class="form-label">Date shown on site</label><input name="displayDate" class="form-control" value="${escapeHtml(item?.displayDate || '')}" /></div>
            <div class="full"><label class="form-label">Event title</label><input name="talkTitle" class="form-control" value="${escapeHtml(item?.talkTitle || '')}" required /></div>
            <div class="full admin-helper">Use actual date for sorting. "Date shown on site" lets you write something friendlier like "Spring 2026".</div>
          </div>
        </section>

        <section class="admin-form-section">
          <div class="admin-section-heading">
            <h4>Location</h4>
            <p>Where event happens.</p>
          </div>
          <div class="admin-form-grid">
            <div><label class="form-label">City</label><input name="city" class="form-control" value="${escapeHtml(item?.city || '')}" /></div>
            <div><label class="form-label">Venue</label><input name="venue" class="form-control" value="${escapeHtml(item?.venue || '')}" /></div>
            <div class="full"><label class="form-label">Venue address</label><input name="venueAddress" class="form-control" value="${escapeHtml(item?.venueAddress || '')}" /></div>
          </div>
        </section>

        <section class="admin-form-section">
          <div class="admin-section-heading">
            <h4>Optional Details</h4>
            <p>Add supporting context if it helps visitors.</p>
          </div>
          <div class="admin-form-grid">
            <div class="full"><label class="form-label">Map link</label><input name="venueMapUrl" class="form-control" value="${escapeHtml(item?.venueMapUrl || '')}" /></div>
            <div class="full"><label class="form-label">Short description</label><textarea name="topic" class="form-control" rows="4">${escapeHtml(item?.topic || '')}</textarea></div>
          </div>
        </section>

        <div class="full d-flex justify-content-end">
          <button class="ac-btn" type="submit">${item ? 'Save Event' : 'Create Event'}</button>
        </div>
      </div>`;
  }

  if (kind === 'product') {
    title.textContent = item ? 'Edit Work Item' : 'Add Work Item';
    form.innerHTML = `
      <div class="admin-form-stack">
        <section class="admin-form-section">
          <div class="admin-section-heading">
            <h4>Basic Details</h4>
            <p>Name item, choose category, and write short text visitors will see first.</p>
          </div>
          <div class="admin-form-grid">
            <div class="full"><label class="form-label">Title</label><input name="title" class="form-control" value="${escapeHtml(item?.title || '')}" required /></div>
            <div>
              <label class="form-label">Category</label>
              <input name="category" class="form-control" list="product-category-options" value="${escapeHtml(item?.category || '')}" required />
              <datalist id="product-category-options">
                ${PRODUCT_CATEGORY_SUGGESTIONS.map((value) => `<option value="${escapeHtml(value)}"></option>`).join('')}
              </datalist>
            </div>
            <div><label class="form-label">Publish date</label><input name="publishDate" class="form-control" type="date" value="${escapeHtml(item?.publishDate || '')}" /></div>
            <div class="full"><label class="form-label">Short description</label><textarea name="description" class="form-control" rows="3" required>${escapeHtml(item?.description || '')}</textarea></div>
          </div>
        </section>

        <section class="admin-form-section">
          <div class="admin-section-heading">
            <h4>Image</h4>
            <p>Use library image, upload new file, or paste direct image link.</p>
          </div>
          <div class="admin-form-grid">
            ${renderImageField({
              name: 'image',
              label: 'Image path or link',
              value: item?.image || '',
              helper: 'Uploaded files become part of image library. You can also paste full image URL.'
            })}
            <div><label class="form-label">Image description</label><input name="imageAlt" class="form-control" value="${escapeHtml(item?.imageAlt || '')}" /></div>
          </div>
        </section>

        <section class="admin-form-section">
          <div class="admin-section-heading">
            <h4>More Details</h4>
            <p>Extra description used on detail view.</p>
          </div>
          <div class="admin-form-grid">
            <div class="full"><label class="form-label">Long description</label><textarea name="longDescription" class="form-control" rows="5">${escapeHtml(item?.longDescription || '')}</textarea></div>
          </div>
        </section>

        <section class="admin-form-section">
          <div class="admin-section-heading">
            <h4>Store Links</h4>
            <p>Add storefront links where visitors can buy or open this item.</p>
          </div>
          <div class="admin-form-grid">
            <div><label class="form-label">Amazon link</label><input name="amazonUrl" class="form-control" value="${escapeHtml(item?.amazonUrl || '')}" /></div>
            <div><label class="form-label">TPT link</label><input name="tptUrl" class="form-control" value="${escapeHtml(item?.tptUrl || '')}" /></div>
          </div>
        </section>

        <section class="admin-form-section">
          <div class="admin-section-heading">
            <h4>Homepage Options</h4>
            <p>Choose whether this item gets homepage attention.</p>
          </div>
          <div class="admin-form-grid">
            <div><label class="form-label">Featured on homepage</label><select name="featured" class="form-select"><option value="true" ${item?.featured ? 'selected' : ''}>Yes</option><option value="false" ${item?.featured ? '' : 'selected'}>No</option></select></div>
            <div><label class="form-label">Show “new” badge</label><select name="isNew" class="form-select"><option value="true" ${item?.isNew ? 'selected' : ''}>Yes</option><option value="false" ${item?.isNew ? '' : 'selected'}>No</option></select></div>
          </div>
        </section>

        <div class="full d-flex justify-content-end">
          <button class="ac-btn" type="submit">${item ? 'Save Work Item' : 'Create Work Item'}</button>
        </div>
      </div>`;
  }

  editModal.show();
}

function bindGlobalEvents() {
  document.querySelectorAll('.admin-nav-link').forEach((button) => {
    button.addEventListener('click', () => {
      setActivePanel(button.dataset.target);
    });
  });

  document.querySelectorAll('.admin-shortcut').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.target || DEFAULT_PANEL;
      setActivePanel(target);
      const scrollTarget = button.dataset.scrollTarget;
      if (scrollTarget) {
        document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  document.getElementById('admin-logout').addEventListener('click', async () => {
    await api('/api/admin/auth/logout', { method: 'POST' });
    window.location.replace('/admin/login/');
  });

  document.getElementById('add-product-button').addEventListener('click', () => openEditModal('product'));
  document.getElementById('add-link-button').addEventListener('click', () => openEditModal('link'));
  document.getElementById('add-speaking-button').addEventListener('click', () => openEditModal('speaking'));

  document.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const actionTarget = target.closest(
      '[data-media-open], [data-close-media-panel], [data-use-existing-image], [data-use-image-url], [data-upload-image]'
    );
    if (!(actionTarget instanceof HTMLElement)) return;

    if (actionTarget.matches('[data-media-open]')) {
      const wrapper = actionTarget.closest('[data-media-field]');
      if (wrapper) openMediaPanel(wrapper, actionTarget.dataset.mediaOpen || 'existing');
      return;
    }

    if (actionTarget.matches('[data-close-media-panel]')) {
      closeMediaPanel(actionTarget.closest('[data-media-panel]'));
      return;
    }

    if (actionTarget.matches('[data-use-existing-image]')) {
      const panel = actionTarget.closest('[data-media-panel]');
      const wrapper = actionTarget.closest('[data-media-field]');
      const input = wrapper?.querySelector('input[name]');
      if (input) input.value = actionTarget.dataset.useExistingImage || '';
      closeMediaPanel(panel);
      return;
    }

    if (actionTarget.matches('[data-use-image-url]')) {
      const panel = actionTarget.closest('[data-media-panel]');
      const wrapper = actionTarget.closest('[data-media-field]');
      const urlInput = panel?.querySelector('[data-image-url]');
      const input = wrapper?.querySelector('input[name]');
      if (input && urlInput instanceof HTMLInputElement) {
        input.value = urlInput.value.trim();
      }
      closeMediaPanel(panel);
      return;
    }

    if (actionTarget.matches('[data-upload-image]')) {
      const panel = actionTarget.closest('[data-media-panel]');
      const wrapper = actionTarget.closest('[data-media-field]');
      const fileInput = panel?.querySelector('[data-upload-file]');
      const input = wrapper?.querySelector('input[name]');
      const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;

      if (!file) {
        showBanner('danger', 'Choose image file first.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      const result = await api('/api/admin/media', {
        method: 'POST',
        body: formData
      });

      if (input) input.value = result.item?.path || '';
      state.mediaLibrary = [...state.mediaLibrary.filter((item) => item.path !== result.item?.path), result.item];
      closeMediaPanel(panel);
      showBanner('success', 'Image uploaded.');
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('[data-media-field], .admin-nav-link, .admin-shortcut')) return;
    if (target.closest('#admin-edit-modal, #admin-delete-modal')) return;
    closeAllMediaPanels();
  });

  document.getElementById('products-content').addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.id;
    if (!id) return;
    if (target.dataset.action === 'edit-product') {
      openEditModal('product', state.products.find((item) => item.id === id));
    }
    if (target.dataset.action === 'delete-product') {
      const item = state.products.find((entry) => entry.id === id);
      state.deleteAction = async () => {
        const nextProducts = state.products.filter((entry) => entry.id !== id);
        await saveProducts(nextProducts, 'Work item removed from website.');
      };
      document.getElementById('admin-delete-message').textContent = `Delete "${item?.title || 'this work item'}"? This removes it from website.`;
      deleteModal.show();
    }
  });

  document.getElementById('links-content').addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.id;
    if (!id) return;
    if (target.dataset.action === 'edit-link') {
      openEditModal('link', state.links.find((item) => item.id === id));
    }
    if (target.dataset.action === 'delete-link') {
      const item = state.links.find((entry) => entry.id === id);
      state.deleteAction = async () => {
        await api(`/api/admin/links/${id}`, { method: 'DELETE' });
        showBanner('success', 'Link removed from website.');
        await reloadAll();
      };
      document.getElementById('admin-delete-message').textContent = `Delete "${item?.label || 'this link'}"? This removes it from website.`;
      deleteModal.show();
    }
  });

  document.getElementById('speaking-content').addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.id;
    if (!id) return;
    if (target.dataset.action === 'edit-speaking') {
      openEditModal('speaking', state.speaking.find((item) => item.id === id));
    }
    if (target.dataset.action === 'delete-speaking') {
      const item = state.speaking.find((entry) => entry.id === id);
      state.deleteAction = async () => {
        await api(`/api/admin/speaking/${id}`, { method: 'DELETE' });
        showBanner('success', 'Event removed from website.');
        await reloadAll();
      };
      document.getElementById('admin-delete-message').textContent = `Delete "${item?.talkTitle || 'this event'}"? This removes it from website.`;
      deleteModal.show();
    }
  });

  document.getElementById('admin-delete-confirm').addEventListener('click', async () => {
    const action = state.deleteAction;
    if (!action) return;
    await action();
    state.deleteAction = null;
    deleteModal.hide();
  });

  document.getElementById('admin-edit-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (state.editing.kind === 'product') {
      const nextItem = buildProductPayload(form, state.editing.item);
      const nextProducts = state.editing.item
        ? state.products.map((item) => (item.id === state.editing.item.id ? nextItem : item))
        : [nextItem, ...state.products];
      await saveProducts(nextProducts, 'My Work saved.');
      return;
    }

    const isLink = state.editing.kind === 'link';
    const payload = isLink
      ? {
          groupName: form.groupName.value,
          slotKey: form.slotKey.value.trim() || null,
          label: form.label.value.trim(),
          href: form.href.value.trim(),
          icon: form.icon.value.trim() || null,
          style: form.style.value.trim() || null,
          sortOrder: Number(form.sortOrder.value || 0),
          visible: form.visible.value === 'true'
        }
      : {
          type: form.type.value,
          date: form.date.value,
          displayDate: form.displayDate.value.trim() || null,
          city: form.city.value.trim() || null,
          venue: form.venue.value.trim() || null,
          venueAddress: form.venueAddress.value.trim() || null,
          venueMapUrl: form.venueMapUrl.value.trim() || null,
          talkTitle: form.talkTitle.value.trim(),
          topic: form.topic.value.trim() || null
        };

    const path = isLink ? '/api/admin/links' : '/api/admin/speaking';
    const method = state.editing.item ? 'PATCH' : 'POST';
    const finalPath = state.editing.item ? `${path}/${state.editing.item.id}` : path;

    await api(finalPath, {
      method,
      body: JSON.stringify(payload)
    });

    showBanner('success', `${isLink ? 'Link' : 'Event'} saved.`);
    editModal.hide();
    await reloadAll();
  });

  document.getElementById('site-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = buildSitePayload(event.currentTarget);
    await api('/api/admin/blocks/site', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    showBanner('success', 'Home page saved.');
    await reloadAll();
  });

  document.getElementById('about-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = buildAboutPayload(event.currentTarget);
    await api('/api/admin/blocks/about', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    showBanner('success', 'About page saved.');
    await reloadAll();
  });

  document.getElementById('legal-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = buildLegalPayload(event.currentTarget);
    await api('/api/admin/blocks/legal', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    showBanner('success', 'Legal pages saved.');
    await reloadAll();
  });

  document.getElementById('auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = buildAuthPayload(event.currentTarget);
    const result = await api('/api/admin/auth-settings', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    state.session = { ...(state.session || {}), authenticated: true, email: result.email };
    document.getElementById('admin-email').textContent = result.email;
    event.currentTarget.reset();
    showBanner('success', 'Sign-in settings saved.');
    await reloadAll();
  });
}

async function reloadAll() {
  const [links, products, speaking, site, about, legal, analytics, authSettings, media] = await Promise.all([
    api('/api/admin/links'),
    api('/api/admin/blocks/products'),
    api('/api/admin/speaking'),
    api('/api/admin/blocks/site'),
    api('/api/admin/blocks/about'),
    api('/api/admin/blocks/legal'),
    api('/api/admin/analytics'),
    api('/api/admin/auth-settings'),
    api('/api/admin/media')
  ]);

  state.links = links.items || [];
  state.products = products.products || [];
  state.speaking = speaking.items || [];
  state.site = site;
  state.about = about;
  state.legal = legal;
  state.analytics = analytics;
  state.authSettings = authSettings;
  state.mediaLibrary = media.items || [];

  renderOverview();
  renderProducts();
  renderLinks();
  renderSpeaking();
  renderSiteForms();
}

async function bootstrap() {
  const session = await api('/api/admin/session');
  if (!session.authenticated) {
    window.location.replace('/admin/login/');
    return;
  }

  state.session = session;
  document.getElementById('admin-email').textContent = session.email;
  bindGlobalEvents();
  setActivePanel(DEFAULT_PANEL);
  await reloadAll();
}

bootstrap().catch((error) => {
  console.error(error);
  showBanner('danger', error instanceof Error ? error.message : 'Unable to load admin.');
});
