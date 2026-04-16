import { describe, expect, it, vi } from 'vitest';
import { createHistory } from '../public/assets/js/admin/history.js';

function makeSpyEntry() {
  const undo = vi.fn();
  const redo = vi.fn();
  return { undo, redo };
}

describe('createHistory', () => {
  it('starts empty', () => {
    const h = createHistory();
    const snap = h.snapshot();
    expect(snap.canUndo).toBe(false);
    expect(snap.canRedo).toBe(false);
  });

  it('push enables undo and clears future stack', () => {
    const h = createHistory();
    const e = makeSpyEntry();
    h.push('add hero', e);
    expect(h.snapshot().canUndo).toBe(true);

    h.undo();
    expect(h.snapshot().canRedo).toBe(true);

    const e2 = makeSpyEntry();
    h.push('add text', e2);
    expect(h.snapshot().canRedo).toBe(false);
  });

  it('undo invokes undo handler; redo invokes redo handler', () => {
    const h = createHistory();
    const e = makeSpyEntry();
    h.push('x', e);
    h.undo();
    expect(e.undo).toHaveBeenCalledTimes(1);
    expect(e.redo).not.toHaveBeenCalled();
    h.redo();
    expect(e.redo).toHaveBeenCalledTimes(1);
  });

  it('caps past stack at 50 entries (FIFO eviction)', () => {
    const h = createHistory();
    for (let i = 0; i < 60; i++) h.push(`op ${i}`, makeSpyEntry());
    expect(h.snapshot().pastSize).toBe(50);
  });

  it('rejects push without undo+redo functions', () => {
    const h = createHistory();
    expect(() => h.push('bad', {} as unknown as { undo: () => void; redo: () => void })).toThrow();
  });

  it('subscribe fires immediately and on change', () => {
    const h = createHistory();
    const fn = vi.fn();
    h.subscribe(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    h.push('x', makeSpyEntry());
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('clear empties both stacks', () => {
    const h = createHistory();
    h.push('x', makeSpyEntry());
    h.undo();
    h.clear();
    const snap = h.snapshot();
    expect(snap.canUndo).toBe(false);
    expect(snap.canRedo).toBe(false);
  });

  it('undo on empty returns null', () => {
    const h = createHistory();
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBeNull();
  });
});
