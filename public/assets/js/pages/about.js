import { escapeHtml, safeHref } from '../core/format.js';
import { getJson, assetUrl, withBasePath } from '../core/site.js';
import { renderSkeleton } from '../core/skeleton.js';
import { refreshAnimations } from '../core/ui.js';

function renderBio(data) {
  const portrait = assetUrl(data.portrait) || withBasePath('/assets/img/headshot.webp');
  const paragraphs = (data.bio || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const tagline = data.tagline ? `<p class="section-label mb-2">${escapeHtml(data.tagline)}</p>` : '';
  const location = data.location
    ? `<p class="text-muted-ui mb-3"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(data.location)}</p>`
    : '';

  return `
    <div class="row g-5 align-items-start mb-5">
      <div class="col-lg-4" data-aos="fade-up" data-aos-delay="80">
        <img class="profile-placeholder w-100" src="${escapeHtml(portrait)}" alt="Ashley Jae Carranza" loading="lazy" onerror="this.onerror=null;this.src='${withBasePath('/assets/img/ashley-portrait.svg')}';" />
      </div>
      <div class="col-lg-8" data-aos="fade-up" data-aos-delay="120">
        ${tagline}
        ${location}
        <div class="bio-text prose">${paragraphs}</div>
      </div>
    </div>`;
}

function renderCurrentWork(data) {
  if (!data.currentWork && !data.secondaryImage) return '';

  const eyebrow = data.currentWork?.eyebrow ? `<p class="section-label mb-2">${escapeHtml(data.currentWork.eyebrow)}</p>` : '';
  const heading = data.currentWork?.heading ? `<h2 class="section-title mb-3">${escapeHtml(data.currentWork.heading)}</h2>` : '';
  const description = data.currentWork?.description
    ? `<p class="text-muted-ui mb-0">${escapeHtml(data.currentWork.description)}</p>`
    : '';
  const image = data.secondaryImage
    ? `<div class="col-lg-5" data-aos="fade-up"><img class="profile-placeholder w-100 about-secondary-image" src="${escapeHtml(
        assetUrl(data.secondaryImage)
      )}" alt="${escapeHtml(data.secondaryImageAlt || 'Ashley Jae Carranza')}" loading="lazy" /></div>`
    : '';

  return `
    <section class="section-divider">
      <div class="row g-5 align-items-center">
        ${image}
        <div class="${data.secondaryImage ? 'col-lg-7' : 'col-12'}" data-aos="fade-up" data-aos-delay="80">
          <div class="editorial-panel">
            ${eyebrow}
            ${heading}
            ${description}
          </div>
        </div>
      </div>
    </section>`;
}

function renderListCard(title, items) {
  if (!items || !items.length) return '';

  return `
    <div class="topic-card h-100">
      <h2 class="h4 mb-3">${escapeHtml(title)}</h2>
      <ul class="list-clean mb-0">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>`;
}

function renderCredentials(data) {
  const editing = renderListCard('Editing Experience', data.editingExperience);
  const education = renderListCard('Education', data.education);
  const professionalLinks = (data.professionalLinks || []).length
    ? `
      <div class="topic-card h-100">
        <h2 class="h4 mb-3">Professional Links</h2>
        <div class="d-flex flex-wrap gap-2">
          ${data.professionalLinks
            .map(
              (link) =>
                `<a class="btn-outline btn-sm" href="${withBasePath(safeHref(link.href, '#'))}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  if (!editing && !education && !professionalLinks) return '';

  return `
    <section class="section-divider">
      <div class="row g-4">
        ${editing ? `<div class="col-lg-6 col-xl-4" data-aos="fade-up">${editing}</div>` : ''}
        ${education ? `<div class="col-lg-6 col-xl-4" data-aos="fade-up" data-aos-delay="60">${education}</div>` : ''}
        ${professionalLinks ? `<div class="col-lg-6 col-xl-4" data-aos="fade-up" data-aos-delay="120">${professionalLinks}</div>` : ''}
      </div>
    </section>`;
}

function renderTopics(topics) {
  if (!topics || !topics.length) return '';

  const cards = topics
    .map(
      (t) => `
      <div class="col-md-6 col-lg-4">
        <div class="topic-card h-100">
          <h3 class="h5 mb-2">${escapeHtml(t.title)}</h3>
          <p class="text-muted-ui mb-0">${escapeHtml(t.description)}</p>
        </div>
      </div>`
    )
    .join('');

  return `
    <h2 class="section-title mb-3" data-aos="fade-up">What I Speak About</h2>
    <p class="text-muted-ui section-copy mb-4" data-aos="fade-up">I speak at conferences, schools, and community events on topics I care about.</p>
    <div class="row g-4" data-aos="fade-up">${cards}</div>`;
}

function renderCTA(cta) {
  if (!cta) return '';

  return `
    <div class="row g-4 align-items-center" data-aos="fade-up">
      <div class="col-lg-8">
        <h2 class="section-title mb-2">${escapeHtml(cta.heading)}</h2>
        <p class="text-muted-ui mb-0">${escapeHtml(cta.description)}</p>
      </div>
      <div class="col-lg-4 text-lg-end">
        <a class="ac-btn btn-lg" href="${withBasePath(safeHref(cta.linkHref, '/contact/'))}"><i class="bi bi-envelope me-1"></i> ${escapeHtml(cta.linkText)}</a>
      </div>
    </div>`;
}

export async function initAboutPage() {
  const bioEl = document.getElementById('about-bio');
  const topicsEl = document.getElementById('about-topics');
  const ctaEl = document.getElementById('about-cta');

  // Show skeletons
  if (bioEl) bioEl.innerHTML = renderSkeleton('product-preview', 1);
  if (topicsEl) topicsEl.innerHTML = renderSkeleton('post', 3);

  try {
    const data = await getJson('/data/about.json');
    if (bioEl) {
      bioEl.innerHTML = [renderBio(data), renderCurrentWork(data), renderCredentials(data)].filter(Boolean).join('');
    }
    if (topicsEl) topicsEl.innerHTML = renderTopics(data.speakingTopics);
    if (ctaEl) ctaEl.innerHTML = renderCTA(data.cta);
    refreshAnimations();
  } catch {
    if (bioEl) bioEl.innerHTML = '<p class="text-muted-ui">Unable to load content.</p>';
  }
}
