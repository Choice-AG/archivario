export const STORAGE_KEYS = { items: "archivario:items", sagas: "archivario:sagas", prefs: "archivario:prefs" };

export async function storageLoad(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
export async function storageSave(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("No se pudo guardar", key, e);
  }
}
