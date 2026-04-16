const DEFAULT_DEBOUNCE_MS = 2000;
const OFFLINE_RETRY_MS = 6000;

export function createAutosave({
  save,
  buildPayload,
  getKey,
  getUpdatedAt,
  setUpdatedAt,
  onStatus,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  now = () => Date.now(),
  storage = defaultStorage()
} = {}) {
  if (typeof save !== 'function') throw new Error('createAutosave: save(payload, {ifMatch}) required');
  if (typeof buildPayload !== 'function') throw new Error('createAutosave: buildPayload() required');

  let timer = null;
  let inflight = null;
  let pendingDirty = false;
  let lastSavedAt = null;
  let status = { state: 'idle', savedAt: null, error: null };
  let conflict = false;

  function emit(next) {
    status = { ...status, ...next };
    if (typeof onStatus === 'function') onStatus(status);
  }

  function schedule({ immediate = false } = {}) {
    if (conflict) return;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingDirty = true;
    emit({ state: 'pending' });
    if (immediate) {
      run();
    } else {
      timer = setTimeout(run, debounceMs);
    }
  }

  async function run() {
    if (inflight) {
      pendingDirty = true;
      return;
    }
    if (!pendingDirty) return;

    pendingDirty = false;
    const payload = buildPayload();
    if (!payload) {
      emit({ state: 'idle' });
      return;
    }

    const ifMatch = typeof getUpdatedAt === 'function' ? getUpdatedAt() : undefined;
    emit({ state: 'saving' });

    inflight = (async () => {
      try {
        const result = await save(payload, { ifMatch });
        lastSavedAt = now();
        if (result && typeof result.updatedAt === 'string' && typeof setUpdatedAt === 'function') {
          setUpdatedAt(result.updatedAt);
        }
        persistLocalDraft(null);
        emit({ state: 'saved', savedAt: lastSavedAt, error: null });
        if (pendingDirty) schedule();
      } catch (error) {
        const isConflict = error && (error.code === 'stale_version' || error.status === 409);
        if (isConflict) {
          conflict = true;
          emit({ state: 'conflict', error });
          return;
        }
        persistLocalDraft(payload);
        emit({ state: 'error', error });
        if (pendingDirty) {
          setTimeout(schedule, OFFLINE_RETRY_MS);
        } else {
          setTimeout(() => {
            pendingDirty = true;
            schedule();
          }, OFFLINE_RETRY_MS);
        }
      } finally {
        inflight = null;
      }
    })();
  }

  function persistLocalDraft(payload) {
    if (!storage) return;
    const key = typeof getKey === 'function' ? getKey() : null;
    if (!key) return;
    try {
      if (payload == null) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify({ payload, savedAt: now() }));
    } catch { /* ignore quota errors */ }
  }

  function recoverLocalDraft() {
    if (!storage) return null;
    const key = typeof getKey === 'function' ? getKey() : null;
    if (!key) return null;
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pendingDirty || inflight) {
      pendingDirty = true;
      await run();
    }
    if (inflight) await inflight;
  }

  function resolveConflict() {
    conflict = false;
    emit({ state: 'idle', error: null });
  }

  function getStatus() {
    return status;
  }

  return { schedule, flush, resolveConflict, recoverLocalDraft, getStatus, persistLocalDraft };
}

function defaultStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* ignore */ }
  return null;
}
