import { getSiteData } from './core/site.js';
import { buildBreadcrumb, buildFooter, buildNav, initAnimations, injectBreadcrumbSchema } from './core/ui.js';
import { initAboutPage } from './pages/about.js';
import { initEventsPage } from './pages/events.js';
import { initHomePage } from './pages/home.js';
import { initLegalPage } from './pages/legal.js';
import { initNewsPage } from './pages/news.js';
import { initProductsPage } from './pages/products.js';
import { initCustomPage } from './pages/custom.js';

const pageInitializers = {
  home: initHomePage,
  products: initProductsPage,
  events: initEventsPage,
  about: initAboutPage,
  news: initNewsPage,
  legal: initLegalPage,
  custom: initCustomPage
};

document.addEventListener('DOMContentLoaded', async () => {
  const site = (await getSiteData()) || {};

  buildNav(site);
  buildFooter(site);
  initAnimations();
  injectBreadcrumbSchema();
  buildBreadcrumb();

  const pageName = document.body.dataset.page;
  const initializePage = pageInitializers[pageName];
  if (initializePage) {
    await initializePage(site);
  }
});
