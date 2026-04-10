import { renderEmptyState, renderEventCard, renderPreviewPostCard } from '../core/cards.js';
import { getJson } from '../core/site.js';
import { renderSkeleton } from '../core/skeleton.js';
import { refreshAnimations } from '../core/ui.js';

const typeLabels = {
  upcoming_conference: 'Upcoming Conference',
  speaking_engagement: 'Speaking Engagement',
  past_appearance: 'Past Appearance'
};

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort();
}

function resetSelectOptions(select, values) {
  if (!select) return;
  select.querySelectorAll('option:not(:first-child)').forEach((option) => option.remove());
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function sortEvents(events) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...events].sort((left, right) => {
    const leftDate = new Date(`${left.date}T00:00:00`);
    const rightDate = new Date(`${right.date}T00:00:00`);
    const leftIsPast = Number.isNaN(leftDate.getTime()) ? left.type === 'past_appearance' : leftDate < today;
    const rightIsPast = Number.isNaN(rightDate.getTime()) ? right.type === 'past_appearance' : rightDate < today;

    if (leftIsPast !== rightIsPast) return leftIsPast ? 1 : -1;
    if (!leftIsPast) return left.date.localeCompare(right.date);
    return right.date.localeCompare(left.date);
  });
}

function readFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get('type') || '',
    topic: params.get('topic') || '',
    year: params.get('year') || '',
    city: params.get('city') || ''
  };
}

function writeFiltersToURL(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  history.replaceState(null, '', url);
}

export async function initEventsPage() {
  const root = document.getElementById('events-grid');
  if (!root) return;
  const featureRoot = document.getElementById('features-grid');
  const featureSection = featureRoot?.closest('[data-features-section]') || null;

  const filterType = document.getElementById('filter-type');
  const filterTopic = document.getElementById('filter-topic');
  const filterYear = document.getElementById('filter-year');
  const filterCity = document.getElementById('filter-city');

  root.innerHTML = renderSkeleton('event', 3);
  if (featureRoot) featureRoot.innerHTML = renderSkeleton('post-preview', 2);

  try {
    const [data, postsData] = await Promise.all([
      getJson('/data/events.json'),
      featureRoot ? getJson('/data/posts.json').catch(() => ({ posts: [] })) : Promise.resolve({ posts: [] })
    ]);
    const events = sortEvents((data.events || []).map((event) => ({
      ...event,
      typeLabel: typeLabels[event.type] || event.type
    })));
    const timezoneLabel = data.timezone || '';

    resetSelectOptions(filterTopic, uniqueValues(events, 'topic'));
    resetSelectOptions(
      filterYear,
      uniqueValues(events.map((event) => ({ year: event.date.slice(0, 4) })), 'year')
    );
    resetSelectOptions(filterCity, uniqueValues(events, 'city'));

    // Restore filters from URL
    const saved = readFiltersFromURL();
    if (filterType && saved.type) filterType.value = saved.type;
    if (filterTopic && saved.topic) filterTopic.value = saved.topic;
    if (filterYear && saved.year) filterYear.value = saved.year;
    if (filterCity && saved.city) filterCity.value = saved.city;

    const render = () => {
      const filters = {
        type: filterType?.value || '',
        topic: filterTopic?.value || '',
        year: filterYear?.value || '',
        city: filterCity?.value || ''
      };

      writeFiltersToURL(filters);

      const filtered = events.filter((event) => {
        if (filters.type && event.type !== filters.type) return false;
        if (filters.topic && event.topic !== filters.topic) return false;
        if (filters.year && !event.date.startsWith(filters.year)) return false;
        if (filters.city && event.city !== filters.city) return false;
        return true;
      });

      root.innerHTML = filtered.length
        ? filtered.map((event, index) => renderEventCard(event, index, timezoneLabel)).join('')
        : renderEmptyState('No events match your filters.');

      refreshAnimations();
    };

    [filterType, filterTopic, filterYear, filterCity].forEach((element) => {
      element?.addEventListener('change', render);
    });

    render();

    if (featureRoot) {
      const featuredPosts = [...(postsData.posts || [])]
        .filter((post) => post.featured || post.category === 'Features')
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 2);

      if (featuredPosts.length) {
        featureRoot.innerHTML = featuredPosts.map((post, index) => renderPreviewPostCard(post, index)).join('');
      } else {
        featureSection?.remove();
      }
    }
  } catch {
    root.innerHTML = renderEmptyState('Unable to load events right now.');
    root.querySelector('.empty-state')?.classList.add('text-danger');
    featureSection?.remove();
  }
}
