import { escapeHtml } from './format.js';

export function renderTestimonialSlide(testimonial, active = false) {
  return `
    <div class="carousel-item${active ? ' active' : ''}">
      <div class="testimonial-slide text-center px-3 px-md-5 py-4">
        <blockquote class="testimonial-quote mb-3">
          <p>&ldquo;${escapeHtml(testimonial.quote)}&rdquo;</p>
        </blockquote>
        <div class="testimonial-author">
          <strong>${escapeHtml(testimonial.author)}</strong>
          <span class="d-block text-muted-ui">${escapeHtml(testimonial.role)}</span>
        </div>
      </div>
    </div>`;
}

export function renderTestimonialCarousel(testimonials, id = 'testimonialCarousel') {
  if (!testimonials || testimonials.length === 0) return '';

  const slides = testimonials
    .map((t, i) => renderTestimonialSlide(t, i === 0))
    .join('');

  const indicators = testimonials
    .map((_, i) => `<button type="button" data-bs-target="#${id}" data-bs-slide-to="${i}"${i === 0 ? ' class="active" aria-current="true"' : ''} aria-label="Testimonial ${i + 1}"></button>`)
    .join('');

  return `
    <div id="${id}" class="carousel slide testimonial-carousel" data-bs-ride="carousel" data-bs-interval="6000">
      <div class="carousel-indicators">${indicators}</div>
      <div class="carousel-inner">${slides}</div>
      <button class="carousel-control-prev" type="button" data-bs-target="#${id}" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#${id}" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
      </button>
    </div>`;
}
