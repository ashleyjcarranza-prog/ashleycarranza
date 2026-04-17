// Browser-side HTML allowlist sanitizer. Mirrors src/lib/sanitize.ts.
// Keeps tags: p, br, strong, em, a, h2, h3, ul, ol, li.
// Only href allowed on <a>. Blocks javascript:/data: schemes. Strips styles + handlers.

const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'EM', 'B', 'I', 'A', 'H2', 'H3', 'UL', 'OL', 'LI']);
const TAG_ALIASES = { B: 'STRONG', I: 'EM' };
const ALLOWED_ATTRS = { A: new Set(['href']) };

function safeUrl(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return '';
  return trimmed;
}

function cleanNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return;
  if (node.nodeType === Node.COMMENT_NODE) { node.remove(); return; }
  if (node.nodeType !== Node.ELEMENT_NODE) { node.remove(); return; }

  const el = node;
  let tag = el.tagName;
  const aliased = TAG_ALIASES[tag];
  if (aliased) {
    const replaced = document.createElement(aliased.toLowerCase());
    while (el.firstChild) replaced.appendChild(el.firstChild);
    el.replaceWith(replaced);
    cleanNode(replaced);
    return;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    el.remove();
    return;
  }

  for (const attr of Array.from(el.attributes)) {
    const allowed = ALLOWED_ATTRS[tag] || new Set();
    if (!allowed.has(attr.name.toLowerCase())) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (attr.name.toLowerCase() === 'href') {
      const safe = safeUrl(attr.value);
      if (!safe) el.removeAttribute(attr.name);
      else el.setAttribute('href', safe);
    }
  }

  if (tag === 'A') {
    el.setAttribute('rel', 'noopener noreferrer');
    el.setAttribute('target', '_blank');
  }

  for (const child of Array.from(el.childNodes)) cleanNode(child);
}

export function sanitizeEditorHtml(raw) {
  if (typeof raw !== 'string' || !raw) return '';
  const holder = document.createElement('div');
  holder.innerHTML = raw;
  for (const child of Array.from(holder.childNodes)) cleanNode(child);
  return holder.innerHTML.trim();
}

export function isLikelyEmptyHtml(raw) {
  return !sanitizeEditorHtml(raw || '').replace(/<[^>]+>/g, '').trim();
}
