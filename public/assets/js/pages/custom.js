import { renderBlocks } from '../core/blocks.js';
import { getJson } from '../core/site.js';
import { refreshAnimations } from '../core/ui.js';

export async function initCustomPage() {
  const slug = document.body.dataset.pageSlug;
  if (!slug) return;

  const container = document.getElementById('page-blocks');
  if (!container) return;

  try {
    const apiSlug = slug.startsWith('/') ? slug.slice(1) : slug;
    const page = await getJson(`/api/content/pages/${apiSlug}`);
    const blocks = page?.blocks || [];
    container.innerHTML = blocks.length
      ? renderBlocks(blocks)
      : '<p class="text-muted-ui text-center py-5">This page has no content yet.</p>';
    refreshAnimations();
  } catch {
    container.innerHTML = '<p class="text-muted-ui text-center py-5">Unable to load page content.</p>';
  }
}
