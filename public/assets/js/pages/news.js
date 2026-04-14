import { escapeHtml, formatDisplayDate } from '../core/format.js';
import { getJson, withBasePath } from '../core/site.js';
import { renderSkeleton } from '../core/skeleton.js';
import { refreshAnimations } from '../core/ui.js';

function getPostDateLabel(post) {
  return post.displayDate || formatDisplayDate(post.date);
}

function renderPostCard(post, index = 0) {
  return `
    <div class="col-md-6 col-xl-4" data-aos="fade-up" data-aos-delay="${Math.min(index * 60, 240)}">
      <article class="card-item p-3 h-100 d-flex flex-column">
        <p class="event-date mb-2"><i class="bi bi-calendar3 me-1"></i>${escapeHtml(getPostDateLabel(post))}</p>
        <h2 class="h5 mb-2">${escapeHtml(post.title)}</h2>
        <p class="text-muted-ui mb-3">${escapeHtml(post.excerpt)}</p>
        <div class="d-flex justify-content-between align-items-center mt-auto">
          <span class="badge-category">${escapeHtml(post.category)}</span>
          <a class="btn-outline btn-sm" href="${withBasePath('/news/')}?post=${escapeHtml(post.id)}">Read more</a>
        </div>
      </article>
    </div>`;
}

function buildPostSchema(post) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.date,
    author: { '@type': 'Person', name: 'Ashley Jae Carranza' },
    publisher: { '@type': 'Person', name: 'Ashley Jae Carranza' },
    description: post.excerpt || '',
    mainEntityOfPage: `https://ashleycarranza.com/news/?post=${post.id}`
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function renderSinglePost(post) {
  return `
    ${buildPostSchema(post)}
    <article class="single-post" data-aos="fade-up">
      <a class="btn-outline btn-sm mb-4 d-inline-block" href="${withBasePath('/news/')}"><i class="bi bi-arrow-left me-1"></i>All posts</a>
      <p class="event-date mb-2"><i class="bi bi-calendar3 me-1"></i>${escapeHtml(getPostDateLabel(post))}</p>
      <h1 class="section-title mb-2">${escapeHtml(post.title)}</h1>
      <span class="badge-category mb-4 d-inline-block">${escapeHtml(post.category)}</span>
      <div class="prose post-body mt-3">${post.body}</div>
    </article>`;
}

function renderGrid(posts, container) {
  if (!posts.length) {
    container.innerHTML = '<div class="col-12"><div class="empty-state">More updates coming soon.</div></div>';
    return;
  }
  container.innerHTML = posts.map((p, i) => renderPostCard(p, i)).join('');
  refreshAnimations();
}

export async function initNewsPage() {
  const grid = document.getElementById('posts-grid');
  const filterSection = document.getElementById('news-filter');
  if (!grid) return;

  grid.innerHTML = renderSkeleton('post', 3);

  try {
    const data = await getJson('/data/posts.json');
    const posts = [...(data.posts || [])].sort((a, b) => b.date.localeCompare(a.date));

    // Check for single-post view
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');

    if (postId) {
      const post = posts.find((p) => p.id === postId);
      if (post) {
        if (filterSection) filterSection.style.display = 'none';
        grid.innerHTML = renderSinglePost(post);
        document.title = `${post.title} | Ashley Jae Carranza`;
        return;
      }
    }

    // Populate category filter
    const filterEl = document.getElementById('filter-category');
    if (filterEl) {
      const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))].sort();
      categories.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        filterEl.appendChild(opt);
      });

      filterEl.addEventListener('change', () => {
        const val = filterEl.value;
        const filtered = val ? posts.filter((p) => p.category === val) : posts;
        renderGrid(filtered, grid);
      });
    }

    renderGrid(posts, grid);
  } catch {
    grid.innerHTML = '<div class="col-12"><div class="empty-state">Unable to load posts.</div></div>';
  }
}
