// Tiny HTML allowlist sanitizer. Workers-compatible (no DOM).
// Accepts a small set of tags + attributes and re-emits normalized HTML.
// Strips everything else, including scripts, styles, event handlers, javascript: hrefs.

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'a', 'h2', 'h3', 'ul', 'ol', 'li']);
const VOID_TAGS = new Set(['br']);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href'])
};
const URL_ATTRS = new Set(['href']);

type Token =
  | { kind: 'open'; tag: string; attrs: Record<string, string>; selfClose: boolean }
  | { kind: 'close'; tag: string }
  | { kind: 'text'; text: string };

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      tokens.push({ kind: 'text', text: html.slice(i) });
      break;
    }
    if (lt > i) tokens.push({ kind: 'text', text: html.slice(i, lt) });

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }

    const gt = html.indexOf('>', lt);
    if (gt === -1) {
      tokens.push({ kind: 'text', text: html.slice(lt) });
      break;
    }

    const raw = html.slice(lt + 1, gt).trim();
    if (raw.startsWith('/')) {
      tokens.push({ kind: 'close', tag: raw.slice(1).trim().toLowerCase() });
    } else {
      const selfClose = raw.endsWith('/');
      const body = selfClose ? raw.slice(0, -1).trim() : raw;
      const spaceIdx = body.search(/\s/);
      const tag = (spaceIdx === -1 ? body : body.slice(0, spaceIdx)).toLowerCase();
      const attrs: Record<string, string> = {};
      if (spaceIdx !== -1) {
        const attrString = body.slice(spaceIdx + 1);
        const attrRegex = /([a-zA-Z_:][\w:.-]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
        let match: RegExpExecArray | null;
        while ((match = attrRegex.exec(attrString)) !== null) {
          const name = match[1].toLowerCase();
          let value = match[2] || '';
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          attrs[name] = value;
        }
      }
      tokens.push({ kind: 'open', tag, attrs, selfClose });
    }

    i = gt + 1;
  }
  return tokens;
}

function decodeEntities(text: string) {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ');
}

function encodeText(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function encodeAttr(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function safeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  // Allow relative, mailto:, tel:, http(s), and anchors
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return ''; // blocked scheme (javascript:, data:, etc.)
  return trimmed;
}

export function sanitizeHtml(raw: string, maxLength = 20_000): string {
  if (typeof raw !== 'string' || !raw) return '';
  const input = raw.length > maxLength ? raw.slice(0, maxLength) : raw;
  const tokens = tokenize(input);
  const out: string[] = [];
  const stack: string[] = [];

  for (const token of tokens) {
    if (token.kind === 'text') {
      out.push(encodeText(decodeEntities(token.text)));
      continue;
    }
    if (token.kind === 'open') {
      if (!ALLOWED_TAGS.has(token.tag)) continue;
      const allowed = ALLOWED_ATTRS[token.tag] || new Set<string>();
      const rendered: string[] = [token.tag];
      for (const [name, value] of Object.entries(token.attrs)) {
        if (!allowed.has(name)) continue;
        let safe = value;
        if (URL_ATTRS.has(name)) {
          safe = safeUrl(value);
          if (!safe) continue;
        }
        rendered.push(`${name}="${encodeAttr(safe)}"`);
      }
      if (token.tag === 'a') {
        rendered.push('rel="noopener noreferrer"');
        rendered.push('target="_blank"');
      }
      if (VOID_TAGS.has(token.tag)) {
        out.push(`<${rendered.join(' ')} />`);
      } else {
        out.push(`<${rendered.join(' ')}>`);
        stack.push(token.tag);
      }
      continue;
    }
    if (token.kind === 'close') {
      if (!ALLOWED_TAGS.has(token.tag) || VOID_TAGS.has(token.tag)) continue;
      const idx = stack.lastIndexOf(token.tag);
      if (idx === -1) continue;
      while (stack.length > idx) {
        const top = stack.pop();
        if (top) out.push(`</${top}>`);
      }
    }
  }

  while (stack.length) out.push(`</${stack.pop()}>`);
  return out.join('');
}

export function stripHtml(raw: string): string {
  return sanitizeHtml(raw).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}
