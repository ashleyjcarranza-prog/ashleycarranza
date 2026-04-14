import { renderEmptyState, renderProductCard } from '../core/cards.js';
import { initProductModals } from '../core/product-modal.js';
import { getJson } from '../core/site.js';
import { renderSkeleton } from '../core/skeleton.js';
import { refreshAnimations } from '../core/ui.js';

function groupProducts(products) {
  const groups = new Map();
  products.forEach((product) => {
    const category = product.category || 'Work';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(product);
  });
  return [...groups.entries()];
}

function renderGroupedProducts(products) {
  return groupProducts(products)
    .map(
      ([category, items]) => `
        <section class="category-group col-12">
          <div class="category-group-header mb-3">
            <h2 class="h4 mb-0">${category}</h2>
          </div>
          <div class="row g-4">
            ${items.map((product, index) => renderProductCard(product, index)).join('')}
          </div>
        </section>`
    )
    .join('');
}

export async function initProductsPage() {
  const root = document.getElementById('products-grid');
  if (!root) return;

  root.innerHTML = renderSkeleton('product', 3);

  try {
    const data = await getJson('/data/products.json');
    if (data.products?.length) {
      root.innerHTML = renderGroupedProducts(data.products);
      initProductModals(data.products);
    } else {
      root.innerHTML = renderEmptyState('More books and resources coming soon.');
    }
  } catch {
    root.innerHTML = renderEmptyState('Unable to load products right now.');
    root.querySelector('.empty-state')?.classList.add('text-danger');
  }

  refreshAnimations();
}
