import { useRef, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { PanelId } from './useDockStore';
import minimizeIcon from '../../assets/icons/panel/minimize.svg';
import expandIcon from '../../assets/icons/panel/expand.svg';
import plusIcon from '../../assets/icons/panel/plus.svg';
import clearIcon from '../../assets/icons/panel/clear.svg';

interface DockedPanelProps {
  id: PanelId;
  title: string;
  subheader?: string;
  docked: boolean;
  minimized: boolean;
  floatPosition?: { x: number; y: number };
  floatHeight?: number;
  floatWidth?: number;
  isLifted?: boolean;
  isDetached?: boolean;
  toolbar?: React.ReactNode;
  tabs?: Array<{ id: string; label: string }>;
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  breadcrumbs?: string[];
  /** When provided, renders an ArrowLeft button at the start of the heading row and indents the subheading. */
  onBack?(): void;
  /** Optional footer slot (rendered below the content area). */
  footer?: React.ReactNode;
  /**
   * Content area surface treatment.
   * - 'bleed' (default): children render edge-to-edge on white. Use for list/tree panels.
   * - 'padded': children sit on a 16px gray inset (#F4F5F6). Use when children are discrete card-like groupings (e.g. Properties).
   */
  contentVariant?: 'bleed' | 'padded';
  children: React.ReactNode;
  onClose(): void;
  onToggleMinimize(): void;
  onDragStart(e: React.PointerEvent<HTMLDivElement>): void;
  onToggleDock(): void;
  onAdd?(): void;
  onDetach?(): void;
  onReattach?(): void;
  onResizeHeight?(height: number): void;
  onResizeSize?(size: { width?: number; height?: number }): void;
  onResizeStart?(): void;
  onResizeEnd?(): void;
  /** Visually de-emphasise panel when a toolbar tooltip is showing. */
  deemphasized?: boolean;
}

const MIN_HEIGHT = 120;
const MIN_WIDTH = 240;

export function DockedPanel({
  title,
  subheader,
  docked,
  minimized,
  floatPosition,
  floatHeight,
  floatWidth,
  isLifted = false,
  isDetached = false,
  toolbar,
  tabs,
  activeTabId,
  onTabChange,
  breadcrumbs,
  onBack,
  footer,
  contentVariant = 'bleed',
  children,
  onClose,
  onToggleMinimize,
  onDragStart,
  onToggleDock,
  onAdd,
  onDetach,
  onReattach,
  onResizeHeight,
  onResizeSize,
  onResizeStart,
  onResizeEnd,
  deemphasized = false,
}: DockedPanelProps) {
  const hasTabs = !minimized && !!tabs && tabs.length > 0;

  // ── Resize drag state (declared early — used in containerStyle) ──
  const [resizing, setResizing] = useState(false);
  const resizeRef = useRef<{
    edge: 'bottom' | 'corner';
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const panelRootRef = useRef<HTMLDivElement>(null);

  const RESTING_SHADOW = '0 0 4px 0 rgba(0,0,0,0.25)';
  const FLOATING_SHADOW = '0 0 20px 0 rgba(0,0,0,0.2)';
  const LIFTED_SHADOW = '0 0 20px 0 rgba(0,0,0,0.2), 0 12px 32px rgba(0,0,0,0.22)';
  const boxShadow = isLifted ? LIFTED_SHADOW : (docked ? RESTING_SHADOW : FLOATING_SHADOW);

  const w = floatWidth ?? 320;
  const h = minimized ? 'auto' : (floatHeight ?? 480);

  const deemphStyles: React.CSSProperties = deemphasized
    ? { filter: 'blur(3px)' }
    : {};
  const deemphTransition = 'filter 120ms ease';

  const containerStyle: React.CSSProperties = isDetached
    ? {
        width: '100%',
        height: '100%',
        minHeight: 0,
        boxShadow: 'none',
        borderRadius: 0,
        border: 'none',
      }
    : docked
      ? {
          height: minimized ? 'auto' : '100%',
          minHeight: 0,
          boxShadow,
          transition: `box-shadow 200ms ease, ${deemphTransition}`,
          ...deemphStyles,
        }
      : {
          position: 'fixed',
          left: floatPosition?.x ?? 400,
          top: floatPosition?.y ?? 80,
          width: w,
          height: h,
          zIndex: 200,
          boxShadow,
          transition: resizing ? deemphTransition : `height 200ms cubic-bezier(0.22, 1, 0.36, 1), ${deemphTransition}`,
          ...deemphStyles,
        };

  const handleResizePointerDown = useCallback((
    e: React.PointerEvent,
    edge: 'bottom' | 'corner',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = panelRootRef.current?.getBoundingClientRect();
    if (!rect) return;
    resizeRef.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
    };
    setResizing(true);
    onResizeStart?.();
  }, [onResizeStart]);

  useEffect(() => {
    if (!resizing) return;

    const onMove = (e: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const dy = e.clientY - r.startY;
      const newH = Math.max(MIN_HEIGHT, r.startH + dy);

      if (r.edge === 'corner' && !docked) {
        const dx = e.clientX - r.startX;
        const newW = Math.max(MIN_WIDTH, r.startW + dx);
        onResizeSize?.({ width: newW, height: newH });
      } else if (docked) {
        onResizeHeight?.(newH);
      } else {
        onResizeSize?.({ height: newH });
      }
    };

    const onUp = () => {
      resizeRef.current = null;
      setResizing(false);
      onResizeEnd?.();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [resizing, docked, onResizeHeight, onResizeSize, onResizeEnd]);

  return (
    <div
      ref={panelRootRef}
      data-panel-root
      style={containerStyle}
      className={`relative flex flex-col bg-white overflow-hidden select-none ${isDetached ? '' : 'rounded-lg'}`}
    >
      {/* Header — grabbing here triggers the drag */}
      <div
        className={`flex items-start justify-between px-4 pt-4 pb-4 bg-white ${isDetached ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} shrink-0 ${
          minimized || hasTabs ? '' : 'border-b border-[#e5e7eb]'
        }`}
        onPointerDown={isDetached ? undefined : onDragStart}
      >
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex items-start gap-2 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                onPointerDown={(e) => e.stopPropagation()}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-black/5"
              >
                <ArrowLeft size={16} className="text-[#232729]" />
              </button>
            )}
            <span className="block text-[16px] leading-[24px] tracking-[0.15px] font-semibold text-[#232729] truncate min-w-0 flex-1">
              {title}
            </span>
          </div>
          {!minimized && subheader && (
            <div className={`text-[14px] leading-[20px] tracking-[0.15px] font-normal text-[#6A767C] truncate ${onBack ? 'pl-8' : ''}`}>
              {subheader}
            </div>
          )}
        </div>

        <div
          className="flex items-center gap-2 ml-2 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isDetached ? (
            <>
              <button
                type="button"
                onClick={onReattach ?? onToggleDock}
                aria-label="Return to dock"
                className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] font-medium text-gray-600 hover:bg-[#E3E6E8] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 14l-4-4 4-4" />
                  <path d="M5 10h11a4 4 0 0 1 0 8h-1" />
                </svg>
                Return to dock
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#E3E6E8]"
              >
                <img src={clearIcon} alt="" width={16} height={16} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onToggleMinimize}
                aria-label={minimized ? 'Expand' : 'Minimize'}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#E3E6E8]"
              >
                <img src={minimized ? expandIcon : minimizeIcon} alt="" width={16} height={16} />
              </button>

              {onDetach && (
                <button
                  type="button"
                  onClick={onDetach}
                  aria-label="Open in new window"
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#E3E6E8]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#232729" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
              )}

              {onAdd && (
                <button
                  type="button"
                  onClick={onAdd}
                  aria-label="Add"
                  className="w-6 h-6 flex items-center justify-center rounded bg-[#FF5100] hover:bg-[#E64900]"
                >
                  <img src={plusIcon} alt="" width={16} height={16} style={{ filter: 'brightness(0) invert(1)' }} />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#E3E6E8]"
              >
                <img src={clearIcon} alt="" width={16} height={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Optional toolbar (search bar, filters, etc.) */}
      {hasTabs && (
        <div className="border-b border-[#e5e7eb] px-4">
          <div className="flex items-end gap-6">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange?.(tab.id)}
                  className={`relative pb-1 text-[14px] leading-[20px] tracking-[0.15px] transition-colors ${
                    isActive ? 'font-semibold text-gray-900' : 'font-medium text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 right-0 -bottom-[1px] h-[4px] bg-black"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!minimized && toolbar && (
        <div className="shrink-0">{toolbar}</div>
      )}

      {!minimized && breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 bg-white text-[14px] leading-[20px] tracking-[0.15px] overflow-hidden border-b border-[#dcdcdc] shrink-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb}-${i}`} className="flex items-center gap-1 shrink-0 min-w-0">
              {i > 0 && <ChevronRight size={12} className="text-[#6A767C] shrink-0" />}
              <span
                className={`truncate ${
                  i === breadcrumbs.length - 1
                    ? 'font-semibold text-[#232729]'
                    : 'text-[#6A767C] hover:underline cursor-pointer'
                }`}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      {!minimized && (
        <div
          className={`flex-1 overflow-y-auto min-h-0 ${
            contentVariant === 'padded' ? 'bg-[#F4F5F6] p-4' : 'bg-white'
          }`}
        >
          {children}
        </div>
      )}

      {!minimized && footer && (
        <div className="flex items-center justify-between gap-2 bg-white px-4 py-2 shadow-[0_-1px_0_#dcdcdc] shrink-0">
          {footer}
        </div>
      )}

      {/* Resize handles */}
      {!minimized && !isDetached && (
        <>
          {/* Bottom edge — vertical resize (both docked and floating) */}
          <div
            className="absolute bottom-0 left-2 right-2 h-1.5 cursor-ns-resize z-10 group"
            onPointerDown={(e) => handleResizePointerDown(e, 'bottom')}
          >
            <div className="absolute inset-x-0 bottom-0 h-px bg-transparent group-hover:bg-gray-300 transition-colors" />
          </div>

          {/* Corner handle — bidirectional resize (floating only) */}
          {!docked && (
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20"
              onPointerDown={(e) => handleResizePointerDown(e, 'corner')}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className="absolute bottom-1 right-1 text-gray-300 group-hover:text-gray-400"
              >
                <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
}
