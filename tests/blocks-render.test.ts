import { describe, expect, it } from 'vitest';
import { renderBlocks, getBlockTypes } from '../public/assets/js/core/blocks.js';

function compact(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

describe('renderBlocks — admin + public parity', () => {
  it('exports all 7 supported block types', () => {
    const types = getBlockTypes();
    for (const t of ['hero', 'text', 'image', 'gallery', 'cards', 'cta', 'divider']) {
      expect(types).toContain(t);
    }
  });

  it('renders a hero with heading, subheading, button', () => {
    const html = renderBlocks([
      {
        id: 'h1',
        type: 'hero',
        data: {
          heading: 'Welcome',
          subheading: 'Tagline',
          image: '',
          buttonText: 'Go',
          buttonHref: '/start'
        }
      }
    ]);
    expect(compact(html)).toContain('block-hero');
    expect(compact(html)).toContain('Welcome');
    expect(compact(html)).toContain('Tagline');
    expect(compact(html)).toContain('Go');
    expect(compact(html)).toContain('/start');
  });

  it('renders empty text block as empty in public mode', () => {
    const html = renderBlocks([{ id: 't1', type: 'text', data: { body: '' } }]);
    expect(html).not.toContain('contenteditable');
  });

  it('renders text block with paragraphs split on blank lines', () => {
    const html = renderBlocks([
      { id: 't2', type: 'text', data: { heading: 'About', body: 'One.\n\nTwo.' } }
    ]);
    expect(html).toContain('<p>One.</p>');
    expect(html).toContain('<p>Two.</p>');
  });

  it('adds contenteditable + data-edit in editable mode', () => {
    const html = renderBlocks(
      [{ id: 'e1', type: 'text', data: { heading: 'Hi', body: 'Body' } }],
      { editable: true }
    );
    expect(html).toContain('contenteditable="true"');
    expect(html).toContain('data-edit="heading"');
    expect(html).toContain('data-edit="body"');
    expect(html).toContain('data-block-id="e1"');
    expect(html).toContain('data-block-wrap="e1"');
    expect(html).toContain('data-block-type="text"');
  });

  it('marks activeId block with is-active class', () => {
    const html = renderBlocks(
      [{ id: 'x1', type: 'text', data: { body: 'hi' } }],
      { editable: true, activeId: 'x1' }
    );
    expect(html).toContain('is-active');
  });

  it('escapes HTML in user content', () => {
    const html = renderBlocks([
      { id: 'x', type: 'text', data: { heading: '<script>', body: 'A & B' } }
    ]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
  });

  it('renders empty gallery as empty string publicly but with empty-state editable', () => {
    const pub = renderBlocks([{ id: 'g1', type: 'gallery', data: { images: [] } }]);
    expect(pub).toBe('');
    const edit = renderBlocks(
      [{ id: 'g2', type: 'gallery', data: { images: [] } }],
      { editable: true }
    );
    expect(edit).toContain('block-gallery-empty');
  });

  it('renders cards block with title+description', () => {
    const html = renderBlocks([
      {
        id: 'c1',
        type: 'cards',
        data: {
          cards: [{ title: 'Card1', description: 'desc', href: '/a', image: '' }]
        }
      }
    ]);
    expect(html).toContain('Card1');
    expect(html).toContain('desc');
    expect(html).toContain('/a');
  });

  it('renders divider with size class', () => {
    const html = renderBlocks([{ id: 'd1', type: 'divider', data: { size: 'large' } }]);
    expect(html).toContain('block-divider-large');
  });

  it('skips unknown block types', () => {
    const html = renderBlocks([{ id: 'x', type: 'unknown', data: {} }]);
    expect(html).toBe('');
  });

  it('safeHref strips javascript: URLs from button links', () => {
    const html = renderBlocks([
      {
        id: 'cta1',
        type: 'cta',
        data: {
          heading: 'Click',
          description: 'd',
          buttonText: 'Go',
          buttonHref: 'javascript:alert(1)'
        }
      }
    ]);
    expect(html).not.toContain('javascript:alert');
  });
});
