import {
  escapeHtml,
  formatDisplayDate,
  getProductFallbackImage,
  getProductImageSource,
  safeHref
} from './format.js';
import { assetUrl, withBasePath } from './site.js';

export function renderEmptyState(message) {
  return `<div class="col-12"><div class="empty-state">${escapeHtml(message)}</div></div>`;
}

function renderProductBuyLinks(product) {
  const links = [];
  if (product.amazonUrl) {
    links.push(
      `<a class="ac-btn btn-sm" href="${escapeHtml(safeHref(product.amazonUrl))}" target="_blank" rel="noopener noreferrer">View on Amazon</a>`
    );
  }
  if (product.tptUrl) {
    links.push(
      `<a class="${product.amazonUrl ? 'btn-outline' : 'ac-btn'} btn-sm" href="${escapeHtml(
        safeHref(product.tptUrl)
      )}" target="_blank" rel="noopener noreferrer">View on TPT</a>`
    );
  }
  return links.join('\n          ');
}

function resolveProductImage(product) {
  const fallback = withBasePath(getProductFallbackImage(product));
  const image = assetUrl(getProductImageSource(product), fallback);
  return {
    image,
    fallback
  };
}

export function renderPreviewProductCard(product, index = 0) {
  const title = product.title || 'Untitled Work';
  const category = product.category || 'Work';
  const description = product.description || 'More details coming soon.';
  const { image, fallback } = resolveProductImage(product);

  return `
    <div class="col-md-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 70, 140)}">
      <article class="card-item preview-card p-3 h-100 d-flex flex-column">
        <img class="product-placeholder" src="${escapeHtml(image)}" alt="Cover image for ${escapeHtml(
          title
        )}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';" />
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          <h3 class="h5 mb-0">${escapeHtml(title)}</h3>
          <span class="badge-category">${escapeHtml(category)}</span>
        </div>
        <p class="text-muted-ui mb-3">${escapeHtml(description)}</p>
        <a class="btn-outline btn-sm mt-auto" href="${withBasePath('/my-work/')}">See details</a>
      </article>
    </div>
  `;
}

export function renderProductCard(product, index = 0) {
  const title = product.title || 'Untitled Work';
  const category = product.category || 'Work';
  const description = product.description || 'More details coming soon.';
  const { image, fallback } = resolveProductImage(product);

  return `
    <div class="col-md-6 col-xl-4" data-aos="fade-up" data-aos-delay="${Math.min(index * 60, 240)}">
      <article class="card-item p-3 h-100 d-flex flex-column">
        <img class="product-placeholder mb-3" src="${escapeHtml(image)}" alt="Cover image for ${escapeHtml(
          title
        )}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';" />
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          <h2 class="h5 mb-0">${escapeHtml(title)}</h2>
          <span class="badge-category">${escapeHtml(category)}</span>
        </div>
        <p class="text-muted-ui">${escapeHtml(description)}</p>
        <div class="d-flex gap-2 flex-wrap mt-auto">
          ${renderProductBuyLinks(product)}
        </div>
      </article>
    </div>
  `;
}

export function renderPreviewEventCard(event, index = 0) {
  const talkTitle = event.talkTitle || 'Upcoming Event';
  const venue = event.venue || 'Venue to be announced';
  const city = event.city || '';

  return `
    <div class="col-md-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 70, 140)}">
      <article class="card-item p-3 h-100 d-flex flex-column">
        <p class="event-date mb-2"><i class="bi bi-calendar-event"></i>${escapeHtml(formatDisplayDate(event.date))}</p>
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

  return `
    <div class="col-lg-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 60, 240)}">
      <article class="card-item p-3 h-100 d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          <h2 class="h5 mb-0">${escapeHtml(talkTitle)}</h2>
          <span class="badge-category">${escapeHtml(event.typeLabel || event.type)}</span>
        </div>
        <p class="mb-2"><strong>Date:</strong> ${escapeHtml(formatDisplayDate(event.date))}${
          event.time ? ` &middot; ${escapeHtml(event.time)}` : ''
        }</p>
        <p class="mb-2"><strong>Venue:</strong> ${escapeHtml([venue, city].filter(Boolean).join(', '))}</p>
        <p class="mb-3"><strong>Topic:</strong> ${escapeHtml(topic)}</p>
        <div class="d-flex gap-2 flex-wrap mt-auto">
          ${venueHref ? `<a class="btn-outline btn-sm" href="${escapeHtml(venueHref)}" target="_blank" rel="noopener noreferrer">Open Venue</a>` : ''}
          <a class="ac-btn btn-sm" href="${escapeHtml(safeHref(toGoogleCalendarUrl(event, timezoneLabel)))}" target="_blank" rel="noopener noreferrer">Add to Calendar</a>
        </div>
      </article>
    </div>
  `;
}
