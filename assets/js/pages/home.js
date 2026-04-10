import { renderEmptyState, renderPreviewEventCard, renderPreviewProductCard, renderPreviewPostCard } from '../core/cards.js';
import { escapeHtml } from '../core/format.js';
import { getJson, withBasePath } from '../core/site.js';
import { renderSkeleton } from '../core/skeleton.js';
import { renderTestimonialCarousel } from '../core/testimonials.js';
import { refreshAnimations } from '../core/ui.js';

function renderHero(home) {
  const eyebrow = home.heroEyebrow ? `<p class="section-label mb-2">${escapeHtml(home.heroEyebrow)}</p>` : '';
  const heading = escapeHtml(home.heroHeading || 'Ashley Jae Carranza');
  const subheading = escapeHtml(home.heroSubheading || '');
  const details = (home.heroDetails || []).length
    ? `<ul class="hero-meta list-unstyled d-flex flex-wrap gap-3 mb-4">${(home.heroDetails || [])
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul>`
    : '';
  const image = withBasePath(home.heroImage || '/assets/img/headshot.webp');
  const imageAlt = escapeHtml(home.heroImageAlt || 'Ashley Jae Carranza');
  const ctas = (home.heroCTAs || [])
    .map((cta) => {
      const cls = cta.style === 'primary' ? 'ac-btn' : 'btn-outline';
      const icon = cta.icon ? `<i class="bi ${escapeHtml(cta.icon)} me-1"></i> ` : '';
      return `<a class="${cls}" href="${withBasePath(cta.href)}">${icon}${escapeHtml(cta.label)}</a>`;
    })
    .join('\n');

  return `
    <div class="row align-items-center g-4 g-lg-5">
      <div class="col-lg-7">
        ${eyebrow}
        <h1 class="mb-3">${heading}</h1>
        <p class="lead mb-4">${subheading}</p>
        ${details}
        <div class="d-flex flex-wrap gap-2">${ctas}</div>
      </div>
      <div class="col-lg-5 text-center" data-aos="fade-up" data-aos-delay="100">
        <img class="hero-portrait mx-auto" src="${image}" alt="${imageAlt}" loading="lazy" />
      </div>
    </div>`;
}

function renderQuickNav(items) {
  return items
    .map(
      (item) => `
      <div class="col-md-4">
        <a href="${withBasePath(item.href)}" class="text-decoration-none d-block nav-block h-100">
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.description)}</p>
          <span class="text-decoration-underline link-accent">${escapeHtml(item.linkText)}</span>
        </a>
      </div>`
    )
    .join('');
}

function renderSocialProof(productCount, eventCount, proofItems = []) {
  if (proofItems.length) {
    return `<div class="social-proof-bar py-3" data-aos="fade-up"><p class="mb-0 text-center text-muted-ui">${proofItems
      .map((item) => escapeHtml(item))
      .join('<span class="proof-divider mx-2">|</span>')}</p></div>`;
  }

  const items = [];
  if (productCount > 0) items.push(`Author of ${productCount} book${productCount > 1 ? 's' : ''}`);
  if (eventCount > 0) items.push(`${eventCount}+ speaking event${eventCount > 1 ? 's' : ''}`);
  items.push('Trusted by educators nationwide');
  return `<div class="social-proof-bar py-3" data-aos="fade-up"><p class="mb-0 text-center text-muted-ui">${items.join('<span class="proof-divider mx-2">|</span>')}</p></div>`;
}

export async function initHomePage(site = {}) {
  const heroRoot = document.getElementById('hero-content');
  const proofRoot = document.getElementById('social-proof-bar');
  const navRoot = document.getElementById('quick-nav');
  const workRoot = document.getElementById('home-work-preview');
  const eventRoot = document.getElementById('home-events-preview');
  const testimonialRoot = document.getElementById('home-testimonials');
  const newsRoot = document.getElementById('home-news');

  const home = site.home || {};
  const featuredProducts = Math.max(1, Number(home.featuredProducts || 2));
  const featuredEvents = Math.max(1, Number(home.featuredEvents || 2));
  const featuredPosts = Math.max(1, Number(home.featuredPosts || 2));

  // Render data-driven hero + quick nav immediately
  if (heroRoot && home.heroHeading) heroRoot.innerHTML = renderHero(home);
  if (navRoot && home.quickNav) navRoot.innerHTML = renderQuickNav(home.quickNav);

  // Show skeletons
  if (workRoot) workRoot.innerHTML = renderSkeleton('product-preview', featuredProducts);
  if (eventRoot) eventRoot.innerHTML = renderSkeleton('event-preview', featuredEvents);
  if (testimonialRoot) testimonialRoot.innerHTML = renderSkeleton('testimonial', 1);
  if (newsRoot) newsRoot.innerHTML = renderSkeleton('post-preview', featuredPosts);

  // Fetch all data in parallel
  const [productsResult, eventsResult, testimonialsResult, postsResult] = await Promise.allSettled([
    getJson('/data/products.json'),
    getJson('/data/events.json'),
    getJson('/data/testimonials.json'),
    getJson('/data/posts.json')
  ]);

  // Products
  if (workRoot) {
    if (productsResult.status === 'fulfilled' && productsResult.value.products?.length) {
      const featuredItems = productsResult.value.products.filter((product) => product.featured);
      const sourceItems = featuredItems.length ? featuredItems : productsResult.value.products;
      workRoot.innerHTML = sourceItems
        .slice(0, featuredProducts)
        .map((product, index) => renderPreviewProductCard(product, index))
        .join('');
    } else {
      workRoot.innerHTML = renderEmptyState('More books coming soon.');
    }
  }

  // Events
  if (eventRoot) {
    if (eventsResult.status === 'fulfilled' && eventsResult.value.events?.length) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sorted = [...eventsResult.value.events].sort((a, b) => a.date.localeCompare(b.date));
      const upcoming = sorted.filter((e) => new Date(`${e.date}T00:00:00`) >= today);
      const items = (upcoming.length ? upcoming : sorted.slice(-featuredEvents)).slice(0, featuredEvents);
      eventRoot.innerHTML = items.map((e, i) => renderPreviewEventCard(e, i)).join('');
    } else {
      eventRoot.innerHTML = renderEmptyState('More events coming soon.');
    }
  }

  // Social proof bar
  if (proofRoot) {
    const productCount = productsResult.status === 'fulfilled' ? (productsResult.value.products?.length || 0) : 0;
    const eventCount = eventsResult.status === 'fulfilled' ? (eventsResult.value.events?.length || 0) : 0;
    proofRoot.innerHTML = renderSocialProof(productCount, eventCount, home.proofItems || []);
  }

  // Testimonials
  if (testimonialRoot) {
    if (testimonialsResult.status === 'fulfilled') {
      const featured = (testimonialsResult.value.testimonials || []).filter((t) => t.featured);
      if (featured.length) {
        testimonialRoot.innerHTML = `
          <h2 class="section-title mb-3" data-aos="fade-up">What People Are Saying</h2>
          ${renderTestimonialCarousel(featured)}`;
      } else {
        testimonialRoot.innerHTML = '';
      }
    } else {
      testimonialRoot.innerHTML = '';
    }
  }

  // News
  if (newsRoot) {
    if (postsResult.status === 'fulfilled' && postsResult.value.posts?.length) {
      const sorted = [...postsResult.value.posts].sort((a, b) => b.date.localeCompare(a.date));
      const items = sorted.slice(0, featuredPosts);
      newsRoot.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3" data-aos="fade-up">
          <h2 class="section-title mb-0">Latest Updates</h2>
          <a class="btn-outline btn-sm" href="${withBasePath('/news/')}">View all</a>
        </div>
        <div class="row g-4">${items.map((p, i) => renderPreviewPostCard(p, i)).join('')}</div>`;
    } else {
      newsRoot.innerHTML = '';
    }
  }

  refreshAnimations();
}
