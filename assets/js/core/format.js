export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeHref(url, fallback = '#') {
  if (!url) return fallback;

  const trimmed = String(url).trim();
  if (/^(https?:\/\/|mailto:|tel:|\/|\.\/|\.\.\/|#)/i.test(trimmed)) {
    return trimmed;
  }

  return fallback;
}

export function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function extractAsin(url) {
  if (!url) return null;
  const match = url.match(/\/(?:dp|gp\/product|ASIN)\/([A-Z0-9]{10})/i);
  return match ? match[1] : null;
}

export function amazonImageUrl(asin) {
  return `https://m.media-amazon.com/images/P/${asin}.jpg`;
}

export function getProductFallbackImage(product = {}) {
  const haystack = `${product.category || ''} ${product.title || ''}`;
  return /color/i.test(haystack) ? '/assets/img/product-coloring.svg' : '/assets/img/product-book.svg';
}

export function getProductImageSource(product = {}) {
  const asin = extractAsin(product.amazonUrl);
  if (asin) return amazonImageUrl(asin);
  if (product.image) return product.image;
  return getProductFallbackImage(product);
}
