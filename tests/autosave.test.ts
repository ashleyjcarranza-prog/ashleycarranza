import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createAutosave as createAutosaveRaw } from '../public/assets/js/admin/autosave.js';

const createAutosave = createAutosaveRaw as unknown as (opts: Record<string, unknown>) => {
  schedule(opts?: { immediate?: boolean }): void;
  flush(): Promise<void>;
  resolveConflict(): void;
  getStatus(): { state: string };
  persistLocalDraft(payload: unknown): void;
  recoverLocalDraft(): { payload: unknown; savedAt: number } | null;
};

function memoryStorage(): Storage & { _peek(): Map<string, string> } {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear() { map.clear(); },
    key(i: number) { return Array.from(map.keys())[i] ?? null; },
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    _peek: () => map
  };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('createAutosave', () => {
  it('debounces saves until idle for debounceMs', async () => {
    const save = vi.fn().mockResolvedValue({ updatedAt: 'v1' });
    const autosave = createAutosave({
      save,
      buildPayload: () => ({ title: 'hi' }),
      getKey: () => 'draft:1',
      getUpdatedAt: () => null,
      setUpdatedAt: () => {},
      onStatus: () => {},
      debounceMs: 1000,
      storage: memoryStorage()
    });

    autosave.schedule();
    autosave.schedule();
    autosave.schedule();
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('emits saving → saved on success', async () => {
    const states: string[] = [];
    const save = vi.fn().mockResolvedValue({ updatedAt: 'v2' });
    const autosave = createAutosave({
      save,
      buildPayload: () => ({ a: 1 }),
      getKey: () => 'k',
      onStatus: (s: { state: string }) => states.push(s.state),
      debounceMs: 10,
      storage: memoryStorage()
    });

    autosave.schedule();
    await vi.advanceTimersByTimeAsync(20);
    await autosave.flush();

    expect(states).toContain('pending');
    expect(states).toContain('saving');
    expect(states).toContain('saved');
  });

  it('stores local draft on error and emits error state', async () => {
    const storage = memoryStorage();
    const save = vi.fn().mockRejectedValue(new Error('network down'));
    const states: string[] = [];
    const autosave = createAutosave({
      save,
      buildPayload: () => ({ x: 1 }),
      getKey: () => 'draft-key',
      onStatus: (s: { state: string }) => states.push(s.state),
      debounceMs: 5,
      storage
    });
    autosave.schedule();
    await vi.advanceTimersByTimeAsync(20);
    await Promise.resolve();
    expect(storage.getItem('draft-key')).toBeTruthy();
    expect(states).toContain('error');
  });

  it('halts and emits conflict on 409 stale_version', async () => {
    const err: Error & { code?: string } = new Error('stale');
    err.code = 'stale_version';
    const save = vi.fn().mockRejectedValue(err);
    const states: string[] = [];
    const autosave = createAutosave({
      save,
      buildPayload: () => ({ x: 1 }),
      getKey: () => null,
      onStatus: (s: { state: string }) => states.push(s.state),
      debounceMs: 5,
      storage: memoryStorage()
    });

    autosave.schedule();
    await vi.advanceTimersByTimeAsync(20);
    await Promise.resolve();
    expect(states).toContain('conflict');

    save.mockClear();
    autosave.schedule();
    await vi.advanceTimersByTimeAsync(100);
    expect(save).not.toHaveBeenCalled();
  });

  it('passes ifMatch header value from getUpdatedAt', async () => {
    const save = vi.fn().mockResolvedValue({ updatedAt: 'new' });
    const autosave = createAutosave({
      save,
      buildPayload: () => ({ x: 1 }),
      getUpdatedAt: () => '2026-04-16T00:00:00Z',
      debounceMs: 5,
      storage: memoryStorage()
    });
    autosave.schedule();
    await vi.advanceTimersByTimeAsync(20);
    await autosave.flush();
    expect(save).toHaveBeenCalledWith({ x: 1 }, { ifMatch: '2026-04-16T00:00:00Z' });
  });

  it('flush triggers immediate save of pending payload', async () => {
    const save = vi.fn().mockResolvedValue({ updatedAt: 'now' });
    const autosave = createAutosave({
      save,
      buildPayload: () => ({ hi: 1 }),
      debounceMs: 99999,
      storage: memoryStorage()
    });
    autosave.schedule();
    await autosave.flush();
    expect(save).toHaveBeenCalled();
  });

  it('skips save when buildPayload returns null (no active page)', async () => {
    const save = vi.fn();
    const autosave = createAutosave({
      save,
      buildPayload: () => null,
      debounceMs: 5,
      storage: memoryStorage()
    });
    autosave.schedule();
    await vi.advanceTimersByTimeAsync(20);
    expect(save).not.toHaveBeenCalled();
  });
});
