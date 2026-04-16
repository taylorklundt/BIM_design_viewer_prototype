import { useState, useCallback } from 'react';

export type PanelId =
  | 'views'
  | 'items'
  | 'sheets'
  | 'object-tree'
  | 'properties'
  | 'search-sets'
  | 'deviation';

export interface PanelState {
  id: PanelId;
  label: string;
  docked: boolean;
  minimized: boolean;
  detached: boolean;
  floatPosition: { x: number; y: number };
  dockedHeight?: number;
  floatWidth?: number;
  floatHeight?: number;
}

export interface DockStore {
  openPanels: PanelState[];
  togglePanel(id: PanelId, label: string): void;
  ensurePanel(id: PanelId, label: string): void;
  undockPanel(id: PanelId, pos: { x: number; y: number }): void;
  insertDockedPanel(id: PanelId, insertIndex: number): void;
  reorderDockedPanels(orderedIds: PanelId[]): void;
  setFloatPosition(id: PanelId, pos: { x: number; y: number }): void;
  toggleMinimized(id: PanelId): void;
  closePanel(id: PanelId): void;
  setDockedHeight(id: PanelId, height: number): void;
  setFloatSize(id: PanelId, size: { width?: number; height?: number }): void;
  detachPanel(id: PanelId): void;
  reattachPanel(id: PanelId): void;
}

const DEFAULT_FLOAT: { x: number; y: number } = { x: 400, y: 80 };

export function useDockStore(): DockStore {
  const [openPanels, setOpenPanels] = useState<PanelState[]>([]);

  const togglePanel = useCallback((id: PanelId, label: string) => {
    setOpenPanels((prev) => {
      if (prev.find((p) => p.id === id)) return prev.filter((p) => p.id !== id);
      return [...prev, { id, label, docked: true, minimized: false, detached: false, floatPosition: DEFAULT_FLOAT }];
    });
  }, []);

  const ensurePanel = useCallback((id: PanelId, label: string) => {
    setOpenPanels((prev) => {
      if (prev.find((p) => p.id === id)) return prev;
      return [...prev, { id, label, docked: true, minimized: false, detached: false, floatPosition: DEFAULT_FLOAT }];
    });
  }, []);

  const undockPanel = useCallback((id: PanelId, pos: { x: number; y: number }) => {
    setOpenPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, docked: false, minimized: false, floatPosition: pos } : p)),
    );
  }, []);

  const insertDockedPanel = useCallback((id: PanelId, insertIndex: number) => {
    setOpenPanels((prev) => {
      const panel = prev.find((p) => p.id === id);
      if (!panel) return prev;
      const nonDocked = prev.filter((p) => !p.docked && p.id !== id);
      const docked: PanelState[] = prev
        .filter((p) => p.docked && p.id !== id)
        .map((p) => ({ ...p, dockedHeight: undefined }));
      const updated: PanelState = { ...panel, docked: true, detached: false, dockedHeight: undefined };
      const clamped = Math.max(0, Math.min(insertIndex, docked.length));
      docked.splice(clamped, 0, updated);
      return [...nonDocked, ...docked];
    });
  }, []);

  const reorderDockedPanels = useCallback((orderedIds: PanelId[]) => {
    setOpenPanels((prev) => {
      const nonDocked = prev.filter((p) => !p.docked);
      const dockedMap = new Map(prev.filter((p) => p.docked).map((p) => [p.id, p]));
      const reordered = orderedIds.map((id) => dockedMap.get(id)).filter(Boolean) as PanelState[];
      return [...nonDocked, ...reordered];
    });
  }, []);

  const setFloatPosition = useCallback((id: PanelId, pos: { x: number; y: number }) => {
    setOpenPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, floatPosition: pos } : p)),
    );
  }, []);

  const toggleMinimized = useCallback((id: PanelId) => {
    setOpenPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, minimized: !p.minimized } : p)),
    );
  }, []);

  const closePanel = useCallback((id: PanelId) => {
    setOpenPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const setDockedHeight = useCallback((id: PanelId, height: number) => {
    setOpenPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, dockedHeight: height } : p)),
    );
  }, []);

  const setFloatSize = useCallback((id: PanelId, size: { width?: number; height?: number }) => {
    setOpenPanels((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          floatWidth: size.width ?? p.floatWidth,
          floatHeight: size.height ?? p.floatHeight,
        };
      }),
    );
  }, []);

  const detachPanel = useCallback((id: PanelId) => {
    setOpenPanels((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, docked: false, minimized: false, detached: true } : p,
      ),
    );
  }, []);

  const reattachPanel = useCallback((id: PanelId) => {
    setOpenPanels((prev) => {
      const panel = prev.find((p) => p.id === id);
      if (!panel) return prev;
      const others = prev.filter((p) => p.id !== id);
      const docked = others.filter((p) => p.docked);
      const rest = others.filter((p) => !p.docked);
      const updated: PanelState = { ...panel, detached: false, docked: true, minimized: false, dockedHeight: undefined };
      return [...rest, ...docked, updated];
    });
  }, []);

  return {
    openPanels,
    togglePanel,
    ensurePanel,
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
  };
}
