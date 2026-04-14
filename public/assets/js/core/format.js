export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeSvgText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

function splitTitleLines(title = 'Selected Work', maxChars = 20, maxLines = 4) {
  const words = String(title)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return ['Selected Work'];

  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current) lines.push(current);

  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  const remainder = lines.slice(maxLines - 1).join(' ');
  visible[maxLines - 1] = `${remainder.slice(0, Math.max(8, maxChars - 1)).trimEnd()}…`;
  return visible;
}

function getCoverTheme(category = '') {
  if (/creative/i.test(category)) {
    return {
      background: '#fff2df',
      panel: '#f7c98b',
      accent: '#bb5c2e',
      text: '#25150d',
      line: '#edc18a'
    };
  }

  if (/teaching|resource/i.test(category)) {
    return {
      background: '#eef6ef',
      panel: '#dbead9',
      accent: '#2d6a4f',
      text: '#173125',
      line: '#bfd8c5'
    };
  }

  return {
    background: '#f5efe8',
    panel: '#ead8c8',
    accent: '#7c3f2a',
    text: '#221711',
    line: '#dcc2b1'
  };
}

function buildGeneratedProductCover(product = {}) {
  const title = escapeSvgText(product.title || 'Selected Work');
  const category = escapeSvgText(product.category || 'Ashley Jae Carranza');
  const author = escapeSvgText(product.author || 'Ashley Jae Carranza');
  const theme = getCoverTheme(product.category || '');
  const lines = splitTitleLines(product.title || 'Selected Work', 19, 4);
  const fontSize = lines.length > 3 ? 56 : 64;
  const startY = lines.length > 3 ? 365 : 390;
  const lineMarkup = lines
    .map(
      (line, index) =>
        `<text x="120" y="${startY + index * (fontSize + 18)}" font-size="${fontSize}" font-family="'Playfair Display', Georgia, serif" font-weight="700" fill="${theme.text}">${escapeSvgText(
          line
        )}</text>`
    )
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-labelledby="title desc">
      <title id="title">${title} cover artwork</title>
      <desc id="desc">${category} by ${author}</desc>
      <rect width="1200" height="900" rx="36" fill="${theme.background}" />
      <rect x="72" y="72" width="1056" height="756" rx="32" fill="${theme.background}" stroke="${theme.line}" stroke-width="6" />
      <rect x="120" y="124" width="420" height="58" rx="29" fill="${theme.panel}" />
      <text x="150" y="162" font-size="26" font-family="Inter, Arial, sans-serif" font-weight="600" letter-spacing="2" fill="${theme.accent}">${category}</text>
      <text x="120" y="250" font-size="26" font-family="Inter, Arial, sans-serif" fill="${theme.accent}">${author}</text>
      ${lineMarkup}
      <path d="M120 720H1080" stroke="${theme.line}" stroke-width="6" stroke-linecap="round" />
      <path d="M120 756H760" stroke="${theme.line}" stroke-width="6" stroke-linecap="round" />
      <circle cx="1010" cy="722" r="44" fill="${theme.panel}" />
      <circle cx="1010" cy="722" r="20" fill="${theme.accent}" />
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

export function getProductFallbackImage(product = {}) {
  return buildGeneratedProductCover(product);
}

export function getProductLinks(product = {}) {
  if (Array.isArray(product.links) && product.links.length) {
    return product.links
      .filter((link) => link?.href)
      .map((link, index) => ({
        label: link.label || `Open link ${index + 1}`,
        href: link.href,
        style: link.style || (index === 0 ? 'primary' : 'outline')
      }));
  }

  const links = [];
  if (product.amazonUrl) {
    links.push({ label: 'View on Amazon', href: product.amazonUrl, style: 'primary' });
  }
  if (product.tptUrl) {
    links.push({ label: 'Visit TPT Store', href: product.tptUrl, style: links.length ? 'outline' : 'primary' });
  }

  return links;
}

export function getProductImageSource(product = {}) {
  if (product.image) return product.image;
  const asin = extractAsin(product.amazonUrl);
  if (asin) return amazonImageUrl(asin);
  return getProductFallbackImage(product);
}
