import { renderEmptyState, renderPreviewEventCard, renderPreviewProductCard } from '../core/cards.js';
import { getJson } from '../core/site.js';
import { refreshAnimations } from '../core/ui.js';

export async function initHomePage(site = {}) {
  const workRoot = document.getElementById('home-work-preview');
  const eventRoot = document.getElementById('home-events-preview');
  if (!workRoot && !eventRoot) return;

  const featuredProducts = Math.max(1, Number(site.home?.featuredProducts || 2));
  const featuredEvents = Math.max(1, Number(site.home?.featuredEvents || 2));

  const [productsResult, eventsResult] = await Promise.allSettled([
    getJson('/data/products.json'),
    getJson('/data/events.json')
  ]);

  if (workRoot) {
    if (productsResult.status === 'fulfilled' && productsResult.value.products?.length) {
      workRoot.innerHTML = productsResult.value.products
        .slice(0, featuredProducts)
        .map((product, index) => renderPreviewProductCard(product, index))
        .join('');
    } else {
      workRoot.innerHTML = renderEmptyState('More books coming soon.');
    }
  }

  if (eventRoot) {
    if (eventsResult.status === 'fulfilled' && eventsResult.value.events?.length) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sorted = [...eventsResult.value.events].sort((left, right) => left.date.localeCompare(right.date));
      const upcoming = sorted.filter((event) => new Date(`${event.date}T00:00:00`) >= today);
      const items = (upcoming.length ? upcoming : sorted.slice(-featuredEvents)).slice(0, featuredEvents);

      eventRoot.innerHTML = items.map((event, index) => renderPreviewEventCard(event, index)).join('');
    } else {
      eventRoot.innerHTML = renderEmptyState('More events coming soon.');
    }
  }

  refreshAnimations();
}
