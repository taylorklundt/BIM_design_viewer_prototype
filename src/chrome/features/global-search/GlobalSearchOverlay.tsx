import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useViewerAdapter } from '../viewer-adapter/ViewerAdapterContext';
import { useGlobalSearch } from './useGlobalSearch';
import { useRecentSearches } from './useRecentSearches';
import { CATEGORY_LABELS, FILTER_OPTIONS } from './types';
import type { SearchEntity, SearchCategory } from './types';
import type { PanelId } from '../dock-manager/useDockStore';

function CategoryBadge({ type }: { type: SearchCategory }) {
  const label = CATEGORY_LABELS[type];
  return (
    <span
      className="inline-flex items-center h-6 px-2 text-xs font-semibold tracking-[0.25px] leading-4 rounded-full border border-[#d6dadc] bg-[#eef0f1] text-[#5e696e] shrink-0"
      title={label}
    >
      {label}
    </span>
  );
}

function SkeletonRows() {
  return (
    <div className="px-4 py-3 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-16 h-5 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" style={{ width: `${40 + Math.random() * 40}%` }} />
        </div>
      ))}
    </div>
  );
}

function SearchEmptyIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M45.5638 79.4702H17.3818V32.7002H1.7998V86.1002H49.2778C47.7478 84.0902 46.4938 81.8582 45.5638 79.4702Z" fill="#D6DADC" />
      <path d="M86.3996 18.2998V24.5998H17.3156V71.6998H9.59961V18.2998H86.3996Z" fill="#1952B3" />
      <path d="M91.7999 79.8001H17.3999V24.6001H91.7999V44.3101V53.1601V79.8001Z" fill="white" />
      <path d="M72.3 91.2001C87.3774 91.2001 99.6 78.9775 99.6 63.9001C99.6 48.8227 87.3774 36.6001 72.3 36.6001C57.2226 36.6001 45 48.8227 45 63.9001C45 78.9775 57.2226 91.2001 72.3 91.2001Z" fill="white" />
      <path d="M60.4497 39.2998H23.6997V54.2998H46.7397C49.2177 47.7118 54.1617 42.3358 60.4497 39.2998Z" fill="#F4F5F6" />
      <path d="M44.9997 63.8999C44.9997 61.8359 45.2337 59.8319 45.6717 57.8999H23.6997V72.8999H46.5237C45.5397 70.0799 44.9997 67.0559 44.9997 63.8999Z" fill="#F4F5F6" />
      <path d="M25.7757 28.7578H23.9097V30.6238H25.7757V28.7578Z" fill="#232729" />
      <path d="M29.0398 28.7578H27.1738V30.6238H29.0398V28.7578Z" fill="#232729" />
      <path d="M32.3098 28.7578H30.4438V30.6238H32.3098V28.7578Z" fill="#232729" />
      <path d="M96.3536 82.8599L95.0396 84.1739L92.8196 81.9539C97.0616 77.1359 99.6416 70.8299 99.6416 63.9239C99.6416 57.9839 97.7336 52.4879 94.4996 47.9999V23.3999H93.8996H89.6996H65.6996V24.5999H17.0996V79.7999H50.0996C55.0616 86.7239 63.1676 91.2479 72.3176 91.2479C79.0556 91.2479 85.2296 88.7879 89.9996 84.7319L92.2436 86.9759L90.9296 88.2899L112.044 109.404L117.474 103.974L96.3536 82.8599ZM91.0436 44.0579C91.0316 44.0459 91.0136 44.0279 91.0016 44.0159C91.0196 44.0279 91.0316 44.0459 91.0436 44.0579ZM19.4996 77.3999V34.7999H85.4996V32.3999H19.4996V26.9999H65.6996V28.1999H89.6996V42.8579C84.9716 38.9519 78.9116 36.5999 72.3176 36.5999C57.2516 36.5999 44.9936 48.8579 44.9936 63.9239C44.9936 68.8199 46.2956 73.4219 48.5636 77.3999H19.4996ZM72.3176 87.2459C59.4596 87.2459 48.9956 76.7819 48.9956 63.9239C48.9956 51.0659 59.4596 40.6019 72.3176 40.6019C85.1756 40.6019 95.6396 51.0599 95.6396 63.9239C95.6396 76.7879 85.1756 87.2459 72.3176 87.2459Z" fill="#232729" />
      <path d="M112.038 109.398L90.9238 88.2839L92.2378 86.9699L89.9938 84.7259C85.2238 88.7879 79.0498 91.2419 72.3118 91.2419C57.2458 91.2419 44.9878 78.9839 44.9878 63.9179C44.9878 62.8379 45.0598 61.7759 45.1798 60.7319C44.2258 63.5099 43.6978 66.4859 43.6978 69.5819C43.6978 84.6479 55.9558 96.9059 71.0218 96.9059C77.7598 96.9059 83.9338 94.4459 88.7038 90.3899L90.9478 92.6339L89.6338 93.9479L110.748 115.062L116.178 109.632L113.988 107.442L112.038 109.398Z" fill="#D6DADC" />
      <path d="M78.2396 52.8899C76.8236 51.7019 74.8256 51.1079 72.2516 51.1079C69.6656 51.1079 67.6556 51.7499 66.2216 53.0399C64.7876 54.3299 64.0616 56.1299 64.0376 58.4399H69.8936C69.9176 57.5759 70.1396 56.8859 70.5716 56.3759C70.9976 55.8659 71.5616 55.6139 72.2516 55.6139C73.7516 55.6139 74.5076 56.4839 74.5076 58.2299C74.5076 58.9439 74.2856 59.6039 73.8416 60.1979C73.3976 60.7919 72.7496 61.4459 71.8916 62.1659C71.0396 62.8799 70.4216 63.7259 70.0376 64.7039C69.6596 65.6819 69.4676 67.0139 69.4676 68.6999H74.4236C74.4476 67.8239 74.5676 67.0979 74.7896 66.5279C75.0056 65.9579 75.4016 65.3999 75.9656 64.8539L77.9576 62.9999C78.8036 62.1779 79.4156 61.3739 79.7936 60.5879C80.1776 59.8019 80.3636 58.9319 80.3636 57.9719C80.3576 55.7759 79.6556 54.0839 78.2396 52.8899Z" fill="#FF5100" />
      <path d="M71.9999 72.0723C71.0759 72.0723 70.3019 72.3483 69.6839 72.8943C69.0659 73.4403 68.7539 74.1423 68.7539 75.0003C68.7539 75.8583 69.0659 76.5603 69.6839 77.1063C70.3019 77.6583 71.0759 77.9283 71.9999 77.9283C72.9239 77.9283 73.6979 77.6523 74.3159 77.1063C74.9339 76.5603 75.2459 75.8523 75.2459 75.0003C75.2459 74.1423 74.9339 73.4403 74.3159 72.8943C73.6979 72.3423 72.9239 72.0723 71.9999 72.0723Z" fill="#FF5100" />
      <path d="M86.5882 11.473L85.3154 10.2002L81.0728 14.4428L82.3456 15.7156L86.5882 11.473Z" fill="#232729" />
      <path d="M61.8424 15.6727L63.1152 14.3999L58.8726 10.1573L57.5998 11.4301L61.8424 15.6727Z" fill="#232729" />
      <path d="M73.3151 5.3999H71.5151V11.9999H73.3151V5.3999Z" fill="#232729" />
      <path d="M57.5998 108.043L58.8726 109.315L63.1152 105.073L61.8424 103.8L57.5998 108.043Z" fill="#232729" />
      <path d="M82.3455 103.842L81.0728 105.115L85.3154 109.358L86.5882 108.085L82.3455 103.842Z" fill="#232729" />
      <path d="M70.8729 114.115L72.6729 114.115L72.6729 107.515L70.8729 107.515L70.8729 114.115Z" fill="#232729" />
    </svg>
  );
}

function EmptyState({ filterLabel }: { filterLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="mb-5">
        <SearchEmptyIllustration />
      </div>
      <p className="max-w-[520px] text-[20px] leading-7 tracking-[0.15px] font-semibold text-[#232729] mb-2">
        No {filterLabel} Match Your Search
      </p>
      <p className="max-w-[460px] text-[14px] leading-5 tracking-[0.15px] text-[#6a767c]">
        Check your spelling and filter options, or
        search for a different keyword.
      </p>
    </div>
  );
}

function NoRecentSearchesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-5">
        <SearchEmptyIllustration />
      </div>
      <p className="max-w-[520px] text-[20px] leading-7 tracking-[0.15px] font-semibold text-[#232729] mb-2">
        Begin using global search to search across the entire viewer
      </p>
      <p className="max-w-[460px] text-[14px] leading-5 tracking-[0.15px] text-[#6a767c]">
        Search the viewer using keywords or natural language phrases
      </p>
    </div>
  );
}

function KbdHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center h-6 px-2 text-xs font-normal tracking-[0.25px] text-black bg-white border border-[#d6dadc] rounded min-w-[32px]">
      {children}
    </span>
  );
}

function KeyboardHints() {
  return (
    <div className="flex items-center gap-6 pl-[41px] pr-2 py-1.5 bg-[#f9fafa] text-[#5e696e] rounded-b-[8px] overflow-x-auto">
      <span className="flex items-center gap-[9px] shrink-0">
        <span className="text-xs font-semibold tracking-[0.25px] leading-4">Open</span>
        <KbdHint>Space</KbdHint>
      </span>
      <span className="flex items-center gap-[9px] shrink-0">
        <span className="text-xs font-semibold tracking-[0.25px] leading-4">Exit</span>
        <KbdHint>Esc</KbdHint>
      </span>
      <span className="flex items-center gap-[9px] shrink-0">
        <span className="text-xs font-semibold tracking-[0.25px] leading-4">Navigate</span>
        <KbdHint>▼</KbdHint>
        <KbdHint>▲</KbdHint>
      </span>
      <span className="flex items-center gap-[9px] shrink-0">
        <span className="text-xs font-semibold tracking-[0.25px] leading-4">Filter</span>
        <KbdHint>/filtername</KbdHint>
      </span>
    </div>
  );
}

export function GlobalSearchOverlay() {
  const adapter = useViewerAdapter();
  const [isOpen, setIsOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [overlayPos, setOverlayPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const bar = document.getElementById('header-search-bar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    setOverlayPos({
      top: rect.top,
      left: rect.left + rect.width / 2,
      width: Math.max(560, rect.width),
    });
  }, [isOpen]);

  const {
    query,
    setQuery,
    activeFilters,
    toggleActiveFilter,
    results,
    isLoading,
    hasQuery,
    availableCategories,
    resetSearch,
  } = useGlobalSearch();

  const { recents, addRecent } = useRecentSearches();

  useEffect(() => {
    const handler = () => {
      setIsOpen(prev => {
        const next = !prev;
        if (next) {
          setTimeout(() => inputRef.current?.focus(), 0);
        } else {
          resetSearch();
          setFilterMenuOpen(false);
          setHighlightIndex(-1);
        }
        return next;
      });
    };
    window.addEventListener('mv:toggle-global-search', handler);
    return () => window.removeEventListener('mv:toggle-global-search', handler);
  }, [resetSearch]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        resetSearch();
        setFilterMenuOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, resetSearch]);

  useEffect(() => {
    if (!isOpen || !filterMenuOpen) return;
    const handleClickOutsideFilterMenu = (e: MouseEvent) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideFilterMenu);
    return () => document.removeEventListener('mousedown', handleClickOutsideFilterMenu);
  }, [isOpen, filterMenuOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    resetSearch();
    setFilterMenuOpen(false);
    setHighlightIndex(-1);
  }, [resetSearch]);

  const handleSelectEntity = useCallback((entity: SearchEntity) => {
    const openPanel = (panelId: PanelId, label: string) => {
      window.dispatchEvent(new CustomEvent('mv:open-panel', { detail: { panelId, label } }));
    };

    if (entity.sourceId === 'global-search:quick-commands') {
      inputRef.current?.focus();
      setFilterMenuOpen(false);
      return;
    }

    if (entity.sourceId === 'global-search:controls') {
      inputRef.current?.focus();
      setFilterMenuOpen(false);
      return;
    }

    if (entity.sourceId === 'global-search:filters') {
      setFilterMenuOpen(true);
      inputRef.current?.focus();
      return;
    }

    addRecent(entity);
    if (entity.type === 'object') {
      adapter.selectAndFocusObject?.(entity.sourceId);
      openPanel('object-tree', 'Object Tree');
    } else if (entity.type === 'property') {
      adapter.selectAndFocusObject?.(entity.sourceId);
      openPanel('properties', 'Properties');
    } else if (entity.type === 'view') {
      openPanel('views', 'Views');
    } else if (entity.type === 'item') {
      openPanel('items', 'Related Items');
    } else if (entity.type === 'material') {
      openPanel('sheets', 'Sheets');
    } else if (entity.type === 'group') {
      openPanel('search-sets', 'Search Sets');
    } else if (entity.type === 'setting') {
      openPanel('deviation', 'Deviation');
    } else if (entity.type === 'tool') {
      window.dispatchEvent(new CustomEvent('mv:activate-right-tool', { detail: { sourceId: entity.sourceId } }));
    } else if (entity.type === 'search-set') {
      adapter.executeSearchSet?.(entity.sourceId);
      openPanel('search-sets', 'Search Sets');
    }
    close();
  }, [adapter, addRecent, close]);

  const displayList = hasQuery ? results : recents;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, displayList.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter' && highlightIndex >= 0 && highlightIndex < displayList.length) {
      e.preventDefault();
      handleSelectEntity(displayList[highlightIndex]);
    }
  }, [close, displayList, highlightIndex, handleSelectEntity]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query, activeFilters]);

  const handleFilterSelect = useCallback((value: SearchCategory) => {
    toggleActiveFilter(value);
    inputRef.current?.focus();
  }, [toggleActiveFilter]);

  if (!isOpen) return null;

  const activeFilterLabel = activeFilters.length === 1
    ? (FILTER_OPTIONS.find(f => f.value === activeFilters[0])?.label ?? CATEGORY_LABELS[activeFilters[0]])
    : `Filters (${activeFilters.length})`;
  const emptyFilterLabel = activeFilters.length === 0
    ? '[Items]'
    : activeFilters.length === 1
      ? `${CATEGORY_LABELS[activeFilters[0]]}s`
      : 'Selected Filters';
  const filteredFilterOptions = FILTER_OPTIONS.filter(
    f => f.value !== 'all' && f.value !== 'search-set',
  );

  return (
    <div
      ref={overlayRef}
      className="fixed z-[100] flex flex-col gap-2 overflow-visible"
      style={{
        top: overlayPos?.top ?? 0,
        left: overlayPos?.left ?? '50%',
        transform: 'translateX(-50%)',
        width: overlayPos?.width ?? 560,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'min(520px, calc(100vh - 16px))',
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Top container: search bar + quick commands */}
      <div className="bg-white rounded-[8px] border border-[#e5e7eb] shadow-[0_4px_20px_rgba(0,0,0,0.35)] overflow-visible">
        {/* Top bar: filter + input + actions */}
        <div className="flex items-center gap-2 px-[6px] py-[6px] h-9 bg-[#eef0f1] rounded-t-[8px]">
          <div className="relative" ref={filterContainerRef}>
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => setFilterMenuOpen(p => !p)}
              className={`relative flex items-center gap-2 h-7 px-2 rounded transition-colors ${
                filterMenuOpen || activeFilters.length > 0
                  ? 'bg-[#d6dadc] border-2 border-[#1952b3]'
                  : 'hover:bg-[#e5e7eb] border border-transparent'
              }`}
              aria-label="Filter categories"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#232729]">
                <path d="M2.25 4h11.5M4.5 8h7M6.5 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {activeFilters.length > 0 && (
                <span className="text-[12px] font-semibold tracking-[0.25px] text-[#232729] leading-4 whitespace-nowrap">
                  {activeFilterLabel}
                </span>
              )}
              <span className="absolute -right-[7px] top-1/2 -translate-y-1/2 w-px h-4 bg-[#d6dadc]" />
            </button>

            {filterMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.18)] border border-[#d6dadc] py-1 z-20 max-h-[320px] overflow-y-auto">
                {filteredFilterOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleFilterSelect(opt.value as SearchCategory)}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      activeFilters.includes(opt.value as SearchCategory)
                        ? 'text-[#0043ff] font-semibold bg-[#f0f5ff]'
                        : 'text-[#232729] hover:bg-[#f7f8f8]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search objects, properties, tools..."
            className="flex-1 bg-transparent outline-none text-[14px] leading-5 tracking-[0.15px] text-[#232729] placeholder-[#6a767c] min-w-0"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex items-center justify-center w-6 h-6 text-[#232729] shrink-0" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <KeyboardHints />
      </div>

      {/* Bottom container: results / empty state */}
      <div className="flex-1 min-h-0 bg-white rounded-[8px] border border-[#f4f5f6] shadow-[0_4px_20px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="h-full overflow-y-auto">
          {isLoading && !hasQuery ? (
            <SkeletonRows />
          ) : hasQuery && results.length === 0 ? (
            <EmptyState filterLabel={emptyFilterLabel} />
          ) : displayList.length > 0 ? (
            <div>
              {!hasQuery && recents.length > 0 && (
                <p className="px-3 pt-4 pb-1 text-[12px] font-normal text-[#6a767c] tracking-[0.25px] leading-4">
                  Recent searches
                </p>
              )}
              {hasQuery && (
                <p className="px-3 pt-4 pb-1 text-[12px] font-normal text-[#6a767c] tracking-[0.25px] leading-4">
                  Results ({results.length})
                </p>
              )}
              <ul>
                {displayList.map((entity, i) => (
                  <li key={entity.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectEntity(entity)}
                      onMouseEnter={() => setHighlightIndex(i)}
                      className={`flex items-center gap-3 w-full pl-[28px] pr-2 py-[10px] text-left transition-colors ${
                        i === highlightIndex ? 'bg-[#f4f5f6]' : 'hover:bg-[#f9fafa]'
                      }`}
                    >
                      <CategoryBadge type={entity.type} />
                      <span className="text-[14px] leading-5 tracking-[0.15px] text-black truncate">{entity.label}</span>
                      {entity.sublabel && (
                        <span className="text-xs text-[#6a767c] truncate ml-auto shrink-0">
                          {entity.sublabel}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : !hasQuery && recents.length === 0 ? (
            <NoRecentSearchesEmptyState />
          ) : null}
        </div>
      </div>
    </div>
  );
}
