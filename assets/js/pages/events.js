import { renderEmptyState, renderEventCard } from '../core/cards.js';
import { getJson } from '../core/site.js';
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
  const typeOrder = { upcoming_conference: 0, speaking_engagement: 1, past_appearance: 2 };

  return [...events].sort((left, right) => {
    const typeDiff = (typeOrder[left.type] ?? 3) - (typeOrder[right.type] ?? 3);
    if (typeDiff !== 0) return typeDiff;
    return left.date.localeCompare(right.date);
  });
}

export async function initEventsPage() {
  const root = document.getElementById('events-grid');
  if (!root) return;

  const filterType = document.getElementById('filter-type');
  const filterTopic = document.getElementById('filter-topic');
  const filterYear = document.getElementById('filter-year');
  const filterCity = document.getElementById('filter-city');

  try {
    const data = await getJson('/data/events.json');
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

    const render = () => {
      const filtered = events.filter((event) => {
        if (filterType?.value && event.type !== filterType.value) return false;
        if (filterTopic?.value && event.topic !== filterTopic.value) return false;
        if (filterYear?.value && !event.date.startsWith(filterYear.value)) return false;
        if (filterCity?.value && event.city !== filterCity.value) return false;
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
  } catch {
    root.innerHTML = renderEmptyState('Unable to load events right now.');
    root.querySelector('.empty-state')?.classList.add('text-danger');
  }
}
