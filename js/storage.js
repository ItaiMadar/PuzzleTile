import { MAX_STORED_SESSIONS, STORAGE_KEY } from './config.js';

export function loadDatabase(onUnavailable) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.sessions)) return saved;
  } catch {
    onUnavailable('Browser storage is unavailable. You can still play this session.');
  }
  return { sessions: [] };
}

export function saveDatabase(database, onUnavailable) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    onUnavailable('Progress could not be saved in this browser.');
  }
}

export function addSession(database, session) {
  database.sessions.unshift(session);
  database.sessions = database.sessions.slice(0, MAX_STORED_SESSIONS);
}
