import { renderEmptyState, renderProductCard } from '../core/cards.js';
import { getJson } from '../core/site.js';
import { refreshAnimations } from '../core/ui.js';

export async function initProductsPage() {
  const root = document.getElementById('products-grid');
  if (!root) return;

  try {
    const data = await getJson('/data/products.json');
    root.innerHTML = data.products?.length
      ? data.products.map((product, index) => renderProductCard(product, index)).join('')
      : renderEmptyState('More books and resources coming soon.');
  } catch {
    root.innerHTML = renderEmptyState('Unable to load products right now.');
    root.querySelector('.empty-state')?.classList.add('text-danger');
  }

  refreshAnimations();
}
