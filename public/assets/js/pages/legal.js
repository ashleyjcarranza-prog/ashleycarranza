import { escapeHtml } from '../core/format.js';
import { getJson } from '../core/site.js';

function renderBody(body) {
  const blocks = body
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      if (block.startsWith('## ')) {
        return `<h2 class="h4 mt-4 mb-2">${escapeHtml(block.slice(3))}</h2>`;
      }
      return `<p>${escapeHtml(block)}</p>`;
    })
    .join('');
}

export async function initLegalPage() {
  const root = document.getElementById('legal-content');
  if (!root) return;

  root.innerHTML = '<div class="empty-state">Loading legal information...</div>';

  try {
    const legal = await getJson('/api/content/legal');
    const pageKey = document.body.dataset.legalPage === 'terms' ? 'terms' : 'privacy';
    const page = legal?.[pageKey];

    if (!page) {
      root.innerHTML = '<div class="empty-state">Unable to load legal content.</div>';
      return;
    }

    document.title = `${page.title} | Ashley Jae Carranza`;
    root.innerHTML = `
      <article class="single-post" data-aos="fade-up">
        <p class="event-date mb-2">Last updated: ${escapeHtml(page.updatedLabel || '')}</p>
        <h1 class="section-title mb-3">${escapeHtml(page.title)}</h1>
        <p class="text-muted-ui mb-4">${escapeHtml(page.intro)}</p>
        <div class="post-body prose">${renderBody(page.body)}</div>
      </article>`;
  } catch {
    root.innerHTML = '<div class="empty-state">Unable to load legal content.</div>';
  }
}
