export const STORAGE_KEY = 'imperio-family-data';
export const DATA_VERSION = 1;

export const initialData = {
  version: DATA_VERSION,
  members: [], absences: [], attendance: [], events: [], blacklist: [], football: [],
  minutes: [], sanctions: [], dues: [], transactions: [], loans: [], purchases: [],
  inventory: [], inventoryMoves: [], vehicles: [], families: [], news: [], activities: [],
  permissions: {},
  settings: {
    familyName: 'Corleone City', currency: '$', weeklyCash: 50000, weeklyItem: 20,
    weeklyItemName: 'Kibbeling', ranks: ['Boss', 'Underboss', 'Consigliere', 'Capo', 'Sottocapo', 'Soldier', 'Associate', 'Member'],
  },
};

export function loadData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.version === DATA_VERSION) return normalizeData(stored);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return normalizeData(initialData);
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
}

export function normalizeData(data) {
  return {
    ...structuredClone(initialData),
    ...data,
    version: DATA_VERSION,
    settings: { ...initialData.settings, ...(data?.settings || {}) },
  };
}

export function exportData(data) {
  return JSON.stringify({ ...data, version: DATA_VERSION, exportedAt: new Date().toISOString() }, null, 2);
}

export function validateImport(data) {
  return data && data.version === DATA_VERSION && Array.isArray(data.members) && data.settings && typeof data.settings === 'object';
}