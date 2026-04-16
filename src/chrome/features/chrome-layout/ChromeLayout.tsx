import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import { Header } from '../header/Header';
import { LeftToolbar } from '../left-toolbar/LeftToolbar';
import { RightToolbar } from '../right-toolbar/RightToolbar';
import { MiniMap } from '../minimap/MiniMap';
import { NavigationWheel } from '../navigation-wheel/NavigationWheel';
import { ViewerCanvas } from '../viewer-canvas/ViewerCanvas';
import { GlobalSearchOverlay } from '../global-search/GlobalSearchOverlay';
import { ModeIdentifierOverlay } from '../mode-identifier/ModeIdentifierOverlay';

import { DockManager } from '../dock-manager/DockManager';
import { useDockStore } from '../dock-manager/useDockStore';

interface ChromeLayoutProps {
  viewerContainerRef?: RefObject<HTMLDivElement | null>;
  showOverlays?: boolean;
  onUploadClick?: () => void;
  /** null = hidden; 0-100 = visible with that fill % */
  streamingProgress?: number | null;
}

export function ChromeLayout({ viewerContainerRef, showOverlays = true, onUploadClick, streamingProgress }: ChromeLayoutProps) {
  const store = useDockStore();
  const [toolbarHovered, setToolbarHovered] = useState(false);

  const [popoverVisible, setPopoverVisible] = useState(false);
  const barHoveredRef = useRef(false);
  const popoverHoveredRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (!barHoveredRef.current && !popoverHoveredRef.current) setPopoverVisible(false);
    }, 1500);
  }, [clearHideTimer]);

  const onBarEnter = useCallback(() => { barHoveredRef.current = true; clearHideTimer(); setPopoverVisible(true); }, [clearHideTimer]);
  const onBarLeave = useCallback(() => { barHoveredRef.current = false; scheduleHide(); }, [scheduleHide]);
  const onPopoverEnter = useCallback(() => { popoverHoveredRef.current = true; clearHideTimer(); }, [clearHideTimer]);
  const onPopoverLeave = useCallback(() => { popoverHoveredRef.current = false; scheduleHide(); }, [scheduleHide]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { panelId, label } = (e as CustomEvent).detail ?? {};
      if (panelId && label) store.ensurePanel(panelId, label);
    };
    window.addEventListener('mv:open-panel', handler);
    return () => window.removeEventListener('mv:open-panel', handler);
  }, [store]);

  return (
    <div className="flex flex-col h-screen w-screen bg-white">
      <div className="relative flex-shrink-0 z-30">
        <Header onUploadClick={onUploadClick} />
        <GlobalSearchOverlay />
      </div>

      {streamingProgress != null && (
        <div
          className="mv-top-loading-bar"
          onMouseEnter={onBarEnter}
          onMouseLeave={onBarLeave}
        >
          <div className="mv-top-loading-bar-track">
            <div
              className="mv-top-loading-bar-fill"
              style={{ width: `${streamingProgress}%` }}
            />
          </div>
          <div
            className={`mv-top-loading-popover ${popoverVisible ? 'is-visible' : ''}`}
            onMouseEnter={onPopoverEnter}
            onMouseLeave={onPopoverLeave}
          >
            <div className="mv-top-loading-popover-text">
              <span className="mv-top-loading-popover-label">Loading model objects</span>
              <span className="mv-top-loading-popover-percent">{streamingProgress}% Complete</span>
            </div>
            <button
              type="button"
              className="mv-top-loading-popover-btn"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('mv:open-panel', {
                  detail: { panelId: 'object-tree', label: 'Object Tree' },
                }));
              }}
            >
              View Object tree
            </button>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        <ViewerCanvas viewerContainerRef={viewerContainerRef} />

        {showOverlays && (
          <>
            <ModeIdentifierOverlay />
            <LeftToolbar store={store} onHoverChange={setToolbarHovered} />
            <DockManager store={store} deemphasized={toolbarHovered} />

            <RightToolbar />
            <MiniMap />
            <NavigationWheel />
          </>
        )}
      </div>
    </div>
  );
}
