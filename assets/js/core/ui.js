import { escapeHtml, safeHref } from './format.js';
import { getNavigation, normalizePath, stripBasePath, withBasePath } from './site.js';

function socialEntries(site) {
  const social = site?.social || {};
  return [
    { label: 'Instagram', icon: 'bi-instagram', href: social.instagram },
    { label: 'Facebook', icon: 'bi-facebook', href: social.facebook },
    { label: 'LinkedIn', icon: 'bi-linkedin', href: social.linkedin },
    { label: 'YouTube', icon: 'bi-youtube', href: social.youtube }
  ].filter((entry) => entry.href);
}

export function buildNav(site = {}) {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const brand = escapeHtml(site.siteName || 'Ashley Jae Carranza');
  const itemsMarkup = getNavigation(site)
    .map((item) => `<li class="nav-item"><a class="nav-link" href="${item.href}">${escapeHtml(item.label)}</a></li>`)
    .join('');

  nav.innerHTML = `
    <nav class="navbar navbar-expand-lg sticky-top">
      <div class="container py-1">
        <a class="navbar-brand" href="${withBasePath('/')}">${brand}</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu" aria-controls="navMenu" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navMenu">
          <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
            ${itemsMarkup}
          </ul>
        </div>
      </div>
    </nav>
  `;

  const currentPath = normalizePath(stripBasePath(window.location.pathname));
  nav.querySelectorAll('.nav-link').forEach((link) => {
    const linkPath = normalizePath(stripBasePath(new URL(link.href).pathname));
    if (currentPath === linkPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

export function buildFooter(site = {}) {
  const footer = document.getElementById('site-footer');
  if (!footer) return;

  const year = new Date().getFullYear();
  const siteName = escapeHtml(site.siteName || 'Ashley Jae Carranza');
  const email = escapeHtml(site.contactEmail || 'ashleyjcarranza@gmail.com');
  const socialMarkup = socialEntries(site)
    .map((entry) => {
      const href = safeHref(entry.href);
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(entry.label)}"><i class="bi ${entry.icon} me-1"></i>${escapeHtml(entry.label)}</a>`;
    })
    .join('');

  footer.innerHTML = `
    <footer class="py-4 mt-5">
      <div class="container footer-inner d-flex flex-column flex-lg-row justify-content-between gap-3">
        <div class="d-flex flex-column gap-1">
          <small>&copy; ${year} ${siteName}</small>
          <small>Media &amp; speaking inquiries: <a class="text-decoration-none" href="mailto:${email}">${email}</a></small>
        </div>
        ${socialMarkup ? `<div class="footer-links">${socialMarkup}</div>` : ''}
      </div>
    </footer>
  `;
}

export function initAnimations() {
  if (window.AOS) {
    window.AOS.init({
      once: true,
      duration: 500,
      easing: 'ease-out-cubic'
    });
  }
}

export function refreshAnimations() {
  if (window.AOS) {
    window.AOS.refresh();
  }
}
