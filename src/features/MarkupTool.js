/**
 * MarkupTool — 2D canvas-overlay markup engine for the 3D viewer.
 *
 * Supports 8 tools: select, text, line, shape, freehand, callout,
 * highlighter, cloud. All coordinates stored in normalised [0-1] space
 * relative to the canvas so markups survive resize.
 */

let _markupIdCounter = 0;
function uid() { return `mk-${Date.now()}-${++_markupIdCounter}`; }

// ── Cloud helper — draw scalloped arc edges around a rect ────────────────────
function drawCloud(ctx, x, y, w, h) {
  if (w <= 0 || h <= 0) return;
  const perimeter = 2 * (w + h);
  const targetArc = Math.max(12, Math.min(w, h) * 0.18);
  const count = Math.max(8, Math.round(perimeter / (targetArc * 2)));

  const topN  = Math.max(2, Math.round((w / perimeter) * count));
  const rightN = Math.max(2, Math.round((h / perimeter) * count));
  const botN  = topN;
  const leftN = rightN;

  ctx.beginPath();
  // top edge — arcs bulge upward
  for (let i = 0; i < topN; i++) {
    const x0 = x + (w * i) / topN;
    const x1 = x + (w * (i + 1)) / topN;
    const mx = (x0 + x1) / 2;
    const r = (x1 - x0) / 2;
    ctx.arc(mx, y, r, Math.PI, 0, false);
  }
  // right edge — arcs bulge rightward
  for (let i = 0; i < rightN; i++) {
    const y0 = y + (h * i) / rightN;
    const y1 = y + (h * (i + 1)) / rightN;
    const my = (y0 + y1) / 2;
    const r = (y1 - y0) / 2;
    ctx.arc(x + w, my, r, -Math.PI / 2, Math.PI / 2, false);
  }
  // bottom edge — arcs bulge downward (right to left)
  for (let i = 0; i < botN; i++) {
    const x1 = x + w - (w * i) / botN;
    const x0 = x + w - (w * (i + 1)) / botN;
    const mx = (x0 + x1) / 2;
    const r = (x1 - x0) / 2;
    ctx.arc(mx, y + h, r, 0, Math.PI, false);
  }
  // left edge — arcs bulge leftward (bottom to top)
  for (let i = 0; i < leftN; i++) {
    const y1 = y + h - (h * i) / leftN;
    const y0 = y + h - (h * (i + 1)) / leftN;
    const my = (y0 + y1) / 2;
    const r = (y1 - y0) / 2;
    ctx.arc(x, my, r, Math.PI / 2, -Math.PI / 2, false);
  }
  ctx.closePath();
}

export class MarkupTool {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.eventListeners = new Map();
    this.isActive = false;

    // Canvas overlay
    this.canvas = null;
    this.ctx = null;
    this._readOnlyMode = false;

    // Current tool & style
    this.currentTool = null;
    this.color = '#FF0000';
    this.strokeWidth = 3;
    this.opacity = 1;

    // Markups being displayed (from the current view)
    this.markups = [];

    // Drawing state
    this._drawing = false;
    this._drawData = null;

    // Selection
    this._selectedId = null;
    this._dragOffset = null;

    // Text editing
    this._textInput = null;

    // Undo / redo
    this._undoStack = [];
    this._redoStack = [];

    // Bound handlers
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onResize = this._handleResize.bind(this);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  enable() {
    if (this.isActive) return;
    this.isActive = true;
    this._readOnlyMode = false;
    this._ensureCanvas();
    this.canvas.style.opacity = '1';
    this.canvas.style.transition = 'opacity 140ms ease';
    this.canvas.style.pointerEvents = 'auto';
    this.canvas.style.cursor = 'crosshair';
    this._attachListeners();
    this.render();
  }

  disable() {
    if (!this.isActive) return;
    this.isActive = false;
    this._readOnlyMode = false;
    this._closeTextInput();
    this._detachListeners();
    if (this.canvas) {
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.cursor = 'default';
      this.canvas.style.opacity = '0';
    }
    this._drawing = false;
    this._drawData = null;
    this._selectedId = null;
    this.clearCanvas();
  }

  /** Show markups read-only (pointer-events off, visible overlay). */
  showReadOnly(markups, fadeIn = false) {
    this._ensureCanvas();
    this.markups = markups || [];
    this._readOnlyMode = true;
    this.canvas.style.transition = 'opacity 140ms ease';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.opacity = fadeIn ? '0' : '1';
    this.render();
    if (fadeIn) {
      requestAnimationFrame(() => {
        if (!this.canvas || !this._readOnlyMode || this.isActive) return;
        this.canvas.style.opacity = '1';
      });
    }
  }

  /** Hide the overlay entirely. */
  hideOverlay() {
    if (this.isActive) return;
    if (this.canvas) {
      this.clearCanvas();
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.opacity = '0';
    }
    this._readOnlyMode = false;
  }

  renderIfActive() {
    if (this.isActive || this._readOnlyMode) this.render();
  }

  destroy() {
    this.disable();
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.eventListeners.clear();
  }

  // ── Tool / style ───────────────────────────────────────────────────────────

  setTool(tool) {
    this._closeTextInput();
    this._selectedId = null;
    this.currentTool = tool;
    if (this.canvas) {
      this.canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    }
    this.render();
  }

  setColor(c)        { this.color = c; }
  setStrokeWidth(w)  { this.strokeWidth = w; }
  setOpacity(o)      { this.opacity = o; }

  // ── Markup data ────────────────────────────────────────────────────────────

  /** Load markups for the current view (called by adapter). */
  loadMarkups(markups) {
    this.markups = markups ? markups.map((m) => ({ ...m })) : [];
    this._undoStack = [];
    this._redoStack = [];
    this.render();
  }

  /** Return current markups array. */
  getMarkups() { return this.markups; }

  getSelectedMarkupId() { return this._selectedId; }

  // ── Undo / redo ────────────────────────────────────────────────────────────

  undo() {
    if (this._undoStack.length === 0) return;
    const snapshot = this._undoStack.pop();
    this._redoStack.push(this.markups.map((m) => ({ ...m })));
    this.markups = snapshot;
    this.render();
    this.emit('markups-changed', this.markups);
  }

  redo() {
    if (this._redoStack.length === 0) return;
    const snapshot = this._redoStack.pop();
    this._undoStack.push(this.markups.map((m) => ({ ...m })));
    this.markups = snapshot;
    this.render();
    this.emit('markups-changed', this.markups);
  }

  _pushUndo() {
    this._undoStack.push(this.markups.map((m) => ({ ...m })));
    this._redoStack = [];
  }

  // ── Canvas management ──────────────────────────────────────────────────────

  _ensureCanvas() {
    if (this.canvas) return;
    const container = this.sceneManager.getDomElement().parentElement || this.sceneManager.getDomElement();
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      position: 'absolute',
      top: '0', left: '0',
      width: '100%', height: '100%',
      pointerEvents: 'none',
      zIndex: '100',
      opacity: '0',
      transition: 'opacity 140ms ease',
    });
    container.appendChild(this.canvas);
    this._syncSize();
    this.ctx = this.canvas.getContext('2d');
  }

  _syncSize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    const p = this.canvas.parentElement;
    if (p) this.ctx.clearRect(0, 0, p.clientWidth, p.clientHeight);
  }

  // ── Coordinate helpers (normalised 0-1 ↔ pixel) ───────────────────────────

  _nToP(nx, ny) {
    const p = this.canvas?.parentElement;
    if (!p) return { x: 0, y: 0 };
    return { x: nx * p.clientWidth, y: ny * p.clientHeight };
  }

  _pToN(px, py) {
    const p = this.canvas?.parentElement;
    if (!p) return { x: 0, y: 0 };
    return { x: px / p.clientWidth, y: py / p.clientHeight };
  }

  _pointerNorm(e) {
    const rect = this.canvas.getBoundingClientRect();
    return this._pToN(e.clientX - rect.left, e.clientY - rect.top);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  render() {
    if (!this.ctx || !this.canvas) return;
    this.clearCanvas();
    for (const m of this.markups) {
      this._drawMarkup(m, m.id === this._selectedId);
    }
    if (this._drawing && this._drawData) {
      this._drawLivePreview();
    }
  }

  _drawMarkup(m, selected) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = m.opacity ?? 1;
    ctx.strokeStyle = m.color || '#FF0000';
    ctx.fillStyle = m.color || '#FF0000';
    ctx.lineWidth = m.strokeWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (m.type) {
      case 'line':      this._renderLine(ctx, m); break;
      case 'shape':     this._renderShape(ctx, m); break;
      case 'freehand':  this._renderFreehand(ctx, m); break;
      case 'highlighter': this._renderHighlighter(ctx, m); break;
      case 'cloud':     this._renderCloud(ctx, m); break;
      case 'text':      this._renderText(ctx, m); break;
      case 'callout':   this._renderCallout(ctx, m); break;
      default: break;
    }

    if (selected) this._drawSelectionHandles(ctx, m);
    ctx.restore();
  }

  // ── Individual renderers ───────────────────────────────────────────────────

  _renderLine(ctx, m) {
    if (!m.points || m.points.length < 2) return;
    const a = this._nToP(m.points[0].x, m.points[0].y);
    const b = this._nToP(m.points[1].x, m.points[1].y);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  _renderShape(ctx, m) {
    if (!m.rect) return;
    const tl = this._nToP(m.rect.x, m.rect.y);
    const br = this._nToP(m.rect.x + m.rect.w, m.rect.y + m.rect.h);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  }

  _renderFreehand(ctx, m) {
    if (!m.points || m.points.length < 2) return;
    ctx.beginPath();
    const p0 = this._nToP(m.points[0].x, m.points[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < m.points.length; i++) {
      const p = this._nToP(m.points[i].x, m.points[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  _renderHighlighter(ctx, m) {
    if (!m.points || m.points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = m.color || '#FFFF00';
    ctx.lineWidth = (m.strokeWidth || 3) * 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const p0 = this._nToP(m.points[0].x, m.points[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < m.points.length; i++) {
      const p = this._nToP(m.points[i].x, m.points[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _renderCloud(ctx, m) {
    if (!m.rect) return;
    const tl = this._nToP(m.rect.x, m.rect.y);
    const br = this._nToP(m.rect.x + m.rect.w, m.rect.y + m.rect.h);
    const w = br.x - tl.x;
    const h = br.y - tl.y;
    drawCloud(ctx, tl.x, tl.y, w, h);
    ctx.stroke();
  }

  _renderText(ctx, m) {
    if (!m.position || !m.text) return;
    const p = this._nToP(m.position.x, m.position.y);
    const fs = (m.fontSize || 16);
    ctx.font = `${fs}px sans-serif`;
    ctx.fillText(m.text, p.x, p.y);
  }

  _renderCallout(ctx, m) {
    if (!m.points || m.points.length < 2 || !m.text) return;
    const anchor = this._nToP(m.points[0].x, m.points[0].y);
    const box = this._nToP(m.points[1].x, m.points[1].y);
    // Leader line
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(box.x, box.y);
    ctx.stroke();
    // Text
    const fs = (m.fontSize || 14);
    ctx.font = `${fs}px sans-serif`;
    const tw = ctx.measureText(m.text).width;
    const pad = 6;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(box.x - pad, box.y - fs - pad, tw + pad * 2, fs + pad * 2);
    ctx.restore();
    ctx.strokeRect(box.x - pad, box.y - fs - pad, tw + pad * 2, fs + pad * 2);
    ctx.fillText(m.text, box.x, box.y);
  }

  // ── Selection handles ──────────────────────────────────────────────────────

  _drawSelectionHandles(ctx, m) {
    const bb = this._getBounds(m);
    if (!bb) return;
    const tl = this._nToP(bb.x, bb.y);
    const br = this._nToP(bb.x + bb.w, bb.y + bb.h);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#2066DF';
    ctx.lineWidth = 1;
    ctx.strokeRect(tl.x - 4, tl.y - 4, br.x - tl.x + 8, br.y - tl.y + 8);
    ctx.setLineDash([]);
    const hs = 5;
    ctx.fillStyle = '#2066DF';
    for (const [hx, hy] of [[tl.x - 4, tl.y - 4], [br.x + 4, tl.y - 4], [tl.x - 4, br.y + 4], [br.x + 4, br.y + 4]]) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }
    ctx.restore();
  }

  _getBounds(m) {
    if (m.rect) return m.rect;
    if (m.points && m.points.length) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of m.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    if (m.position) return { x: m.position.x, y: m.position.y, w: 0.05, h: 0.02 };
    return null;
  }

  _hitTest(nx, ny) {
    const PAD = 0.015;
    for (let i = this.markups.length - 1; i >= 0; i--) {
      const bb = this._getBounds(this.markups[i]);
      if (!bb) continue;
      if (nx >= bb.x - PAD && nx <= bb.x + bb.w + PAD &&
          ny >= bb.y - PAD && ny <= bb.y + bb.h + PAD) {
        return this.markups[i].id;
      }
    }
    return null;
  }

  // ── Live preview (in-progress drawing) ─────────────────────────────────────

  _drawLivePreview() {
    const d = this._drawData;
    if (!d) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (d.tool) {
      case 'line': {
        const a = this._nToP(d.start.x, d.start.y);
        const b = this._nToP(d.current.x, d.current.y);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        break;
      }
      case 'shape': {
        const tl = this._nToP(Math.min(d.start.x, d.current.x), Math.min(d.start.y, d.current.y));
        const br = this._nToP(Math.max(d.start.x, d.current.x), Math.max(d.start.y, d.current.y));
        ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
        break;
      }
      case 'cloud': {
        const tl = this._nToP(Math.min(d.start.x, d.current.x), Math.min(d.start.y, d.current.y));
        const br = this._nToP(Math.max(d.start.x, d.current.x), Math.max(d.start.y, d.current.y));
        drawCloud(ctx, tl.x, tl.y, br.x - tl.x, br.y - tl.y);
        ctx.stroke();
        break;
      }
      case 'freehand':
      case 'highlighter': {
        if (d.tool === 'highlighter') {
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = this.strokeWidth * 6;
        }
        if (d.points.length < 2) break;
        ctx.beginPath();
        const p0 = this._nToP(d.points[0].x, d.points[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < d.points.length; i++) {
          const p = this._nToP(d.points[i].x, d.points[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        break;
      }
      case 'callout': {
        const anchor = this._nToP(d.start.x, d.start.y);
        const cur = this._nToP(d.current.x, d.current.y);
        ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y); ctx.lineTo(cur.x, cur.y); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.fillRect(cur.x, cur.y - 20, 100, 26);
        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = this.color;
        ctx.strokeRect(cur.x, cur.y - 20, 100, 26);
        break;
      }
      default: break;
    }
    ctx.restore();
  }

  // ── Event listeners ────────────────────────────────────────────────────────

  _attachListeners() {
    if (!this.canvas) return;
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('resize', this._onResize);
  }

  _detachListeners() {
    if (!this.canvas) return;
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('resize', this._onResize);
  }

  _handleResize() {
    this._syncSize();
    this.render();
  }

  // ── Pointer handlers ───────────────────────────────────────────────────────

  _handlePointerDown(e) {
    if (this._textInput) return;
    const n = this._pointerNorm(e);
    const tool = this.currentTool;

    // Select tool
    if (tool === 'select') {
      const hitId = this._hitTest(n.x, n.y);
      this._selectedId = hitId;
      if (hitId) {
        const m = this.markups.find((mk) => mk.id === hitId);
        const bb = this._getBounds(m);
        this._dragOffset = bb ? { x: n.x - bb.x, y: n.y - bb.y } : null;
        this._drawing = true;
        this._drawData = { tool: 'select-drag', id: hitId, start: n, current: n };
      }
      this.render();
      return;
    }

    // Text tool — place and open input
    if (tool === 'text') {
      this._openTextInput(n, null);
      return;
    }

    // Callout, line, shape, cloud — start drag
    if (['line', 'shape', 'cloud', 'callout'].includes(tool)) {
      this._drawing = true;
      this._drawData = { tool, start: { ...n }, current: { ...n } };
      return;
    }

    // Freehand, highlighter — start collecting points
    if (tool === 'freehand' || tool === 'highlighter') {
      this._drawing = true;
      this._drawData = { tool, points: [{ ...n }] };
      return;
    }
  }

  _handlePointerMove(e) {
    if (!this._drawing || !this._drawData) return;
    const n = this._pointerNorm(e);
    const d = this._drawData;

    if (d.tool === 'select-drag' && d.id) {
      // Move selected markup
      const m = this.markups.find((mk) => mk.id === d.id);
      if (m && this._dragOffset) {
        const dx = n.x - d.current.x;
        const dy = n.y - d.current.y;
        this._offsetMarkup(m, dx, dy);
      }
      d.current = { ...n };
      this.render();
      return;
    }

    if (d.points) {
      d.points.push({ ...n });
    } else {
      d.current = { ...n };
    }
    this.render();
  }

  _handlePointerUp(e) {
    if (!this._drawing || !this._drawData) return;
    const d = this._drawData;
    const n = this._pointerNorm(e);

    // Select-drag commit
    if (d.tool === 'select-drag') {
      this._drawing = false;
      this._drawData = null;
      this.emit('markups-changed', this.markups);
      return;
    }

    this._drawing = false;
    this._drawData = null;

    // Commit the markup
    const base = { id: uid(), color: this.color, strokeWidth: this.strokeWidth, opacity: this.opacity };

    switch (d.tool) {
      case 'line': {
        this._pushUndo();
        this.markups.push({ ...base, type: 'line', points: [d.start, n] });
        break;
      }
      case 'shape': {
        const x = Math.min(d.start.x, n.x), y = Math.min(d.start.y, n.y);
        const w = Math.abs(n.x - d.start.x), h = Math.abs(n.y - d.start.y);
        if (w < 0.005 && h < 0.005) break;
        this._pushUndo();
        this.markups.push({ ...base, type: 'shape', rect: { x, y, w, h } });
        break;
      }
      case 'cloud': {
        const x = Math.min(d.start.x, n.x), y = Math.min(d.start.y, n.y);
        const w = Math.abs(n.x - d.start.x), h = Math.abs(n.y - d.start.y);
        if (w < 0.005 && h < 0.005) break;
        this._pushUndo();
        this.markups.push({ ...base, type: 'cloud', rect: { x, y, w, h } });
        break;
      }
      case 'freehand': {
        if (!d.points || d.points.length < 2) break;
        this._pushUndo();
        this.markups.push({ ...base, type: 'freehand', points: d.points });
        break;
      }
      case 'highlighter': {
        if (!d.points || d.points.length < 2) break;
        this._pushUndo();
        this.markups.push({ ...base, type: 'highlighter', points: d.points, opacity: 0.35 });
        break;
      }
      case 'callout': {
        this._openTextInput(n, d.start);
        return;
      }
      default: break;
    }

    this.render();
    this.emit('markup-added', this.markups[this.markups.length - 1]);
    this.emit('markups-changed', this.markups);
  }

  // ── Keyboard handler ───────────────────────────────────────────────────────

  _handleKeyDown(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this._selectedId && !this._textInput) {
        this._pushUndo();
        this.markups = this.markups.filter((m) => m.id !== this._selectedId);
        const removed = this._selectedId;
        this._selectedId = null;
        this.render();
        this.emit('markup-removed', removed);
        this.emit('markups-changed', this.markups);
      }
    }
  }

  // ── Text input overlay ─────────────────────────────────────────────────────

  _openTextInput(position, calloutAnchor) {
    this._closeTextInput();
    const p = this._nToP(position.x, position.y);
    const canvasRect = this.canvas.getBoundingClientRect();
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type here…';
    Object.assign(input.style, {
      position: 'fixed',
      left: `${canvasRect.left + p.x}px`,
      top: `${canvasRect.top + p.y - 12}px`,
      zIndex: '9999',
      fontSize: '14px',
      padding: '4px 8px',
      border: `2px solid ${this.color}`,
      borderRadius: '4px',
      outline: 'none',
      background: '#fff',
      color: '#232729',
      minWidth: '120px',
    });
    document.body.appendChild(input);
    this._textInput = input;

    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      const text = input.value.trim();
      if (text) {
        this._pushUndo();
        if (calloutAnchor) {
          this.markups.push({
            id: uid(), type: 'callout', color: this.color, strokeWidth: this.strokeWidth,
            opacity: this.opacity, points: [calloutAnchor, position], text, fontSize: 14,
          });
        } else {
          this.markups.push({
            id: uid(), type: 'text', color: this.color, strokeWidth: this.strokeWidth,
            opacity: this.opacity, position: { ...position }, text, fontSize: 14,
          });
        }
        this.emit('markup-added', this.markups[this.markups.length - 1]);
        this.emit('markups-changed', this.markups);
      }
      this._closeTextInput();
      this.render();
    };

    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') commit();
      if (ev.key === 'Escape') { this._closeTextInput(); this.render(); }
    });

    // Delay blur attachment so the initial mouseup from the click
    // doesn't immediately destroy the input before the user can type.
    setTimeout(() => {
      if (this._textInput === input) {
        input.addEventListener('blur', () => setTimeout(commit, 100));
        input.focus();
      }
    }, 50);
  }

  _closeTextInput() {
    if (this._textInput && this._textInput.parentElement) {
      this._textInput.parentElement.removeChild(this._textInput);
    }
    this._textInput = null;
  }

  // ── Markup movement helper ─────────────────────────────────────────────────

  _offsetMarkup(m, dx, dy) {
    if (m.points) {
      m.points = m.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
    if (m.rect) {
      m.rect = { ...m.rect, x: m.rect.x + dx, y: m.rect.y + dy };
    }
    if (m.position) {
      m.position = { x: m.position.x + dx, y: m.position.y + dy };
    }
  }

  // ── Event emitter ──────────────────────────────────────────────────────────

  on(event, callback) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, new Set());
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) listeners.delete(callback);
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) listeners.forEach((cb) => cb(data));
  }
}
