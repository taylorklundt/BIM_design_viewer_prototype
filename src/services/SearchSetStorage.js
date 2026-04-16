/**
 * SearchSetStorage — localStorage-backed persistence for search sets.
 * Interface designed for easy swap to a server-side API.
 */
export class SearchSetStorage {
  constructor(storageKey = 'mv-search-sets') {
    this.storageKey = storageKey;
    this._ensureDefaults();
  }

  _read() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _write(sets) {
    localStorage.setItem(this.storageKey, JSON.stringify(sets));
  }

  _ensureDefaults() {
    const existing = this._read();
    // Always replace seed-* entries with latest SEED_DATA so schema changes propagate
    const userSets = existing.filter(s => !s.id?.startsWith('seed-'));
    if (existing.length === 0 || existing.some(s => s.id?.startsWith('seed-'))) {
      this._write([...SearchSetStorage.SEED_DATA, ...userSets]);
    } else if (existing.length === 0) {
      this._write([...SearchSetStorage.SEED_DATA]);
    }
  }

  getAll() {
    return this._read();
  }

  getById(id) {
    return this._read().find(s => s.id === id) || null;
  }

  save(searchSet) {
    const sets = this._read();
    const now = new Date().toISOString();

    if (searchSet.id) {
      const idx = sets.findIndex(s => s.id === searchSet.id);
      if (idx !== -1) {
        sets[idx] = { ...sets[idx], ...searchSet, updatedAt: now };
        this._write(sets);
        return sets[idx];
      }
    }

    const newSet = {
      ...searchSet,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    sets.push(newSet);
    this._write(sets);
    return newSet;
  }

  delete(id) {
    const sets = this._read().filter(s => s.id !== id);
    this._write(sets);
  }

  clear() {
    this._write([]);
  }

  static get SEED_DATA() {
    return [
      {
        id: 'seed-walls',
        name: 'All Walls',
        createdAt: '2025-06-01T08:00:00Z',
        updatedAt: '2025-06-01T08:00:00Z',
        scope: { type: 'entireModel' },
        mode: 'within',
        conditions: {
          logic: 'and',
          rules: [
            { type: 'condition', category: 'Element', property: 'type', operator: 'contains', value: 'Wall' }
          ]
        }
      },
      {
        id: 'seed-slabs',
        name: 'All Slabs',
        createdAt: '2025-06-01T09:00:00Z',
        updatedAt: '2025-06-01T09:00:00Z',
        scope: { type: 'entireModel' },
        mode: 'within',
        conditions: {
          logic: 'and',
          rules: [
            { type: 'condition', category: 'Element', property: 'type', operator: 'contains', value: 'Slab' }
          ]
        }
      },
      {
        id: 'seed-doors-windows',
        name: 'Doors & Windows',
        createdAt: '2025-06-01T10:00:00Z',
        updatedAt: '2025-06-01T10:00:00Z',
        scope: { type: 'entireModel' },
        mode: 'within',
        conditions: {
          logic: 'or',
          rules: [
            { type: 'condition', category: 'Element', property: 'type', operator: 'contains', value: 'Door' },
            { type: 'condition', category: 'Element', property: 'type', operator: 'contains', value: 'Window' }
          ]
        }
      }
    ];
  }
}
