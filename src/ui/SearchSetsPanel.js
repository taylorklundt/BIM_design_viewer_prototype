/**
 * SearchSetsPanel — Manager-only UI for saved search sets.
 *
 * Left sidebar panel (280px, same as TreePanel). Shows a flat list
 * of saved search sets with inline name editing, execute-on-click,
 * and delete. No constructor/builder UI in this iteration.
 */
export class SearchSetsPanel {
  constructor(container, searchSets) {
    this.container = container;
    this.searchSets = searchSets;

    this.panel = null;
    this.listContainer = null;
    this.isOpen = false;
    this.editingId = null; // id currently being renamed inline

    this.eventListeners = new Map();

    this.init();
    this._listenToFeatureEvents();
  }

  init() {
    this.createPanel();
  }

  // ── Panel creation ────────────────────────────────────────────

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'mv-panel mv-search-sets-panel mv-hidden';
    this.panel.innerHTML = `
      <div class="mv-panel-header">
        <span>Search Sets</span>
        <div class="mv-panel-header-actions">
          <button class="mv-panel-close" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="mv-panel-content mv-ss-content">
        <div class="mv-ss-list"></div>
        <div class="mv-ss-empty mv-hidden">
          <span class="mv-ss-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
              <circle cx="10" cy="10" r="7"/>
              <line x1="21" y1="21" x2="15" y2="15"/>
            </svg>
          </span>
          <span>No search sets saved yet.</span>
        </div>
      </div>
    `;

    this.container.appendChild(this.panel);

    this.listContainer = this.panel.querySelector('.mv-ss-list');
    this.emptyState = this.panel.querySelector('.mv-ss-empty');

    this._setupEvents();
  }

  // ── Event wiring ──────────────────────────────────────────────

  _setupEvents() {
    this.panel.querySelector('.mv-panel-close').addEventListener('click', () => {
      this.close();
    });

    // Delegated click handling on list items
    this.listContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.mv-ss-item');
      if (!item) return;
      const id = item.dataset.id;

      if (e.target.closest('.mv-ss-delete-btn')) {
        this._handleDelete(id);
      } else if (e.target.closest('.mv-ss-edit-btn')) {
        this._startInlineEdit(id);
      } else if (!this.editingId) {
        this._handleExecute(id);
      }
    });

    // Inline-edit: commit on Enter/blur, cancel on Escape
    this.listContainer.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('mv-ss-name-input')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          this._commitInlineEdit(e.target);
        } else if (e.key === 'Escape') {
          this.editingId = null;
          this.render();
        }
      }
    });

    this.listContainer.addEventListener('focusout', (e) => {
      if (e.target.classList.contains('mv-ss-name-input') && this.editingId) {
        this._commitInlineEdit(e.target);
      }
    });
  }

  _listenToFeatureEvents() {
    this.searchSets.on('search-saved', () => this.render());
    this.searchSets.on('search-deleted', () => this.render());
  }

  // ── Actions ───────────────────────────────────────────────────

  _handleExecute(id) {
    const set = this.searchSets.getById(id);
    if (set) {
      console.log(`[SearchSetsPanel] Executing "${set.name}" (${id})`, {
        conditions: set.conditions,
        scope: set.scope,
        mode: set.mode,
      });
    }
    const results = this.searchSets.executeAndSelect(id);
    console.log(`[SearchSetsPanel] Executed "${id}" → ${results.length} match(es)`, results);

    if (results.length === 0) {
      console.warn('[SearchSetsPanel] 0 matches — running auto-diagnosis…');
      this.searchSets.diagnose();
    }

    this.emit('search-executed', { id, count: results.length });

    // Flash the item and show result count
    const item = this.listContainer.querySelector(`.mv-ss-item[data-id="${id}"]`);
    if (item) {
      item.classList.add('mv-ss-flash');
      const meta = item.querySelector('.mv-ss-meta');
      if (meta) {
        const original = meta.textContent;
        meta.textContent = `${results.length} element${results.length !== 1 ? 's' : ''} found`;
        meta.style.color = results.length > 0 ? 'var(--mv-success)' : 'var(--mv-warning)';
        setTimeout(() => {
          meta.textContent = original;
          meta.style.color = '';
        }, 2000);
      }
      setTimeout(() => item.classList.remove('mv-ss-flash'), 600);
    }
  }

  _handleDelete(id) {
    const set = this.searchSets.getById(id);
    const name = set ? set.name : 'this search set';
    if (!confirm(`Delete "${name}"?`)) return;
    this.searchSets.delete(id);
  }

  _startInlineEdit(id) {
    this.editingId = id;
    this.render();

    // Auto-focus & select
    const input = this.listContainer.querySelector('.mv-ss-name-input');
    if (input) {
      input.focus();
      input.select();
    }
  }

  _commitInlineEdit(input) {
    const id = this.editingId;
    const newName = input.value.trim();
    this.editingId = null;

    if (newName && id) {
      this.searchSets.rename(id, newName);
    } else {
      this.render();
    }
  }

  // ── Rendering ─────────────────────────────────────────────────

  render() {
    const sets = this.searchSets.getAll();

    if (sets.length === 0) {
      this.listContainer.innerHTML = '';
      this.emptyState.classList.remove('mv-hidden');
      return;
    }

    this.emptyState.classList.add('mv-hidden');

    const sorted = [...sets].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    this.listContainer.innerHTML = sorted.map(s => this._renderItem(s)).join('');
  }

  _renderItem(set) {
    const isEditing = this.editingId === set.id;
    const date = this._formatDate(set.updatedAt);
    const condCount = this._countConditions(set.conditions);
    const scopeLabel = this._scopeLabel(set.scope);

    const nameHtml = isEditing
      ? `<input class="mv-ss-name-input" type="text"
             value="${this._escapeAttr(set.name)}"
             data-id="${set.id}" />`
      : `<span class="mv-ss-name" title="${this._escapeAttr(set.name)}">${this._escapeHtml(set.name)}</span>`;

    return `
      <div class="mv-ss-item" data-id="${set.id}">
        <div class="mv-ss-item-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="10" cy="10" r="7"/>
            <line x1="21" y1="21" x2="15" y2="15"/>
            <line x1="7" y1="8" x2="13" y2="8"/>
            <line x1="7" y1="11" x2="11" y2="11"/>
          </svg>
        </div>
        <div class="mv-ss-item-body">
          ${nameHtml}
          <span class="mv-ss-meta">${condCount} condition${condCount !== 1 ? 's' : ''} · ${scopeLabel} · ${date}</span>
        </div>
        <div class="mv-ss-item-actions">
          <button class="mv-ss-edit-btn" title="Rename">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="mv-ss-delete-btn" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // ── Panel open / close ────────────────────────────────────────

  open() {
    this.panel.classList.remove('mv-hidden');
    this.isOpen = true;
    this.render();
    this.emit('open');
  }

  close() {
    this.panel.classList.add('mv-hidden');
    this.isOpen = false;
    this.editingId = null;
    this.emit('close');
  }

  toggle() {
    if (this.isOpen) this.close(); else this.open();
  }

  // ── Helpers ───────────────────────────────────────────────────

  _countConditions(conditions) {
    if (!conditions || !conditions.rules) return 0;
    let count = 0;
    for (const rule of conditions.rules) {
      if (rule.type === 'group') {
        count += this._countConditions(rule);
      } else {
        count++;
      }
    }
    return count;
  }

  _scopeLabel(scope) {
    const map = {
      entireModel: 'Entire Model',
      currentSelection: 'Selection',
      appliedSectionBox: 'Section Box',
    };
    return map[scope?.type] || 'Entire Model';
  }

  _formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  _escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  _escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    if (this.panel) this.panel.remove();
    this.eventListeners.clear();
  }
}
