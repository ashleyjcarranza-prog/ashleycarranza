import { getSiteData } from './core/site.js';
import { buildFooter, buildNav, initAnimations } from './core/ui.js';
import { initEventsPage } from './pages/events.js';
import { initHomePage } from './pages/home.js';
import { initProductsPage } from './pages/products.js';

const pageInitializers = {
  home: initHomePage,
  products: initProductsPage,
  events: initEventsPage
};

document.addEventListener('DOMContentLoaded', async () => {
  const site = (await getSiteData()) || {};

  buildNav(site);
  buildFooter(site);
  initAnimations();

  const pageName = document.body.dataset.page;
  const initializePage = pageInitializers[pageName];
  if (initializePage) {
    await initializePage(site);
  }
});
