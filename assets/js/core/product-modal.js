import { escapeHtml, getProductFallbackImage, getProductImageSource, getProductLinks, safeHref } from './format.js';
import { assetUrl, withBasePath } from './site.js';

const MODAL_ID = 'productDetailModal';

function renderBuyLinks(product) {
  return getProductLinks(product)
    .map((link) => {
      const cls = link.style === 'primary' ? 'ac-btn' : 'btn-outline';
      const icon = /amazon/i.test(link.label) ? 'bi-cart' : 'bi-box-arrow-up-right';
      return `<a class="${cls}" href="${escapeHtml(safeHref(link.href))}" target="_blank" rel="noopener noreferrer"><i class="bi ${icon} me-1"></i>${escapeHtml(link.label)}</a>`;
    })
    .join('\n');
}

function renderMeta(product) {
  const items = [];
  if (product.ageRange) items.push(`<span><i class="bi bi-people me-1"></i>${escapeHtml(product.ageRange)}</span>`);
  if (product.pages) items.push(`<span><i class="bi bi-journal me-1"></i>${product.pages} pages</span>`);
  if (product.category) items.push(`<span class="badge-category">${escapeHtml(product.category)}</span>`);
  return items.join('');
}

function buildModalHTML(product) {
  const fallback = withBasePath(getProductFallbackImage(product));
  const image = assetUrl(getProductImageSource(product), fallback);
  const description = product.longDescription || product.description || '';

  return `
    <div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-labelledby="${MODAL_ID}Label" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-0 pb-0">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body px-4 pb-4">
            <div class="row g-4">
              <div class="col-md-5">
                <img class="product-placeholder w-100" src="${escapeHtml(image)}" alt="Cover image for ${escapeHtml(product.title || '')}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';" />
              </div>
              <div class="col-md-7 d-flex flex-column">
                <h2 id="${MODAL_ID}Label" class="section-title mb-2">${escapeHtml(product.title || 'Untitled')}</h2>
                <div class="d-flex flex-wrap gap-2 mb-3 product-meta">${renderMeta(product)}</div>
                <p class="text-muted-ui mb-4">${escapeHtml(description)}</p>
                <div class="d-flex flex-wrap gap-2 mt-auto">${renderBuyLinks(product)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

let currentModal = null;

export function openProductModal(product) {
  // Remove any existing modal
  const existing = document.getElementById(MODAL_ID);
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', buildModalHTML(product));
  const el = document.getElementById(MODAL_ID);
  currentModal = new bootstrap.Modal(el);
  el.addEventListener('hidden.bs.modal', () => {
    el.remove();
    currentModal = null;
  });
  currentModal.show();
}

export function initProductModals(products) {
  if (!products || !products.length) return;

  const map = new Map(products.map((p) => [p.id, p]));

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.product-detail-trigger');
    if (!trigger) return;
    e.preventDefault();
    const product = map.get(trigger.dataset.productId);
    if (product) openProductModal(product);
  });
}
