const state = {
  session: null,
  authSettings: null,
  links: [],
  speaking: [],
  site: null,
  about: null,
  legal: null,
  analytics: null,
  deleteAction: null,
  editing: null
};

const editModalEl = document.getElementById('admin-edit-modal');
const editModal = new bootstrap.Modal(editModalEl);
const deleteModalEl = document.getElementById('admin-delete-modal');
const deleteModal = new bootstrap.Modal(deleteModalEl);

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

function showBanner(type, message) {
  const banner = document.getElementById('admin-banner');
  banner.className = `alert alert-${type}`;
  banner.textContent = message;
  banner.classList.remove('d-none');
  window.clearTimeout(showBanner.timeoutId);
  showBanner.timeoutId = window.setTimeout(() => banner.classList.add('d-none'), 4000);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
    root.innerHTML = '<div class="admin-empty">Unable to load dashboard.</div>';
    return;
  }

  root.innerHTML = `
    <div class="admin-grid">
      <div class="admin-metric-grid">
        <div class="admin-metric-card">
          <span class="text-muted-ui small">Links</span>
          <strong>${analytics.summary.linkCount}</strong>
        </div>
        <div class="admin-metric-card">
          <span class="text-muted-ui small">Speaking Items</span>
          <strong>${analytics.summary.speakingCount}</strong>
        </div>
        <div class="admin-metric-card">
          <span class="text-muted-ui small">Managed Docs</span>
          <strong>${analytics.summary.documentCount}</strong>
        </div>
        <div class="admin-metric-card">
          <span class="text-muted-ui small">Last Content Update</span>
          <strong class="fs-6">${escapeHtml(formatDate(analytics.summary.lastUpdated))}</strong>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-6">
          <div class="admin-chart-card h-100">
            <h3 class="h5 mb-3">Counts by Link Group</h3>
            ${renderBarList(analytics.countsByLinkGroup, 'No managed links yet.')}
          </div>
        </div>
        <div class="col-lg-6">
          <div class="admin-chart-card h-100">
            <h3 class="h5 mb-3">Counts by Speaking Type</h3>
            ${renderBarList(analytics.countsBySpeakingType, 'No speaking entries yet.')}
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-6">
          <div class="admin-chart-card h-100">
            <h3 class="h5 mb-3">Content Changes, Last 30 Days</h3>
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
                : '<p class="admin-helper mb-0">Traffic analytics hidden until Cloudflare analytics query credentials are configured.</p>'
            }
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-6">
          <div class="admin-list-card h-100">
            <h3 class="h5 mb-3">Recent Admin Activity</h3>
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
            <h3 class="h5 mb-3">Recently Updated Items</h3>
            <ul>
              ${analytics.recentlyUpdatedItems
                .map(
                  (item) => `
                    <li>
                      <strong>${escapeHtml(item.title)}</strong><br />
                      <span class="text-muted-ui small">${escapeHtml(item.kind)} &middot; ${escapeHtml(formatDate(item.updatedAt))}</span>
                    </li>`
                )
                .join('')}
            </ul>
          </div>
        </div>
      </div>
    </div>`;
}

function renderLinks() {
  const root = document.getElementById('links-content');
  if (!state.links.length) {
    root.innerHTML = '<div class="admin-empty">No links yet. Add a managed link to get started.</div>';
    return;
  }

  root.innerHTML = `
    <div class="card-item p-3">
      <div class="table-responsive">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Label</th>
              <th>Target</th>
              <th>Visible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${state.links
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.groupName)}</td>
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

function renderSpeaking() {
  const root = document.getElementById('speaking-content');
  if (!state.speaking.length) {
    root.innerHTML = '<div class="admin-empty">No speaking entries yet. Add one to populate the public page.</div>';
    return;
  }

  root.innerHTML = `
    <div class="card-item p-3">
      <div class="table-responsive">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Type</th>
              <th>City</th>
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
                    <td>${escapeHtml(item.type)}</td>
                    <td>${escapeHtml(item.city || '')}</td>
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
            <strong>${type === 'quick-nav' ? `Quick Nav ${index + 1}` : `Topic ${index + 1}`}</strong>
            <button class="btn-outline btn-sm" type="button" data-remove-repeat>Remove</button>
          </div>
          ${
            type === 'quick-nav'
              ? `
                <div class="admin-form-grid">
                  <div><label class="form-label">Title</label><input class="form-control" data-field="title" value="${escapeHtml(item.title || '')}" /></div>
                  <div><label class="form-label">Link Text</label><input class="form-control" data-field="linkText" value="${escapeHtml(item.linkText || '')}" /></div>
                  <div class="full"><label class="form-label">Description</label><textarea class="form-control" rows="3" data-field="description">${escapeHtml(item.description || '')}</textarea></div>
                  <div class="full"><label class="form-label">Href</label><input class="form-control" data-field="href" value="${escapeHtml(item.href || '')}" /></div>
                </div>`
              : `
                <div class="admin-form-grid">
                  <div class="full"><label class="form-label">Title</label><input class="form-control" data-field="title" value="${escapeHtml(item.title || '')}" /></div>
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

  const site = state.site;
  const about = state.about;
  const legal = state.legal;
  const authSettings = state.authSettings;

  siteForm.innerHTML = `
    <div class="admin-form-grid">
      <div><label class="form-label">Site Name</label><input name="siteName" class="form-control" value="${escapeHtml(site.siteName || '')}" /></div>
      <div><label class="form-label">Domain</label><input name="domain" class="form-control" value="${escapeHtml(site.domain || '')}" /></div>
      <div><label class="form-label">Contact Email</label><input name="contactEmail" class="form-control" type="email" value="${escapeHtml(site.contactEmail || '')}" /></div>
      <div><label class="form-label">Hero Eyebrow</label><input name="heroEyebrow" class="form-control" value="${escapeHtml(site.home.heroEyebrow || '')}" /></div>
      <div><label class="form-label">Hero Heading</label><input name="heroHeading" class="form-control" value="${escapeHtml(site.home.heroHeading || '')}" /></div>
      <div><label class="form-label">Hero Image</label><input name="heroImage" class="form-control" value="${escapeHtml(site.home.heroImage || '')}" /></div>
      <div class="full"><label class="form-label">Hero Image Alt</label><input name="heroImageAlt" class="form-control" value="${escapeHtml(site.home.heroImageAlt || '')}" /></div>
      <div class="full"><label class="form-label">Hero Subheading</label><textarea name="heroSubheading" class="form-control" rows="4">${escapeHtml(site.home.heroSubheading || '')}</textarea></div>
      <div><label class="form-label">Hero Details</label><textarea name="heroDetails" class="form-control" rows="5">${escapeHtml(arrayToLines(site.home.heroDetails || []))}</textarea><div class="admin-helper mt-1">One item per line.</div></div>
      <div><label class="form-label">Proof Items</label><textarea name="proofItems" class="form-control" rows="5">${escapeHtml(arrayToLines(site.home.proofItems || []))}</textarea><div class="admin-helper mt-1">One item per line.</div></div>
      <div><label class="form-label">Featured Products</label><input name="featuredProducts" class="form-control" type="number" min="1" max="12" value="${escapeHtml(site.home.featuredProducts || 3)}" /></div>
      <div><label class="form-label">Featured Events</label><input name="featuredEvents" class="form-control" type="number" min="1" max="12" value="${escapeHtml(site.home.featuredEvents || 2)}" /></div>
      <div><label class="form-label">Featured Posts</label><input name="featuredPosts" class="form-control" type="number" min="1" max="12" value="${escapeHtml(site.home.featuredPosts || 2)}" /></div>
      <div class="full">
        <label class="form-label">Quick Navigation</label>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="admin-helper">Manage homepage quick-nav cards.</span>
          <button class="btn-outline btn-sm" type="button" data-add-repeat>Add Card</button>
        </div>
        <div id="site-quick-nav-list" class="admin-repeat-list">${repeatListMarkup(site.home.quickNav || [], 'quick-nav')}</div>
      </div>
      <div class="full d-flex justify-content-end">
        <button class="ac-btn" type="submit">Save Site Content</button>
      </div>
    </div>`;

  aboutForm.innerHTML = `
    <div class="admin-form-grid">
      <div><label class="form-label">Headline</label><input name="headline" class="form-control" value="${escapeHtml(about.headline || '')}" /></div>
      <div><label class="form-label">Tagline</label><input name="tagline" class="form-control" value="${escapeHtml(about.tagline || '')}" /></div>
      <div><label class="form-label">Location</label><input name="location" class="form-control" value="${escapeHtml(about.location || '')}" /></div>
      <div><label class="form-label">Portrait Image</label><input name="portrait" class="form-control" value="${escapeHtml(about.portrait || '')}" /></div>
      <div><label class="form-label">Secondary Image</label><input name="secondaryImage" class="form-control" value="${escapeHtml(about.secondaryImage || '')}" /></div>
      <div><label class="form-label">Secondary Image Alt</label><input name="secondaryImageAlt" class="form-control" value="${escapeHtml(about.secondaryImageAlt || '')}" /></div>
      <div class="full"><label class="form-label">Bio</label><textarea name="bio" class="form-control" rows="7">${escapeHtml(arrayToParagraphs(about.bio || []))}</textarea><div class="admin-helper mt-1">Separate paragraphs with a blank line.</div></div>
      <div><label class="form-label">Current Work Eyebrow</label><input name="currentWorkEyebrow" class="form-control" value="${escapeHtml(about.currentWork?.eyebrow || '')}" /></div>
      <div><label class="form-label">Current Work Heading</label><input name="currentWorkHeading" class="form-control" value="${escapeHtml(about.currentWork?.heading || '')}" /></div>
      <div class="full"><label class="form-label">Current Work Description</label><textarea name="currentWorkDescription" class="form-control" rows="4">${escapeHtml(about.currentWork?.description || '')}</textarea></div>
      <div><label class="form-label">Editing Experience</label><textarea name="editingExperience" class="form-control" rows="6">${escapeHtml(arrayToLines(about.editingExperience || []))}</textarea><div class="admin-helper mt-1">One item per line.</div></div>
      <div><label class="form-label">Education</label><textarea name="education" class="form-control" rows="6">${escapeHtml(arrayToLines(about.education || []))}</textarea><div class="admin-helper mt-1">One item per line.</div></div>
      <div class="full">
        <label class="form-label">Speaking Topics</label>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="admin-helper">Manage reusable speaking topic blocks.</span>
          <button class="btn-outline btn-sm" type="button" data-add-repeat>Add Topic</button>
        </div>
        <div id="about-topics-list" class="admin-repeat-list">${repeatListMarkup(about.speakingTopics || [], 'topic')}</div>
      </div>
      <div><label class="form-label">CTA Heading</label><input name="ctaHeading" class="form-control" value="${escapeHtml(about.cta?.heading || '')}" /></div>
      <div><label class="form-label">CTA Link Text</label><input name="ctaLinkText" class="form-control" value="${escapeHtml(about.cta?.linkText || '')}" /></div>
      <div><label class="form-label">CTA Link Href</label><input name="ctaLinkHref" class="form-control" value="${escapeHtml(about.cta?.linkHref || '')}" /></div>
      <div class="full"><label class="form-label">CTA Description</label><textarea name="ctaDescription" class="form-control" rows="3">${escapeHtml(about.cta?.description || '')}</textarea></div>
      <div class="full d-flex justify-content-end">
        <button class="ac-btn" type="submit">Save About Content</button>
      </div>
    </div>`;

  legalForm.innerHTML = `
    <div class="admin-form-grid">
      <div class="full"><h3 class="h5 mb-0">Privacy Policy</h3></div>
      <div><label class="form-label">Title</label><input name="privacyTitle" class="form-control" value="${escapeHtml(legal.privacy.title || '')}" /></div>
      <div><label class="form-label">Updated Label</label><input name="privacyUpdatedLabel" class="form-control" value="${escapeHtml(legal.privacy.updatedLabel || '')}" /></div>
      <div class="full"><label class="form-label">Intro</label><textarea name="privacyIntro" class="form-control" rows="3">${escapeHtml(legal.privacy.intro || '')}</textarea></div>
      <div class="full"><label class="form-label">Body</label><textarea name="privacyBody" class="form-control" rows="10">${escapeHtml(legal.privacy.body || '')}</textarea><div class="admin-helper mt-1">Use blank lines for paragraphs. Use lines starting with <code>## </code> for section headings.</div></div>
      <div class="full"><hr /></div>
      <div class="full"><h3 class="h5 mb-0">Terms of Use</h3></div>
      <div><label class="form-label">Title</label><input name="termsTitle" class="form-control" value="${escapeHtml(legal.terms.title || '')}" /></div>
      <div><label class="form-label">Updated Label</label><input name="termsUpdatedLabel" class="form-control" value="${escapeHtml(legal.terms.updatedLabel || '')}" /></div>
      <div class="full"><label class="form-label">Intro</label><textarea name="termsIntro" class="form-control" rows="3">${escapeHtml(legal.terms.intro || '')}</textarea></div>
      <div class="full"><label class="form-label">Body</label><textarea name="termsBody" class="form-control" rows="10">${escapeHtml(legal.terms.body || '')}</textarea></div>
      <div class="full d-flex justify-content-end">
        <button class="ac-btn" type="submit">Save Legal Pages</button>
      </div>
    </div>`;

  authForm.innerHTML = `
    <div class="admin-form-grid">
      <div class="full">
        <label class="form-label">Admin Email</label>
        <input name="email" class="form-control" type="email" value="${escapeHtml(authSettings?.email || '')}" required />
      </div>
      <div>
        <label class="form-label">Current Password</label>
        <input name="currentPassword" class="form-control" type="password" autocomplete="current-password" required />
      </div>
      <div>
        <label class="form-label">New Password</label>
        <input name="newPassword" class="form-control" type="password" autocomplete="new-password" />
        <div class="admin-helper mt-1">Leave blank to keep current password.</div>
      </div>
      <div class="full">
        <label class="form-label">Confirm New Password</label>
        <input name="confirmPassword" class="form-control" type="password" autocomplete="new-password" />
      </div>
      <div class="full d-flex justify-content-end">
        <button class="ac-btn" type="submit">Save Access Settings</button>
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
      <div class="admin-form-grid">
        <div><label class="form-label">Group</label><select name="groupName" class="form-select">
          ${['hero_cta', 'professional', 'social']
            .map((value) => `<option value="${value}" ${item?.groupName === value ? 'selected' : ''}>${value}</option>`)
            .join('')}
        </select></div>
        <div><label class="form-label">Slot Key</label><input name="slotKey" class="form-control" value="${escapeHtml(item?.slotKey || '')}" /></div>
        <div><label class="form-label">Label</label><input name="label" class="form-control" value="${escapeHtml(item?.label || '')}" required /></div>
        <div><label class="form-label">Href</label><input name="href" class="form-control" value="${escapeHtml(item?.href || '')}" required /></div>
        <div><label class="form-label">Icon</label><input name="icon" class="form-control" value="${escapeHtml(item?.icon || '')}" /></div>
        <div><label class="form-label">Style</label><input name="style" class="form-control" value="${escapeHtml(item?.style || '')}" /></div>
        <div><label class="form-label">Sort Order</label><input name="sortOrder" class="form-control" type="number" min="0" max="999" value="${escapeHtml(item?.sortOrder ?? 0)}" /></div>
        <div><label class="form-label">Visible</label><select name="visible" class="form-select"><option value="true" ${item?.visible !== false ? 'selected' : ''}>Yes</option><option value="false" ${item?.visible === false ? 'selected' : ''}>No</option></select></div>
        <div class="full d-flex justify-content-end">
          <button class="ac-btn" type="submit">${item ? 'Save Link' : 'Create Link'}</button>
        </div>
      </div>`;
  }

  if (kind === 'speaking') {
    title.textContent = item ? 'Edit Speaking Item' : 'Add Speaking Item';
    form.innerHTML = `
      <div class="admin-form-grid">
        <div><label class="form-label">Type</label><select name="type" class="form-select">
          ${['upcoming_conference', 'speaking_engagement', 'past_appearance']
            .map((value) => `<option value="${value}" ${item?.type === value ? 'selected' : ''}>${value}</option>`)
            .join('')}
        </select></div>
        <div><label class="form-label">Date</label><input name="date" class="form-control" type="date" value="${escapeHtml(item?.date || '')}" required /></div>
        <div><label class="form-label">Display Date</label><input name="displayDate" class="form-control" value="${escapeHtml(item?.displayDate || '')}" /></div>
        <div><label class="form-label">City</label><input name="city" class="form-control" value="${escapeHtml(item?.city || '')}" /></div>
        <div><label class="form-label">Venue</label><input name="venue" class="form-control" value="${escapeHtml(item?.venue || '')}" /></div>
        <div><label class="form-label">Venue Address</label><input name="venueAddress" class="form-control" value="${escapeHtml(item?.venueAddress || '')}" /></div>
        <div class="full"><label class="form-label">Venue Map URL</label><input name="venueMapUrl" class="form-control" value="${escapeHtml(item?.venueMapUrl || '')}" /></div>
        <div class="full"><label class="form-label">Talk Title</label><input name="talkTitle" class="form-control" value="${escapeHtml(item?.talkTitle || '')}" required /></div>
        <div class="full"><label class="form-label">Topic</label><textarea name="topic" class="form-control" rows="4">${escapeHtml(item?.topic || '')}</textarea></div>
        <div class="full d-flex justify-content-end">
          <button class="ac-btn" type="submit">${item ? 'Save Speaking Item' : 'Create Speaking Item'}</button>
        </div>
      </div>`;
  }

  editModal.show();
}

function bindGlobalEvents() {
  document.querySelectorAll('.admin-nav-link').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-link').forEach((entry) => entry.classList.remove('is-active'));
      document.querySelectorAll('.admin-panel').forEach((panel) => panel.classList.remove('is-active'));
      button.classList.add('is-active');
      document.querySelector(`[data-panel="${button.dataset.target}"]`)?.classList.add('is-active');
    });
  });

  document.getElementById('admin-logout').addEventListener('click', async () => {
    await api('/api/admin/auth/logout', { method: 'POST' });
    window.location.replace('/admin/login/');
  });

  document.getElementById('add-link-button').addEventListener('click', () => openEditModal('link'));
  document.getElementById('add-speaking-button').addEventListener('click', () => openEditModal('speaking'));

  document.getElementById('links-content').addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.id;
    if (!id) return;
    if (target.dataset.action === 'edit-link') {
      openEditModal('link', state.links.find((item) => item.id === id));
    }
    if (target.dataset.action === 'delete-link') {
      state.deleteAction = async () => {
        await api(`/api/admin/links/${id}`, { method: 'DELETE' });
        showBanner('success', 'Link deleted.');
        await reloadAll();
      };
      document.getElementById('admin-delete-message').textContent = 'Delete this link? This cannot be undone.';
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
      state.deleteAction = async () => {
        await api(`/api/admin/speaking/${id}`, { method: 'DELETE' });
        showBanner('success', 'Speaking item deleted.');
        await reloadAll();
      };
      document.getElementById('admin-delete-message').textContent = 'Delete this speaking item? This cannot be undone.';
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
    const payload =
      state.editing.kind === 'link'
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

    const isLink = state.editing.kind === 'link';
    const path = isLink ? '/api/admin/links' : '/api/admin/speaking';
    const method = state.editing.item ? 'PATCH' : 'POST';
    const finalPath = state.editing.item ? `${path}/${state.editing.item.id}` : path;

    await api(finalPath, {
      method,
      body: JSON.stringify(payload)
    });

    showBanner('success', `${isLink ? 'Link' : 'Speaking item'} saved.`);
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
    showBanner('success', 'Site content saved.');
    await reloadAll();
  });

  document.getElementById('about-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = buildAboutPayload(event.currentTarget);
    await api('/api/admin/blocks/about', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    showBanner('success', 'About content saved.');
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
    showBanner('success', 'Admin access updated.');
    await reloadAll();
  });
}

async function reloadAll() {
  const [links, speaking, site, about, legal, analytics, authSettings] = await Promise.all([
    api('/api/admin/links'),
    api('/api/admin/speaking'),
    api('/api/admin/blocks/site'),
    api('/api/admin/blocks/about'),
    api('/api/admin/blocks/legal'),
    api('/api/admin/analytics'),
    api('/api/admin/auth-settings')
  ]);

  state.links = links.items || [];
  state.speaking = speaking.items || [];
  state.site = site;
  state.about = about;
  state.legal = legal;
  state.analytics = analytics;
  state.authSettings = authSettings;

  renderOverview();
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
  await reloadAll();
}

bootstrap().catch((error) => {
  console.error(error);
  showBanner('danger', error instanceof Error ? error.message : 'Unable to load admin.');
});
