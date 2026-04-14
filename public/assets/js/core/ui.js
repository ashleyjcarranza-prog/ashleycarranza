import { escapeHtml, safeHref } from './format.js';
import { initScrollReveal, refreshScrollReveal } from './scroll-reveal.js';
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

function syncThemeToggle(toggleBtn) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const nextThemeLabel = isDark ? 'light' : 'dark';
  toggleBtn.setAttribute('aria-pressed', String(isDark));
  toggleBtn.setAttribute('aria-label', `Switch to ${nextThemeLabel} mode`);
  toggleBtn.setAttribute('title', `Switch to ${nextThemeLabel} mode`);
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
        <div class="d-flex align-items-center order-lg-last gap-2">
          <button class="theme-toggle" type="button" aria-label="Switch to dark mode" aria-pressed="false" title="Switch to dark mode">
            <i class="bi bi-moon-fill" aria-hidden="true"></i><i class="bi bi-sun-fill" aria-hidden="true"></i>
          </button>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu" aria-controls="navMenu" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
        <div class="collapse navbar-collapse" id="navMenu">
          <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
            ${itemsMarkup}
          </ul>
        </div>
      </div>
    </nav>
  `;

  const navMenu = nav.querySelector('#navMenu');
  const toggleBtn = nav.querySelector('.theme-toggle');
  syncThemeToggle(toggleBtn);
  toggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncThemeToggle(toggleBtn);
  });

  nav.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (!navMenu || !navMenu.classList.contains('show') || !window.bootstrap?.Collapse) return;
      window.bootstrap.Collapse.getOrCreateInstance(navMenu, { toggle: false }).hide();
    });
  });

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
  const legalMarkup = `
    <div class="footer-links">
      <a href="${withBasePath('/privacy/')}">Privacy Policy</a>
      <a href="${withBasePath('/terms/')}">Terms of Use</a>
    </div>`;

  footer.innerHTML = `
    <footer class="py-4 mt-5">
      <div class="container footer-inner d-flex flex-column flex-lg-row justify-content-between gap-3">
        <div class="d-flex flex-column gap-1">
          <small>&copy; ${year} ${siteName}</small>
          <small>Media &amp; speaking inquiries: <a class="text-decoration-none" href="mailto:${email}">${email}</a></small>
        </div>
        <div class="d-flex flex-column flex-lg-row gap-2 align-items-start align-items-lg-center">
          ${legalMarkup}
          ${socialMarkup ? `<div class="footer-links">${socialMarkup}</div>` : ''}
        </div>
      </div>
    </footer>
  `;
}

export function buildBreadcrumb() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '') return;

  const labels = {
    '/about': 'About',
    '/contact': 'Contact',
    '/my-work': 'My Work',
    '/news': 'News',
    '/speaking-features': 'Speaking & Features',
    '/privacy': 'Privacy Policy',
    '/terms': 'Terms of Use'
  };
  const label = labels[path];
  if (!label) return;

  const main = document.getElementById('main-content');
  if (!main) return;

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  nav.className = 'breadcrumb-nav';
  nav.innerHTML = `<ol class="breadcrumb mb-0">
    <li class="breadcrumb-item"><a href="${withBasePath('/')}">Home</a></li>
    <li class="breadcrumb-item active" aria-current="page">${escapeHtml(label)}</li>
  </ol>`;
  main.insertBefore(nav, main.firstChild);
}

export function injectBreadcrumbSchema() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '') return;

  const labels = {
    '/about': 'About',
    '/contact': 'Contact',
    '/my-work': 'My Work',
    '/news': 'News',
    '/speaking-features': 'Speaking & Features',
    '/privacy': 'Privacy Policy',
    '/terms': 'Terms of Use'
  };
  const label = labels[path];
  if (!label) return;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ashleycarranza.com/' },
      { '@type': 'ListItem', position: 2, name: label, item: `https://ashleycarranza.com${path}` }
    ]
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

export function initAnimations() {
  initScrollReveal();
}

export function refreshAnimations() {
  refreshScrollReveal();
}
