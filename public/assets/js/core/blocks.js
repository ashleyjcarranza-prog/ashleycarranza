import { escapeHtml, safeHref } from './format.js';
import { assetUrl } from './site.js';

function resolveImg(src, fallback = '') {
  if (!src) return fallback;
  return assetUrl(src, fallback);
}

function renderParagraphs(text) {
  if (!text) return '';
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
}

const BLOCK_RENDERERS = {
  hero(data) {
    const img = resolveImg(data.image);
    const hasButton = data.buttonText && data.buttonHref;
    return `
      <section class="block-hero" ${img ? `style="background-image:url('${escapeHtml(img)}')"` : ''}>
        <div class="block-hero-overlay">
          <div class="container block-hero-inner">
            ${data.heading ? `<h1 class="block-hero-heading">${escapeHtml(data.heading)}</h1>` : ''}
            ${data.subheading ? `<p class="block-hero-sub">${escapeHtml(data.subheading)}</p>` : ''}
            ${hasButton ? `<a class="ac-btn" href="${escapeHtml(safeHref(data.buttonHref))}">${escapeHtml(data.buttonText)}</a>` : ''}
          </div>
        </div>
      </section>`;
  },

  text(data) {
    return `
      <section class="block-text">
        <div class="container block-text-inner">
          ${data.heading ? `<h2 class="block-text-heading">${escapeHtml(data.heading)}</h2>` : ''}
          <div class="block-text-body">${renderParagraphs(data.body)}</div>
        </div>
      </section>`;
  },

  image(data) {
    const src = resolveImg(data.src);
    if (!src) return '';
    const img = `<img class="block-image-img" src="${escapeHtml(src)}" alt="${escapeHtml(data.alt || '')}" loading="lazy" />`;
    const wrapped = data.href ? `<a href="${escapeHtml(safeHref(data.href))}">${img}</a>` : img;
    return `
      <figure class="block-image">
        <div class="container">
          ${wrapped}
          ${data.caption ? `<figcaption class="block-image-caption">${escapeHtml(data.caption)}</figcaption>` : ''}
        </div>
      </figure>`;
  },

  gallery(data) {
    const images = data.images || [];
    if (!images.length) return '';
    return `
      <section class="block-gallery">
        <div class="container">
          <div class="block-gallery-grid">
            ${images.map((img) => {
              const src = resolveImg(img.src);
              if (!src) return '';
              return `
                <figure class="block-gallery-item">
                  <img src="${escapeHtml(src)}" alt="${escapeHtml(img.alt || '')}" loading="lazy" />
                  ${img.caption ? `<figcaption>${escapeHtml(img.caption)}</figcaption>` : ''}
                </figure>`;
            }).join('')}
          </div>
        </div>
      </section>`;
  },

  cards(data) {
    const cards = data.cards || [];
    if (!cards.length) return '';
    return `
      <section class="block-cards">
        <div class="container">
          <div class="block-cards-grid">
            ${cards.map((card) => {
              const img = resolveImg(card.image);
              return `
                <article class="block-card card-item">
                  ${img ? `<img class="block-card-img" src="${escapeHtml(img)}" alt="" loading="lazy" />` : ''}
                  <div class="block-card-body">
                    ${card.title ? `<h3 class="block-card-title">${escapeHtml(card.title)}</h3>` : ''}
                    ${card.description ? `<p class="block-card-desc">${escapeHtml(card.description)}</p>` : ''}
                    ${card.href ? `<a class="block-card-link" href="${escapeHtml(safeHref(card.href))}">Learn more →</a>` : ''}
                  </div>
                </article>`;
            }).join('')}
          </div>
        </div>
      </section>`;
  },

  cta(data) {
    const hasButton = data.buttonText && data.buttonHref;
    return `
      <section class="block-cta">
        <div class="container block-cta-inner">
          ${data.heading ? `<h2 class="block-cta-heading">${escapeHtml(data.heading)}</h2>` : ''}
          ${data.description ? `<p class="block-cta-desc">${escapeHtml(data.description)}</p>` : ''}
          ${hasButton ? `<a class="ac-btn" href="${escapeHtml(safeHref(data.buttonHref))}">${escapeHtml(data.buttonText)}</a>` : ''}
        </div>
      </section>`;
  },

  divider(data) {
    const size = data.size || 'medium';
    return `<hr class="block-divider block-divider-${escapeHtml(size)}" />`;
  }
};

export function renderBlocks(blocks) {
  return blocks.map((block) => {
    const renderer = BLOCK_RENDERERS[block.type];
    return renderer ? renderer(block.data || {}) : '';
  }).join('');
}
