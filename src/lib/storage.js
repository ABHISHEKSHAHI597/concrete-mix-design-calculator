/**
 * Saved designs, held in the browser's local storage.
 * Nothing leaves the machine; there is no server behind this page.
 */

const KEY = 'is10262.designs.v1';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function listDesigns() {
  return read().sort((a, b) => b.savedAt - a.savedAt);
}

export function saveDesign(name, input, summary) {
  const list = read();
  const entry = {
    id: `d${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    name: name || 'Untitled design',
    savedAt: Date.now(),
    input,
    summary,
  };
  list.push(entry);
  write(list);
  return entry;
}

export function deleteDesign(id) {
  write(read().filter((d) => d.id !== id));
}

export function renameDesign(id, name) {
  write(read().map((d) => (d.id === id ? { ...d, name } : d)));
}

export function exportDesigns() {
  return JSON.stringify(read(), null, 2);
}

export function importDesigns(json) {
  const incoming = JSON.parse(json);
  if (!Array.isArray(incoming)) throw new Error('Expected a list of designs.');
  const existing = read();
  const ids = new Set(existing.map((d) => d.id));
  const merged = [...existing, ...incoming.filter((d) => d && d.id && !ids.has(d.id))];
  write(merged);
  return merged.length - existing.length;
}
