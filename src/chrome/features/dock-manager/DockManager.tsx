/**
 * DockManager — panel drag, drop, and layout orchestration.
 *
 * Architecture:
 *   During drag  – the dragged panel's slot becomes an invisible fixed-height
 *                  placeholder (opacity:0, no children). A separate fixed-
 *                  position overlay renders the panel content and follows the
 *                  pointer. Non-dragged siblings slide with transform:translateY
 *                  + CSS transition. No layout property is ever animated.
 *
 *   On drop      – The overlay animates from its current position to the exact
 *                  natural position the slot will occupy in the new order. Only
 *                  after that animation completes is the React state committed
 *                  (reorderDockedPanels + clear drag). This prevents any second
 *                  layout shift during the animation.
 *
 *   Post-commit  – React renders the new order with all transforms at
 *                  translate(0,0). We immediately disable CSS transitions on
 *                  every slot (they would otherwise fire from the wrong flex-
 *                  position start value and cause displaced siblings to jump),
 *                  then restore transitions on the next animation frame.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { DockedPanel } from './DockedPanel';
import { DetachedPanelPortal } from './DetachedPanelPortal';
import {
  PANEL_REGISTRY,
  PropertiesContent,
  PropertiesToolbar,
  OBJECT_TREE_BREADCRUMBS,
  type PropertiesTabId,
} from './panelContent';
import { useViewerAdapter } from '../viewer-adapter/ViewerAdapterContext';
import type { GlobalSearchObjectEntry } from '../viewer-adapter/types';
import type { DockStore, PanelId, PanelState } from './useDockStore';

// ─── Layout constants ─────────────────────────────────────────────────────────
const TOOLBAR_RIGHT_EDGE = 52;
const DOCK_GAP           = 8;
const DOCK_PANEL_WIDTH   = 320;
const EDGE_MARGIN        = 8;
const DOCK_PAD           = 4;
const DOCK_LEFT          = TOOLBAR_RIGHT_EDGE + DOCK_GAP;
const PANEL_GAP          = 8;
const SETTLE_MS          = 200;
const MINIMIZED_PANEL_HEIGHT = 58;
const EASE               = 'cubic-bezier(0.22, 1, 0.36, 1)';

// ─── Drag state ───────────────────────────────────────────────────────────────
interface DragState {
  /** 'drag' = pointer tracking active; 'drop' = overlay animating, inputs frozen */
  phase:            'drag' | 'drop';
  panelId:          PanelId;
  wasDockedOnStart: boolean;
  /** Panel's index in the docked list at drag-start (never changes). */
  originalIndex:    number;
  /** Current or frozen target insert index. */
  insertIndex:      number;
  /** Whether the pointer is currently over the dock zone. */
  overDock:         boolean;
  /** Heights captured at drag-start; never recalculated mid-drag. */
  frozenHeights:    Map<PanelId, number>;
  /** Overlay top-left (client coords). Frozen once phase='drop'. */
  overlayX:         number;
  overlayY:         number;
  /** Panel height captured at drag-start. Drives placeholder + overlay height. */
  panelHeight:      number;
  offX:             number;
  offY:             number;
  zoneHeight:       number;
  // Set when phase='drop':
  targetX:          number;
  targetY:          number;
  newOrderIds:      PanelId[];
}

interface DockManagerProps {
  store:   DockStore;
  /** Visually de-emphasise panels (dim + desaturate) when a toolbar tooltip is showing. */
  deemphasized?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DockManager({ store, deemphasized = false }: DockManagerProps) {
  const adapter = useViewerAdapter();
  const {
    openPanels,
    undockPanel,
    insertDockedPanel,
    reorderDockedPanels,
    setFloatPosition,
    toggleMinimized,
    closePanel,
    setDockedHeight,
    setFloatSize,
    detachPanel,
    reattachPanel,
  } = store;

  const handleClosePanel = useCallback((panelId: PanelId) => {
    if (panelId === 'views') {
      if (adapter.isMarkupModeActive?.()) {
        adapter.exitMarkupMode?.(true);
      }
      adapter.deselectView?.();
    }
    closePanel(panelId);
  }, [adapter, closePanel]);

  const handleAddForPanel = useCallback((panelId: PanelId) => {
    if (panelId === 'views') {
      window.dispatchEvent(new CustomEvent('mv:activate-right-tool', {
        detail: { sourceId: 'mode:markup' },
      }));
    }
  }, []);

  const dockZoneRef = useRef<HTMLDivElement>(null);
  /** The overlay div that follows the pointer during drag and animates on drop. */
  const overlayRef  = useRef<HTMLDivElement>(null);
  /** Mutable ref so event-handler closures never go stale. */
  const dragRef     = useRef<DragState | null>(null);
  /** Running Web Animation on the overlay (cancel on new drag start). */
  const dropAnimRef = useRef<Animation | null>(null);

  const [dragState, setDragState]               = useState<DragState | null>(null);
  const [isResizingDocked, setIsResizingDocked] = useState(false);
  const [propertiesTab, setPropertiesTab] = useState<PropertiesTabId>('all-properties');
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [objectEntries, setObjectEntries] = useState<GlobalSearchObjectEntry[]>([]);
  /**
   * True for exactly one React render after a docked reorder commits. Prevents
   * the CSS transition from firing from the wrong flex-position start value
   * (displaced siblings would otherwise animate from an incorrect origin).
   * Cleared via requestAnimationFrame so React re-enables transitions correctly
   * without ever bypassing its own internal style-diff bookkeeping.
   */
  const [suppressTransitions, setSuppressTransitions] = useState(false);

  const storeRef        = useRef(store);
  storeRef.current      = store;
  const openPanelsRef   = useRef(openPanels);
  openPanelsRef.current = openPanels;

  const getPanelTabs = useCallback((panelId: PanelId) => {
    if (panelId !== 'properties') return undefined;
    return [
      { id: 'all-properties', label: 'All Properties' },
      { id: 'related-items', label: 'Related Items' },
    ];
  }, []);

  const getPanelBreadcrumbs = useCallback((panelId: PanelId): string[] | undefined => {
    if (panelId !== 'object-tree') return undefined;
    return OBJECT_TREE_BREADCRUMBS;
  }, []);

  // Panels with card-like sectioned content (e.g. Properties) sit on a gray inset.
  // All other panels bleed to the panel's white chrome edge-to-edge.
  const getPanelContentVariant = useCallback(
    (panelId: PanelId): 'bleed' | 'padded' => (panelId === 'properties' ? 'padded' : 'bleed'),
    [],
  );

  useEffect(() => {
    setObjectEntries(adapter.getObjectList?.() ?? []);
    const unsubscribe = adapter.subscribeObjectList?.((entries) => {
      setObjectEntries(entries);
    });
    return () => unsubscribe?.();
  }, [adapter]);

  useEffect(() => {
    setSelectedObjectIds([]);
    const unsubscribe = adapter.subscribeSelectedObjects?.((expressIDs) => {
      setSelectedObjectIds(expressIDs.map(String));
    });
    return () => unsubscribe?.();
  }, [adapter]);

  const getPanelTitle = useCallback((panel: PanelState) => {
    if (panel.id !== 'properties') return panel.label;
    if (panel.minimized) return 'Properties';
    const selectedId = selectedObjectIds[0];
    if (!selectedId) return 'Object name here';
    const selectedEntry = objectEntries.find((entry) => String(entry.expressID) === selectedId);
    return selectedEntry?.name?.trim() || selectedId;
  }, [objectEntries, selectedObjectIds]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const isOverDock = useCallback((x: number, y: number): boolean => {
    const r = dockZoneRef.current?.getBoundingClientRect();
    if (!r) return false;
    return x >= r.left - 32 && x <= r.right + 40
        && y >= r.top  - 20 && y <= r.bottom + 20;
  }, []);

  /**
   * Use natural offsetTop (unaffected by CSS transforms) so live displacement
   * of siblings doesn't skew where the insertion target appears.
   */
  const getInsertIndex = useCallback((cursorY: number, panelId: PanelId): number => {
    const zone = dockZoneRef.current;
    if (!zone) return 0;
    const zoneTop = zone.getBoundingClientRect().top;
    const slots = Array.from(zone.querySelectorAll<HTMLElement>('[data-panel-slot]'))
      .filter((el) => el.getAttribute('data-panel-slot') !== panelId);
    // Top-boundary trigger: insert index advances when dragged panel top
    // crosses each sibling slot top boundary.
    const EPS = 0.5;
    let idx = 0;
    for (const slot of slots) {
      if (cursorY + EPS >= zoneTop + slot.offsetTop) idx++;
    }
    return Math.max(0, Math.min(idx, slots.length));
  }, []);

  // ─── Drag start ─────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((panelId: PanelId, e: React.PointerEvent) => {
    e.preventDefault();

    // Cancel any drop animation still running from a previous drag.
    if (dropAnimRef.current) {
      dropAnimRef.current.cancel();
      dropAnimRef.current = null;
    }

    const panelEl    = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-panel-root]');
    const r          = panelEl?.getBoundingClientRect() ?? { left: e.clientX - 8, top: e.clientY - 16 };
    const panels     = openPanelsRef.current;
    const isDocked   = panels.find((p) => p.id === panelId)?.docked ?? true;
    const dockedList = panels.filter((p) => p.docked);
    const origIdx    = dockedList.findIndex((p) => p.id === panelId);

    // Freeze every slot's current rendered height so content reflow inside a
    // panel can't shift adjacent panels during the drag.
    const frozen = new Map<PanelId, number>();
    dockZoneRef.current?.querySelectorAll<HTMLElement>('[data-panel-slot]').forEach((el) => {
      const id = el.getAttribute('data-panel-slot') as PanelId;
      if (id) frozen.set(id, el.offsetHeight);
    });

    const state: DragState = {
      phase:            'drag',
      panelId,
      wasDockedOnStart: isDocked,
      originalIndex:    origIdx >= 0 ? origIdx : 0,
      insertIndex:      origIdx >= 0 ? origIdx : 0,
      overDock:         isDocked,
      frozenHeights:    frozen,
      overlayX:         r.left,
      overlayY:         r.top,
      panelHeight:      panelEl?.offsetHeight ?? MINIMIZED_PANEL_HEIGHT,
      offX:             e.clientX - r.left,
      offY:             e.clientY - r.top,
      zoneHeight:       dockZoneRef.current?.getBoundingClientRect().height ?? 0,
      targetX:          0,
      targetY:          0,
      newOrderIds:      [],
    };
    dragRef.current = state;
    // If a drop's rAF hasn't fired yet, ensure transitions are live before
    // the first pointermove so siblings animate correctly on this drag.
    setSuppressTransitions(false);
    setDragState({ ...state });
  }, []);

  // ─── Pointer event listeners ─────────────────────────────────────────────────

  useEffect(() => {
    /**
     * Commit the reorder after the overlay drop animation finishes.
     * flushSync makes React render synchronously so we can immediately disable
     * CSS transitions before the browser paints a frame with the wrong start.
     */
    const commitDrop = (_zone: HTMLDivElement | null, newOrderIds: PanelId[]) => {
      // Batch the reorder + drag-clear + transition-suppress into one render so
      // no wrong-position CSS transition can fire. All changes go through React
      // so its internal style-diff bookkeeping never goes stale.
      flushSync(() => {
        storeRef.current.reorderDockedPanels(newOrderIds);
        dragRef.current = null;
        setDragState(null);
        setSuppressTransitions(true);
      });

      // Re-enable transitions via a proper React render on the next frame.
      // translateY is already 0 in that render so no transition motion fires.
      requestAnimationFrame(() => {
        setSuppressTransitions(false);
      });
    };

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      // During drop animation inputs are frozen — overlay is handled by Web Animations.
      if (!d || d.phase === 'drop') return;

      const gx   = e.clientX - d.offX;
      const gy   = e.clientY - d.offY;
      const over = isOverDock(e.clientX, e.clientY);
      const hitY = d.wasDockedOnStart
        ? gy
        : e.clientY;
      const ins  = over ? getInsertIndex(hitY, d.panelId) : d.insertIndex;

      d.overlayX    = gx;
      d.overlayY    = gy;
      d.insertIndex = ins;
      d.overDock    = over;
      d.zoneHeight  = dockZoneRef.current?.getBoundingClientRect().height ?? d.zoneHeight;

      setDragState({ ...d });
    };

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.phase === 'drop') return;

      const s     = storeRef.current;
      const panels = openPanelsRef.current;
      const over   = isOverDock(e.clientX, e.clientY);
      const zone   = dockZoneRef.current;

      if (over && d.wasDockedOnStart) {
        // ── Docked reorder ──────────────────────────────────────────────────
        const docked   = panels.filter((p) => p.docked);
        const dragIdx  = Math.max(0, Math.min(d.originalIndex, docked.length - 1));
        const dragged  = docked[dragIdx];

        const newOrder = docked.slice();
        if (dragged) {
          newOrder.splice(dragIdx, 1);
          const adj = Math.max(0, Math.min(d.insertIndex, newOrder.length));
          newOrder.splice(adj, 0, dragged);
        }

        const droppedIdx  = newOrder.findIndex((p) => p.id === d.panelId);
        const newOrderIds = newOrder.map((p) => p.id);

        // Compute the natural position of the dropped panel in the new order.
        // This is where the overlay must animate to before we commit.
        const zoneRect = zone?.getBoundingClientRect();
        let targetY    = zoneRect?.top ?? d.overlayY;
        for (let i = 0; i < droppedIdx; i++) {
          targetY += (d.frozenHeights.get(newOrder[i].id) ?? MINIMIZED_PANEL_HEIGHT) + PANEL_GAP;
        }
        const targetX = zoneRect?.left ?? d.overlayX;

        // If the overlay is already at the target (no meaningful move), skip animation.
        if (Math.abs(targetX - d.overlayX) < 1 && Math.abs(targetY - d.overlayY) < 1) {
          dragRef.current = null;
          setDragState(null);
          commitDrop(zone, newOrderIds);
          return;
        }

        // Freeze inputs and expose target so React renders the drop state.
        const dropState: DragState = {
          ...d,
          phase:        'drop',
          targetX,
          targetY,
          newOrderIds,
        };
        dragRef.current = dropState;
        setDragState({ ...dropState });

        // Animate the overlay from current pointer position to the target slot.
        // Commit state only after this animation completes (onfinish), preventing
        // any second reorder or re-measure during the animation.
        const overlayEl = overlayRef.current;
        if (!overlayEl) {
          dragRef.current = null;
          setDragState(null);
          commitDrop(zone, newOrderIds);
          return;
        }

        const anim = overlayEl.animate(
          [
            { transform: `translate(${d.overlayX}px, ${d.overlayY}px)` },
            { transform: `translate(${targetX}px, ${targetY}px)` },
          ],
          {
            duration: SETTLE_MS,
            easing:   EASE,
            fill:     'forwards', // hold final position until React removes overlay
          },
        );
        dropAnimRef.current = anim;
        anim.onfinish = () => {
          dropAnimRef.current = null;
          commitDrop(zone, newOrderIds);
        };

      } else if (over && !d.wasDockedOnStart) {
        const dockedCount = panels.filter((p) => p.docked).length;
        s.insertDockedPanel(d.panelId, Math.min(d.insertIndex, dockedCount));
        dragRef.current = null;
        setDragState(null);

      } else if (!over && d.wasDockedOnStart) {
        const outsideViewport =
          e.clientX < 0 || e.clientX > window.innerWidth ||
          e.clientY < 0 || e.clientY > window.innerHeight;
        if (outsideViewport) {
          s.detachPanel(d.panelId);
        } else {
          const panel = panels.find((p) => p.id === d.panelId);
          s.undockPanel(d.panelId, { x: d.overlayX, y: d.overlayY });
          if (panel?.minimized) s.setFloatSize(d.panelId, { height: 400 });
        }
        dragRef.current = null;
        setDragState(null);

      } else {
        const outsideViewport =
          e.clientX < 0 || e.clientX > window.innerWidth ||
          e.clientY < 0 || e.clientY > window.innerHeight;
        if (outsideViewport) {
          s.detachPanel(d.panelId);
        } else {
          s.setFloatPosition(d.panelId, { x: d.overlayX, y: d.overlayY });
        }
        dragRef.current = null;
        setDragState(null);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
  }, []); // intentionally empty — live state accessed through refs

  // ─── Derived values ──────────────────────────────────────────────────────────

  const dockedPanels   = openPanels.filter((p) =>  p.docked && !p.detached);
  const floatingPanels = openPanels.filter((p) => !p.docked && !p.detached);
  const detachedPanels = openPanels.filter((p) =>  p.detached);

  /**
   * The panel whose slot is rendered as an invisible placeholder (opacity:0).
   * Only set when a docked panel is being dragged (overlay handles the visuals).
   */
  const placeholderId = dragState?.wasDockedOnStart ? dragState.panelId : null;

  const showDockZone = dockedPanels.length > 0
    || !!(dragState?.phase === 'drag' && !dragState.wasDockedOnStart && dragState.overDock);

  // Heights: use frozen values while any docked drag is active.
  const zoneH      = dockZoneRef.current?.getBoundingClientRect().height ?? (window.innerHeight - 64);
  const fixedTotal = dockedPanels.reduce(
    (s, p) => s + (p.minimized ? MINIMIZED_PANEL_HEIGHT : (p.dockedHeight ?? 0)), 0,
  );
  const flexCount = dockedPanels.filter((p) => !p.minimized && p.dockedHeight == null).length;
  const flexH     = flexCount > 0
    ? Math.max(0, (zoneH - fixedTotal - Math.max(0, dockedPanels.length - 1) * PANEL_GAP) / flexCount)
    : 0;
  const isFloatDockPreview =
    !!(dragState?.phase === 'drag' && !dragState.wasDockedOnStart && dragState.overDock);
  const incomingPanel = isFloatDockPreview
    ? openPanels.find((p) => p.id === dragState?.panelId)
    : null;
  const incomingPreviewPanel: Pick<PanelState, 'minimized' | 'dockedHeight'> = {
    minimized: incomingPanel?.minimized ?? false,
    dockedHeight: incomingPanel?.dockedHeight,
  };
  const previewPanels: Array<Pick<PanelState, 'minimized' | 'dockedHeight'>> = isFloatDockPreview
    ? [...dockedPanels, incomingPreviewPanel]
    : dockedPanels;
  const previewFixedTotal = previewPanels.reduce(
    (s, p) => s + (p.minimized ? MINIMIZED_PANEL_HEIGHT : (p.dockedHeight ?? 0)),
    0,
  );
  const previewFlexCount = previewPanels.filter((p) => !p.minimized && p.dockedHeight == null).length;
  const previewGapTotal = Math.max(0, previewPanels.length - 1) * PANEL_GAP;
  const previewFlexH = previewFlexCount > 0
    ? Math.max(0, (zoneH - previewFixedTotal - previewGapTotal) / previewFlexCount)
    : 0;
  const getPreviewNaturalH = (p: Pick<PanelState, 'minimized' | 'dockedHeight'>) =>
    p.minimized ? MINIMIZED_PANEL_HEIGHT : (p.dockedHeight ?? previewFlexH);
  const getNaturalH = (p: PanelState) => {
    if (p.minimized) return MINIMIZED_PANEL_HEIGHT;
    // While a floating panel is hovering over dock, use collapsed-aware preview
    // sizing (fixed minimized/fixed-height panels + flex remainder).
    if (isFloatDockPreview) return getPreviewNaturalH(p);
    return p.dockedHeight ?? flexH;
  };
  const getSlotH    = (p: PanelState) =>
    placeholderId
      ? (dragState!.frozenHeights.get(p.id) ?? getNaturalH(p))
      : getNaturalH(p);

  // Sibling displacement parameters.
  const isDockedDrag = !!(dragState && dragState.wasDockedOnStart);
  const origIdx      = dragState?.originalIndex ?? -1;
  const tgtIdx       = dragState?.insertIndex   ?? -1;
  const dragSpan     = (dragState?.panelHeight ?? MINIMIZED_PANEL_HEIGHT) + PANEL_GAP;
  const incomingPreviewH = getPreviewNaturalH(incomingPreviewPanel);
  const floatPreviewSpan = incomingPreviewH + PANEL_GAP;
  const dropTargetFill = (() => {
    if (!isFloatDockPreview) return null;
    const insertAt = Math.max(0, Math.min(tgtIdx, dockedPanels.length));
    let top = 0;
    for (let i = 0; i < insertAt; i++) {
      top += getSlotH(dockedPanels[i]) + PANEL_GAP;
    }
    return { top, height: incomingPreviewH };
  })();

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Dock zone ──────────────────────────────────────────────────────── */}
      <div
        ref={dockZoneRef}
        style={{
          position:      'absolute',
          left:          DOCK_LEFT,
          top:           EDGE_MARGIN,
          bottom:        EDGE_MARGIN,
          width:         DOCK_PANEL_WIDTH,
          visibility:    showDockZone ? 'visible' : 'hidden',
          pointerEvents: 'none',
          overflow:      'visible',
          opacity:       1,
          zIndex:        40,
          display:       'flex',
          flexDirection: 'column',
          gap:           PANEL_GAP,
        }}
      >
        {dropTargetFill && (
          <div
            style={{
              position:    'absolute',
              top: dropTargetFill.top - DOCK_PAD,
              left: -DOCK_PAD,
              right: -DOCK_PAD,
              height: dropTargetFill.height + DOCK_PAD * 2,
              background:  'rgba(0,0,0,0.20)',
              borderRadius: 12,
              zIndex:      0,
              pointerEvents: 'none',
            }}
          />
        )}

        {/*
         * Slot wrapper rules:
         *   – key is always panel.id (never array index)
         *   – height is frozen while a docked drag is active
         *   – only transform:translateY is animated (CSS transition)
         *   – height, margin, padding, top, bottom are NEVER animated
         *   – the dragged panel's slot is an invisible placeholder (opacity:0,
         *     no children) — its space keeps the flex stack height stable
         */}
        {dockedPanels.map((panel, index) => {
          const { Content, Toolbar } = PANEL_REGISTRY[panel.id];
          const toolbarNode = panel.id === 'properties'
            ? <PropertiesToolbar propertiesTab={propertiesTab} />
            : (Toolbar ? <Toolbar /> : undefined);
          const contentNode = panel.id === 'properties'
            ? <PropertiesContent propertiesTab={propertiesTab} />
            : <Content />;
          const isPlaceholder = panel.id === placeholderId;
          const slotH         = getSlotH(panel);

          // Compute sibling displacement so non-dragged panels slide smoothly
          // to preview where the dragged panel will land.
          let translateY = 0;
          if (isDockedDrag && !isPlaceholder && dragState!.overDock) {
            if (origIdx < tgtIdx && index > origIdx && index <= tgtIdx) {
              translateY = -dragSpan; // shift up: dragged panel moving down
            } else if (origIdx > tgtIdx && index >= tgtIdx && index < origIdx) {
              translateY = dragSpan;  // shift down: dragged panel moving up
            }
          } else if (dragState?.phase === 'drag' && !dragState.wasDockedOnStart && dragState.overDock) {
            // Floating panel hovering over dock: show insertion preview.
            if (index >= tgtIdx) translateY = floatPreviewSpan;
          }

          return (
            <div
              key={panel.id}            // stable id-based key — never use index
              data-panel-slot={panel.id}
              style={{
                height:        slotH,
                flexShrink:    (isDockedDrag || isResizingDocked) ? 0 : 1,
                minHeight:     MINIMIZED_PANEL_HEIGHT,
                willChange:    'transform',
                pointerEvents: isPlaceholder ? 'none'  : 'auto',
                // Placeholder is invisible. The overlay renders the actual content.
                opacity:       isPlaceholder ? 0       : 1,
                // Siblings: only transform is animated.
                // Placeholder: no transition (it stays put; the overlay moves).
                // Resize: no transition so height changes are instant.
                // suppressTransitions: one-frame suppression after a drop commit
                //   so displaced siblings don't animate from the wrong flex origin.
                transition:    (!isPlaceholder && !isResizingDocked && !suppressTransitions)
                  ? `transform ${SETTLE_MS}ms ${EASE}`
                  : 'none',
                transform:     `translateY(${translateY}px)`,
              }}
            >
              {/* Placeholder slot has no children — content lives in the overlay. */}
              {!isPlaceholder && (
                <DockedPanel
                  id={panel.id}
                  title={getPanelTitle(panel)}
                  subheader={panel.id === 'properties' ? 'Properties' : undefined}
                  docked
                  minimized={panel.minimized}
                  deemphasized={deemphasized}
                  toolbar={toolbarNode}
                  tabs={getPanelTabs(panel.id)}
                  breadcrumbs={getPanelBreadcrumbs(panel.id)}
                  contentVariant={getPanelContentVariant(panel.id)}
                  activeTabId={panel.id === 'properties' ? propertiesTab : undefined}
                  onTabChange={panel.id === 'properties'
                    ? ((tabId) => setPropertiesTab(tabId as PropertiesTabId))
                    : undefined}
                  onAdd={panel.id === 'views' ? () => handleAddForPanel(panel.id) : undefined}
                  onClose={()         => handleClosePanel(panel.id)}
                  onToggleMinimize={()  => toggleMinimized(panel.id)}
                  onDragStart={(ev)   => handleDragStart(panel.id, ev)}
                  onToggleDock={() => {
                    const zr = dockZoneRef.current?.getBoundingClientRect();
                    undockPanel(panel.id, { x: (zr?.right ?? 80) + 16, y: zr?.top ?? 80 });
                  }}
                  onDetach={() => detachPanel(panel.id)}
                  onResizeHeight={(h) => setDockedHeight(panel.id, h)}
                  onResizeStart={()   => setIsResizingDocked(true)}
                  onResizeEnd={()     => setIsResizingDocked(false)}
                >
                  {contentNode}
                </DockedPanel>
              )}
            </div>
          );
        })}
      </div>

      {/*
       * ── Drag overlay ───────────────────────────────────────────────────────
       *
       * Rendered only while a docked panel is being dragged.
       * Positioned at left:0 top:0 and moved exclusively via transform so we
       * never animate layout properties (left, top).
       *
       * During drag   → React state drives transform (follows pointer).
       * During drop   → Web Animation drives transform (overlay → target slot).
       *                 React state is frozen; overlay stays at pointer position
       *                 in React's view but animation overrides in the cascade.
       * After commit  → dragState=null removes this element from the DOM.
       */}
      {placeholderId && (() => {
        const panel = dockedPanels.find((p) => p.id === placeholderId);
        if (!panel) return null;
        const { Content, Toolbar } = PANEL_REGISTRY[panel.id];
        const toolbarNode = panel.id === 'properties'
          ? <PropertiesToolbar propertiesTab={propertiesTab} />
          : (Toolbar ? <Toolbar /> : undefined);
        const contentNode = panel.id === 'properties'
          ? <PropertiesContent propertiesTab={propertiesTab} />
          : <Content />;
        return (
          <div
            ref={overlayRef}
            style={{
              position:     'fixed',
              left:         0,
              top:          0,
              width:        DOCK_PANEL_WIDTH,
              height:       dragState!.panelHeight,
              // React drives the position during drag. Web Animation overrides
              // during the drop phase (higher cascade priority). fill:'forwards'
              // holds the final frame until React removes this element.
              transform:    `translate(${dragState!.overlayX}px, ${dragState!.overlayY}px)`,
              zIndex:       1000,
              pointerEvents:'none',
            }}
          >
            <DockedPanel
              id={panel.id}
              title={getPanelTitle(panel)}
              subheader={panel.id === 'properties' ? 'Properties' : undefined}
              docked
              minimized={panel.minimized}
              isLifted
              toolbar={toolbarNode}
              tabs={getPanelTabs(panel.id)}
              breadcrumbs={getPanelBreadcrumbs(panel.id)}
              contentVariant={getPanelContentVariant(panel.id)}
              activeTabId={panel.id === 'properties' ? propertiesTab : undefined}
              onTabChange={panel.id === 'properties'
                ? ((tabId) => setPropertiesTab(tabId as PropertiesTabId))
                : undefined}
              onClose={()       => {}}
              onToggleMinimize={() => {}}
              onDragStart={()    => {}}
              onToggleDock={()   => {}}
            >
              {contentNode}
            </DockedPanel>
          </div>
        );
      })()}

      {/* ── Floating panels ────────────────────────────────────────────────── */}
      {floatingPanels.map((panel) => {
        const { Content, Toolbar } = PANEL_REGISTRY[panel.id];
        const toolbarNode = panel.id === 'properties'
          ? <PropertiesToolbar propertiesTab={propertiesTab} />
          : (Toolbar ? <Toolbar /> : undefined);
        const contentNode = panel.id === 'properties'
          ? <PropertiesContent propertiesTab={propertiesTab} />
          : <Content />;
        const isDragging = dragState?.panelId === panel.id
          && !dragState.wasDockedOnStart
          && dragState.phase === 'drag';
        const floatPos = isDragging
          ? { x: dragState!.overlayX, y: dragState!.overlayY }
          : panel.floatPosition;
        const targetH = isDragging && dragState?.overDock
          ? incomingPreviewH
          : (panel.floatHeight ?? undefined);

        return (
          <DockedPanel
            key={panel.id}
            id={panel.id}
            title={getPanelTitle(panel)}
            subheader={panel.id === 'properties' ? 'Properties' : undefined}
            docked={false}
            minimized={panel.minimized}
            deemphasized={deemphasized}
            floatPosition={floatPos}
            floatHeight={targetH}
            floatWidth={panel.floatWidth}
            toolbar={toolbarNode}
            tabs={getPanelTabs(panel.id)}
            breadcrumbs={getPanelBreadcrumbs(panel.id)}
            contentVariant={getPanelContentVariant(panel.id)}
            activeTabId={panel.id === 'properties' ? propertiesTab : undefined}
            onTabChange={panel.id === 'properties'
              ? ((tabId) => setPropertiesTab(tabId as PropertiesTabId))
              : undefined}
            onAdd={panel.id === 'views' ? () => handleAddForPanel(panel.id) : undefined}
            onClose={()        => handleClosePanel(panel.id)}
            onToggleMinimize={() => toggleMinimized(panel.id)}
            onDragStart={(ev)  => handleDragStart(panel.id, ev)}
            onToggleDock={()   => insertDockedPanel(panel.id, dockedPanels.length)}
            onDetach={() => detachPanel(panel.id)}
            onResizeSize={(sz) => setFloatSize(panel.id, sz)}
          >
            {contentNode}
          </DockedPanel>
        );
      })}

      {/* ── Detached panels (rendered into popup windows via portal) ────── */}
      {detachedPanels.map((panel) => {
        const { Content, Toolbar } = PANEL_REGISTRY[panel.id];
        const toolbarNode = panel.id === 'properties'
          ? <PropertiesToolbar propertiesTab={propertiesTab} />
          : (Toolbar ? <Toolbar /> : undefined);
        const contentNode = panel.id === 'properties'
          ? <PropertiesContent propertiesTab={propertiesTab} />
          : <Content />;

        return (
          <DetachedPanelPortal
            key={panel.id}
            panelId={panel.id}
            title={panel.label}
            onReattach={reattachPanel}
          >
            <DockedPanel
              id={panel.id}
              title={getPanelTitle(panel)}
              subheader={panel.id === 'properties' ? 'Properties' : undefined}
              docked={false}
              minimized={false}
              isDetached
              toolbar={toolbarNode}
              tabs={getPanelTabs(panel.id)}
              breadcrumbs={getPanelBreadcrumbs(panel.id)}
              contentVariant={getPanelContentVariant(panel.id)}
              activeTabId={panel.id === 'properties' ? propertiesTab : undefined}
              onTabChange={panel.id === 'properties'
                ? ((tabId) => setPropertiesTab(tabId as PropertiesTabId))
                : undefined}
              onClose={() => handleClosePanel(panel.id)}
              onToggleMinimize={() => {}}
              onDragStart={() => {}}
              onToggleDock={() => reattachPanel(panel.id)}
              onReattach={() => reattachPanel(panel.id)}
            >
              {contentNode}
            </DockedPanel>
          </DetachedPanelPortal>
        );
      })}
    </>
  );
}
