export type SavedLaterItem = {
  id: string;
  title: string;
  dueAt: number;
};

const KEY = '__saved_later__';

export function getSavedLater(): SavedLaterItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export function addSavedLater(id: string, title: string, hours = 24) {
  const dueAt = Date.now() + hours * 60 * 60 * 1000;
  const list = getSavedLater().filter(i => i.id !== id);
  list.push({ id, title, dueAt });
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function removeSavedLater(id: string) {
  const list = getSavedLater().filter(i => i.id !== id);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function popDue(): SavedLaterItem[] {
  const now = Date.now();
  const list = getSavedLater();
  const due = list.filter(i => i.dueAt <= now);
  const remaining = list.filter(i => i.dueAt > now);
  try { localStorage.setItem(KEY, JSON.stringify(remaining)); } catch {}
  return due;
}
