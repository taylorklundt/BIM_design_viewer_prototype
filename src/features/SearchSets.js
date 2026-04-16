/**
 * SearchSets — Feature plugin for saved search queries.
 *
 * Manages CRUD lifecycle of search sets, delegates execution
 * to SearchQueryEngine, and fires events for UI / integration.
 */
import { SearchSetStorage } from '../services/SearchSetStorage.js';
import { SearchQueryEngine } from '../services/SearchQueryEngine.js';

export class SearchSets {
  constructor(sceneManager, options = {}) {
    this.sceneManager = sceneManager;
    this.ifcLoader = options.ifcLoader || null;
    this.selection = options.selection || null;
    this.sectioning = options.sectioning || null;

    this.storage = new SearchSetStorage();
    this.engine = null;

    this.lastResults = [];
    this.eventListeners = new Map();
  }

  enable() {
    this._ensureEngine();
  }

  disable() {
    this.lastResults = [];
  }

  // ── CRUD ──────────────────────────────────────────────────────

  getAll() {
    return this.storage.getAll();
  }

  getById(id) {
    return this.storage.getById(id);
  }

  save(searchSet) {
    const saved = this.storage.save(searchSet);
    this.emit('search-saved', saved);
    return saved;
  }

  delete(id) {
    this.storage.delete(id);
    this.emit('search-deleted', { id });
  }

  rename(id, newName) {
    const existing = this.storage.getById(id);
    if (!existing) return null;
    existing.name = newName;
    return this.save(existing);
  }

  // ── Execution ─────────────────────────────────────────────────

  execute(searchSetOrId) {
    this._ensureEngine();

    const searchSet = typeof searchSetOrId === 'string'
      ? this.storage.getById(searchSetOrId)
      : searchSetOrId;

    if (!searchSet) return [];

    // Rebuild the index each time so it reflects the current model state
    this.engine.buildIndex();

    const results = this.engine.execute(searchSet);
    this.lastResults = results;
    this.emit('search-executed', { searchSet, results });
    return results;
  }

  executeAndSelect(searchSetOrId) {
    const results = this.execute(searchSetOrId);

    if (this.selection) {
      this.selection.deselect();
      if (results.length > 0) {
        // Convert expressIDs to mesh UUIDs that Selection can resolve
        const selectableIds = this.engine.toSelectableIds(results);
        console.log(`[SearchSets] ${results.length} matching elements → ${selectableIds.length} selectable meshes`);
        this.selection.selectByIds(selectableIds);
      }
    }

    return results;
  }

  getLastResults() {
    return this.lastResults;
  }

  /**
   * Run scene diagnostics — logs all element properties the engine can see.
   * Call from browser console: viewer.searchSets.diagnose()
   */
  diagnose() {
    this._ensureEngine();
    this.engine.buildIndex();
    return this.engine.diagnose();
  }

  // ── Engine bootstrap ──────────────────────────────────────────

  _ensureEngine() {
    if (this.engine) return;
    const scene = this.sceneManager.getScene();
    this.engine = new SearchQueryEngine(scene, {
      ifcLoader: this.ifcLoader,
      selection: this.selection,
      sectioning: this.sectioning,
    });
  }

  // ── Event system ──────────────────────────────────────────────

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(cb => cb(data));
    }
  }

  destroy() {
    this.lastResults = [];
    this.eventListeners.clear();
  }
}
