const MAX_ENTRIES = 50;

export function createHistory() {
  const past = [];
  const future = [];
  const listeners = new Set();

  function emit() {
    for (const fn of listeners) {
      try { fn(snapshot()); } catch { /* ignore */ }
    }
  }

  function snapshot() {
    return {
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      pastSize: past.length,
      futureSize: future.length,
      lastUndoDescription: past.length ? past[past.length - 1].description : null,
      lastRedoDescription: future.length ? future[future.length - 1].description : null
    };
  }

  function push(description, { undo, redo }) {
    if (typeof undo !== 'function' || typeof redo !== 'function') {
      throw new Error('history.push requires undo + redo functions');
    }
    past.push({ description, undo, redo });
    while (past.length > MAX_ENTRIES) past.shift();
    future.length = 0;
    emit();
  }

  function undo() {
    const entry = past.pop();
    if (!entry) return null;
    entry.undo();
    future.push(entry);
    emit();
    return entry.description || null;
  }

  function redo() {
    const entry = future.pop();
    if (!entry) return null;
    entry.redo();
    past.push(entry);
    emit();
    return entry.description || null;
  }

  function clear() {
    past.length = 0;
    future.length = 0;
    emit();
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn(snapshot());
    return () => listeners.delete(fn);
  }

  return { push, undo, redo, clear, subscribe, snapshot };
}

export function bindUndoHotkeys(history, { target = window } = {}) {
  const handler = (event) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    const isShift = event.shiftKey;
    if (key === 'z' && !isShift) {
      if (isEditableTargetWithOwnUndo(event.target)) return;
      event.preventDefault();
      history.undo();
    } else if ((key === 'z' && isShift) || key === 'y') {
      if (isEditableTargetWithOwnUndo(event.target)) return;
      event.preventDefault();
      history.redo();
    }
  };
  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}

function isEditableTargetWithOwnUndo(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (el.isContentEditable) return true;
  return false;
}
