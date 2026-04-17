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

function editableAttrs(ctx, path) {
  if (!ctx || !ctx.editable) return '';
  const id = ctx.blockId ? ` data-block-id="${escapeHtml(ctx.blockId)}"` : '';
  return ` contenteditable="true" spellcheck="true" data-edit="${escapeHtml(path)}"${id}`;
}

function placeholderAttr(ctx, text) {
  if (!ctx || !ctx.editable || !text) return '';
  return ` data-placeholder="${escapeHtml(text)}"`;
}

const PLACEHOLDERS = {
  heroHeading: 'Add your big headline here',
  heroSubheading: 'Write a short sentence about this page.',
  heroButton: 'Button text',
  textHeading: 'Optional heading',
  textBody: 'Click here to write…',
  ctaHeading: 'Your call to action',
  ctaDescription: 'Why should people act now?',
  ctaButton: 'Button text',
  imageCaption: 'Optional caption',
  cardTitle: 'Card title',
  cardDescription: 'A short description for this card.'
};

const BLOCK_RENDERERS = {
  hero(data, ctx) {
    const img = resolveImg(data.image);
    const hasButton = (data.buttonText && data.buttonHref) || ctx?.editable;
    const heading = data.heading || '';
    const subheading = data.subheading || '';
    const buttonText = data.buttonText || '';
    return `
      <section class="block-hero" ${img ? `style="background-image:url('${escapeHtml(img)}')"` : ''}>
        <div class="block-hero-overlay">
          <div class="container block-hero-inner">
            ${(heading || ctx?.editable) ? `<h1 class="block-hero-heading"${editableAttrs(ctx, 'heading')}${placeholderAttr(ctx, PLACEHOLDERS.heroHeading)}>${escapeHtml(heading)}</h1>` : ''}
            ${(subheading || ctx?.editable) ? `<p class="block-hero-sub"${editableAttrs(ctx, 'subheading')}${placeholderAttr(ctx, PLACEHOLDERS.heroSubheading)}>${escapeHtml(subheading)}</p>` : ''}
            ${hasButton ? `<a class="ac-btn" href="${escapeHtml(safeHref(data.buttonHref || '#'))}"${editableAttrs(ctx, 'buttonText')}${placeholderAttr(ctx, PLACEHOLDERS.heroButton)} data-empty="${buttonText ? 'false' : 'true'}">${escapeHtml(buttonText)}</a>` : ''}
          </div>
        </div>
      </section>`;
  },

  text(data, ctx) {
    const heading = data.heading || '';
    const body = data.body || '';
    const bodyHtml = typeof data.bodyHtml === 'string' ? data.bodyHtml : '';
    const bodyField = bodyHtml ? 'bodyHtml' : 'body';
    const bodyInner = bodyHtml
      ? bodyHtml
      : (body ? renderParagraphs(body) : (ctx?.editable ? `<p class="block-placeholder">${escapeHtml(PLACEHOLDERS.textBody)}</p>` : ''));
    return `
      <section class="block-text">
        <div class="container block-text-inner">
          ${(heading || ctx?.editable) ? `<h2 class="block-text-heading"${editableAttrs(ctx, 'heading')}${placeholderAttr(ctx, PLACEHOLDERS.textHeading)}>${escapeHtml(heading)}</h2>` : ''}
          <div class="block-text-body"${editableAttrs(ctx, bodyField)}${placeholderAttr(ctx, PLACEHOLDERS.textBody)}>${bodyInner}</div>
        </div>
      </section>`;
  },

  image(data, ctx) {
    const src = resolveImg(data.src);
    if (!src && !ctx?.editable) return '';
    const img = src
      ? `<img class="block-image-img" src="${escapeHtml(src)}" alt="${escapeHtml(data.alt || '')}" loading="lazy" />`
      : `<div class="block-image-empty">Click “Change image” on the right to add one.</div>`;
    const wrapped = data.href ? `<a href="${escapeHtml(safeHref(data.href))}">${img}</a>` : img;
    return `
      <figure class="block-image">
        <div class="container">
          ${wrapped}
          ${(data.caption || ctx?.editable) ? `<figcaption class="block-image-caption"${editableAttrs(ctx, 'caption')}${placeholderAttr(ctx, PLACEHOLDERS.imageCaption)}>${escapeHtml(data.caption || '')}</figcaption>` : ''}
        </div>
      </figure>`;
  },

  gallery(data, ctx) {
    const images = data.images || [];
    if (!images.length) {
      if (!ctx?.editable) return '';
      return `
        <section class="block-gallery">
          <div class="container">
            <div class="block-gallery-empty">No images yet — add some from the right-hand panel.</div>
          </div>
        </section>`;
    }
    return `
      <section class="block-gallery">
        <div class="container">
          <div class="block-gallery-grid">
            ${images.map((img, i) => {
              const src = resolveImg(img.src);
              if (!src) {
                return ctx?.editable
                  ? `<figure class="block-gallery-item block-gallery-empty-item">Image ${i + 1} — click to set</figure>`
                  : '';
              }
              return `
                <figure class="block-gallery-item">
                  <img src="${escapeHtml(src)}" alt="${escapeHtml(img.alt || '')}" loading="lazy" />
                  ${(img.caption || ctx?.editable) ? `<figcaption${editableAttrs(ctx, `images.${i}.caption`)}${placeholderAttr(ctx, 'Caption')}>${escapeHtml(img.caption || '')}</figcaption>` : ''}
                </figure>`;
            }).join('')}
          </div>
        </div>
      </section>`;
  },

  cards(data, ctx) {
    const cards = data.cards || [];
    if (!cards.length) {
      if (!ctx?.editable) return '';
      return `
        <section class="block-cards">
          <div class="container">
            <div class="block-cards-empty">No cards yet — add some from the right-hand panel.</div>
          </div>
        </section>`;
    }
    return `
      <section class="block-cards">
        <div class="container">
          <div class="block-cards-grid">
            ${cards.map((card, i) => {
              const img = resolveImg(card.image);
              return `
                <article class="block-card card-item">
                  ${img ? `<img class="block-card-img" src="${escapeHtml(img)}" alt="" loading="lazy" />` : (ctx?.editable ? `<div class="block-card-img-empty">No photo yet</div>` : '')}
                  <div class="block-card-body">
                    ${(card.title || ctx?.editable) ? `<h3 class="block-card-title"${editableAttrs(ctx, `cards.${i}.title`)}${placeholderAttr(ctx, PLACEHOLDERS.cardTitle)}>${escapeHtml(card.title || '')}</h3>` : ''}
                    ${(card.description || ctx?.editable) ? `<p class="block-card-desc"${editableAttrs(ctx, `cards.${i}.description`)}${placeholderAttr(ctx, PLACEHOLDERS.cardDescription)}>${escapeHtml(card.description || '')}</p>` : ''}
                    ${card.href ? `<a class="block-card-link" href="${escapeHtml(safeHref(card.href))}">Learn more →</a>` : ''}
                  </div>
                </article>`;
            }).join('')}
          </div>
        </div>
      </section>`;
  },

  cta(data, ctx) {
    const hasButton = (data.buttonText && data.buttonHref) || ctx?.editable;
    const heading = data.heading || '';
    const description = data.description || '';
    const buttonText = data.buttonText || '';
    return `
      <section class="block-cta">
        <div class="container block-cta-inner">
          ${(heading || ctx?.editable) ? `<h2 class="block-cta-heading"${editableAttrs(ctx, 'heading')}${placeholderAttr(ctx, PLACEHOLDERS.ctaHeading)}>${escapeHtml(heading)}</h2>` : ''}
          ${(description || ctx?.editable) ? `<p class="block-cta-desc"${editableAttrs(ctx, 'description')}${placeholderAttr(ctx, PLACEHOLDERS.ctaDescription)}>${escapeHtml(description)}</p>` : ''}
          ${hasButton ? `<a class="ac-btn" href="${escapeHtml(safeHref(data.buttonHref || '#'))}"${editableAttrs(ctx, 'buttonText')}${placeholderAttr(ctx, PLACEHOLDERS.ctaButton)} data-empty="${buttonText ? 'false' : 'true'}">${escapeHtml(buttonText)}</a>` : ''}
        </div>
      </section>`;
  },

  divider(data) {
    const size = data.size || 'medium';
    return `<hr class="block-divider block-divider-${escapeHtml(size)}" />`;
  }
};

export function renderBlocks(blocks, opts = {}) {
  const editable = !!opts.editable;
  const activeId = opts.activeId || null;
  return blocks
    .map((block) => {
      const renderer = BLOCK_RENDERERS[block.type];
      if (!renderer) return '';
      const ctx = editable ? { editable: true, blockId: block.id } : null;
      const inner = renderer(block.data || {}, ctx);
      if (!editable) return inner;
      const classes = ['editor-block-wrap'];
      if (block.id === activeId) classes.push('is-active');
      return `<div class="${classes.join(' ')}" data-block-wrap="${escapeHtml(block.id)}" data-block-type="${escapeHtml(block.type)}" tabindex="0">${inner}</div>`;
    })
    .join('');
}

export function getBlockTypes() {
  return Object.keys(BLOCK_RENDERERS);
}
