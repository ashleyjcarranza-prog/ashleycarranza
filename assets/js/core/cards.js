import {
  escapeHtml,
  formatDisplayDate,
  getProductFallbackImage,
  getProductImageSource,
  getProductLinks,
  safeHref
} from './format.js';
import { assetUrl, withBasePath } from './site.js';

export function renderEmptyState(message) {
  return `<div class="col-12"><div class="empty-state">${escapeHtml(message)}</div></div>`;
}

// ── Product badges ──

function renderBadges(product) {
  const badges = [];
  if (product.featured) badges.push('<span class="badge-featured">Featured</span>');

  if (product.isNew) {
    badges.push('<span class="badge-new">New</span>');
  } else if (product.publishDate) {
    const published = new Date(product.publishDate);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    if (published >= cutoff) badges.push('<span class="badge-new">New</span>');
  }

  return badges.length ? `<div class="d-flex gap-1 mb-2">${badges.join('')}</div>` : '';
}

// ── Product buy links ──

function renderProductBuyLinks(product) {
  return getProductLinks(product)
    .map((link) => {
      const cls = link.style === 'primary' ? 'ac-btn' : 'btn-outline';
      return `<a class="${cls} btn-sm" href="${escapeHtml(safeHref(link.href))}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;
    })
    .join('\n          ');
}

function getPrimaryProductLink(product) {
  return getProductLinks(product)[0] || null;
}

// ── Product image resolution ──

function resolveProductImage(product) {
  const fallback = withBasePath(getProductFallbackImage(product));
  const image = assetUrl(getProductImageSource(product), fallback);
  return { image, fallback };
}

function getPostDateLabel(post) {
  return post.displayDate || formatDisplayDate(post.date);
}

function isPastEvent(event) {
  const eventDate = new Date(`${event.date}T00:00:00`);
  if (Number.isNaN(eventDate.getTime())) return event.type === 'past_appearance';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

// ── Product cards ──

export function renderPreviewProductCard(product, index = 0) {
  const title = product.title || 'Untitled Work';
  const category = product.category || 'Work';
  const description = product.description || 'More details coming soon.';
  const { image, fallback } = resolveProductImage(product);
  const primaryLink = getPrimaryProductLink(product);
  const imageMarkup = primaryLink
    ? `<a class="product-media-link" href="${escapeHtml(safeHref(primaryLink.href))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(primaryLink.label)}: ${escapeHtml(title)}">
        <img class="product-placeholder" src="${escapeHtml(image)}" alt="Cover image for ${escapeHtml(
          title
        )}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';" />
      </a>`
    : `<img class="product-placeholder" src="${escapeHtml(image)}" alt="Cover image for ${escapeHtml(
        title
      )}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';" />`;
  const titleMarkup = primaryLink
    ? `<h3 class="h5 mb-0"><a class="product-title-link" href="${escapeHtml(safeHref(primaryLink.href))}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        title
      )}</a></h3>`
    : `<h3 class="h5 mb-0">${escapeHtml(title)}</h3>`;
  const actions = primaryLink
    ? `<div class="d-flex gap-2 flex-wrap mt-auto">
          <a class="ac-btn btn-sm" href="${escapeHtml(safeHref(primaryLink.href))}" target="_blank" rel="noopener noreferrer">${escapeHtml(primaryLink.label)}</a>
          <button class="btn-outline btn-sm product-detail-trigger" data-product-id="${escapeHtml(product.id || '')}">Details</button>
        </div>`
    : `<button class="btn-outline btn-sm mt-auto product-detail-trigger" data-product-id="${escapeHtml(product.id || '')}">See details</button>`;

  return `
    <div class="col-md-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 70, 140)}">
      <article class="card-item preview-card p-3 h-100 d-flex flex-column">
        ${imageMarkup}
        ${renderBadges(product)}
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          ${titleMarkup}
          <span class="badge-category">${escapeHtml(category)}</span>
        </div>
        <p class="text-muted-ui mb-3">${escapeHtml(description)}</p>
        ${actions}
      </article>
    </div>
  `;
}

export function renderProductCard(product, index = 0) {
  const title = product.title || 'Untitled Work';
  const category = product.category || 'Work';
  const description = product.description || 'More details coming soon.';
  const { image, fallback } = resolveProductImage(product);
  const primaryLink = getPrimaryProductLink(product);
  const imageMarkup = primaryLink
    ? `<a class="product-media-link" href="${escapeHtml(safeHref(primaryLink.href))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(primaryLink.label)}: ${escapeHtml(title)}">
        <img class="product-placeholder mb-3" src="${escapeHtml(image)}" alt="Cover image for ${escapeHtml(
          title
        )}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';" />
      </a>`
    : `<img class="product-placeholder mb-3" src="${escapeHtml(image)}" alt="Cover image for ${escapeHtml(
        title
      )}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';" />`;
  const titleMarkup = primaryLink
    ? `<h2 class="h5 mb-0"><a class="product-title-link" href="${escapeHtml(safeHref(primaryLink.href))}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        title
      )}</a></h2>`
    : `<h2 class="h5 mb-0">${escapeHtml(title)}</h2>`;

  return `
    <div class="col-md-6 col-xl-4" data-aos="fade-up" data-aos-delay="${Math.min(index * 60, 240)}">
      <article class="card-item p-3 h-100 d-flex flex-column">
        ${imageMarkup}
        ${renderBadges(product)}
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          ${titleMarkup}
          <span class="badge-category">${escapeHtml(category)}</span>
        </div>
        <p class="text-muted-ui">${escapeHtml(description)}</p>
        <div class="d-flex gap-2 flex-wrap mt-auto">
          ${renderProductBuyLinks(product)}
          <button class="btn-outline btn-sm product-detail-trigger" data-product-id="${escapeHtml(product.id || '')}">Details</button>
        </div>
      </article>
    </div>
  `;
}

// ── Event cards ──

export function renderPreviewEventCard(event, index = 0) {
  const talkTitle = event.talkTitle || 'Upcoming Event';
  const venue = event.venue || 'Venue to be announced';
  const city = event.city || '';
  const displayDate = event.displayDate || formatDisplayDate(event.date);

  return `
    <div class="col-md-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 70, 140)}">
      <article class="card-item p-3 h-100 d-flex flex-column">
        <p class="event-date mb-2"><i class="bi bi-calendar-event"></i>${escapeHtml(displayDate)}</p>
        <h3 class="h5 mb-2">${escapeHtml(talkTitle)}</h3>
        <p class="event-meta">${escapeHtml([venue, city].filter(Boolean).join(', '))}</p>
        <a class="btn-outline btn-sm mt-auto" href="${withBasePath('/speaking-features/')}">View details</a>
      </article>
    </div>
  `;
}

export function toGoogleCalendarUrl(event, timezoneLabel) {
  if (event.googleCalendarUrl) return safeHref(event.googleCalendarUrl);

  const start = new Date(`${event.date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const fmt = (value) => value.toISOString().slice(0, 10).replace(/-/g, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.talkTitle || 'Event',
    dates: `${fmt(start)}/${fmt(end)}`,
    location: [event.venue, event.city].filter(Boolean).join(', '),
    details: [event.topic, event.time, timezoneLabel].filter(Boolean).join(' / ')
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function renderEventCard(event, index = 0, timezoneLabel = '') {
  const talkTitle = event.talkTitle || 'Upcoming Event';
  const venue = event.venue || 'Venue to be announced';
  const city = event.city || '';
  const topic = event.topic || 'Details to be announced';
  const venueHref = event.venueMapUrl ? safeHref(event.venueMapUrl) : '';
  const displayDate = event.displayDate || formatDisplayDate(event.date);
  const actions = [];

  if (venueHref) {
    actions.push(`<a class="btn-outline btn-sm" href="${escapeHtml(venueHref)}" target="_blank" rel="noopener noreferrer">Open Venue</a>`);
  }

  if (!isPastEvent(event)) {
    actions.push(
      `<a class="ac-btn btn-sm" href="${escapeHtml(safeHref(toGoogleCalendarUrl(event, timezoneLabel)))}" target="_blank" rel="noopener noreferrer">Add to Calendar</a>`
    );
  }

  return `
    <div class="col-lg-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 60, 240)}">
      <article class="card-item p-3 h-100 d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          <h2 class="h5 mb-0">${escapeHtml(talkTitle)}</h2>
          <span class="badge-category">${escapeHtml(event.typeLabel || event.type)}</span>
        </div>
        <p class="mb-2"><strong>Date:</strong> ${escapeHtml(displayDate)}${
          event.time ? ` &middot; ${escapeHtml(event.time)}` : ''
        }</p>
        <p class="mb-2"><strong>Venue:</strong> ${escapeHtml([venue, city].filter(Boolean).join(', '))}</p>
        <p class="mb-3"><strong>Topic:</strong> ${escapeHtml(topic)}</p>
        ${actions.length ? `<div class="d-flex gap-2 flex-wrap mt-auto">${actions.join('')}</div>` : ''}
      </article>
    </div>
  `;
}

// ── Post cards ──

export function renderPreviewPostCard(post, index = 0) {
  return `
    <div class="col-md-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 70, 140)}">
      <article class="card-item p-3 h-100 d-flex flex-column">
        <p class="event-date mb-2"><i class="bi bi-calendar3 me-1"></i>${escapeHtml(getPostDateLabel(post))}</p>
        <h3 class="h5 mb-2">${escapeHtml(post.title)}</h3>
        <p class="text-muted-ui mb-3">${escapeHtml(post.excerpt)}</p>
        <div class="d-flex justify-content-between align-items-center mt-auto">
          <span class="badge-category">${escapeHtml(post.category)}</span>
          <a class="btn-outline btn-sm" href="${withBasePath('/news/')}?post=${escapeHtml(post.id)}">Read more</a>
        </div>
      </article>
    </div>
  `;
}

export function renderPostCard(post, index = 0) {
  return `
    <div class="col-md-6 col-xl-4" data-aos="fade-up" data-aos-delay="${Math.min(index * 60, 240)}">
      <article class="card-item p-3 h-100 d-flex flex-column">
        <p class="event-date mb-2"><i class="bi bi-calendar3 me-1"></i>${escapeHtml(getPostDateLabel(post))}</p>
        <h2 class="h5 mb-2">${escapeHtml(post.title)}</h2>
        <p class="text-muted-ui mb-3">${escapeHtml(post.excerpt)}</p>
        <div class="d-flex justify-content-between align-items-center mt-auto">
          <span class="badge-category">${escapeHtml(post.category)}</span>
          <a class="btn-outline btn-sm" href="${withBasePath('/news/')}?post=${escapeHtml(post.id)}">Read more</a>
        </div>
      </article>
    </div>
  `;
}
