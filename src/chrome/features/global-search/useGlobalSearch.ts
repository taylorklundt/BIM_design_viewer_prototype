import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useViewerAdapter } from '../viewer-adapter/ViewerAdapterContext';
import type { SearchEntity, SearchCategory } from './types';

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 50;

export function useGlobalSearch() {
  const adapter = useViewerAdapter();
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<SearchCategory[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(value), DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const index = useMemo<SearchEntity[]>(() => {
    const entities: SearchEntity[] = [];

    const pushPanelEntity = (
      id: string,
      type: SearchCategory,
      label: string,
      panelId: string,
      keywords: string[],
    ) => {
      entities.push({
        id,
        type,
        label,
        sublabel: 'Panel',
        sourceId: panelId,
        keywords,
      });
    };

    const objects = adapter.getObjectList?.() ?? [];
    for (const obj of objects) {
      entities.push({
        id: `object::${obj.expressID}`,
        type: 'object',
        label: obj.name,
        sublabel: obj.ifcType,
        sourceId: obj.expressID,
        keywords: [obj.name, obj.ifcType, obj.expressID].filter(Boolean),
      });

      entities.push({
        id: `property::${obj.expressID}`,
        type: 'property',
        label: obj.name,
        sublabel: obj.ifcType ? `Property • ${obj.ifcType}` : 'Property',
        sourceId: obj.expressID,
        keywords: [obj.name, obj.ifcType, obj.expressID, 'property', 'properties'].filter(Boolean),
      });
    }

    pushPanelEntity('view::views', 'view', 'Views', 'views', ['views', 'saved views', 'camera']);
    pushPanelEntity('item::items', 'item', 'Related Items', 'items', ['items', 'related items']);
    pushPanelEntity('material::sheets', 'material', 'Sheets', 'sheets', ['materials', 'sheets', 'map']);
    pushPanelEntity('group::search-sets', 'group', 'Search Sets', 'search-sets', ['groups', 'search sets']);
    pushPanelEntity('setting::deviation', 'setting', 'Deviation', 'deviation', ['settings', 'deviation']);

    const toolEntities: SearchEntity[] = [
      { id: 'tool::global-search::quick-commands', type: 'tool', label: 'Quick Commands', sublabel: 'Global Search • Keyboard shortcuts row', sourceId: 'global-search:quick-commands', keywords: ['quick commands', 'shortcuts', 'keyboard hints', 'global search'] },
      { id: 'tool::global-search::controls', type: 'tool', label: 'Controls', sublabel: 'Global Search • Navigation controls', sourceId: 'global-search:controls', keywords: ['controls', 'navigate', 'arrow keys', 'global search controls'] },
      { id: 'tool::global-search::filters', type: 'tool', label: 'Filters', sublabel: 'Global Search • Filter categories', sourceId: 'global-search:filters', keywords: ['filters', 'filter', 'categories', 'search filters'] },
      { id: 'tool::mode::markup', type: 'tool', label: 'Markup', sublabel: 'Right Toolbar • Markup mode', sourceId: 'mode:markup', keywords: ['tool', 'markup', 'annotation', 'draw'] },
      { id: 'tool::mode::measure', type: 'tool', label: 'Measure', sublabel: 'Right Toolbar • Measure mode', sourceId: 'mode:measure', keywords: ['tool', 'measure', 'dimensions', 'point to point', 'laser', 'coordinates'] },
      { id: 'tool::mode::create', type: 'tool', label: 'Create Item', sublabel: 'Right Toolbar • Create mode', sourceId: 'mode:create', keywords: ['tool', 'create', 'issue', 'punchlist'] },
      { id: 'tool::mode::sectioning', type: 'tool', label: 'Sectioning', sublabel: 'Right Toolbar • Sectioning mode', sourceId: 'mode:sectioning', keywords: ['tool', 'section', 'cut', 'clip'] },
      { id: 'tool::section::box', type: 'tool', label: 'Section Box', sublabel: 'Right Toolbar • Sectioning tool', sourceId: 'sectioning:section-box', keywords: ['tool', 'section box', 'box clip'] },
      { id: 'tool::section::plane', type: 'tool', label: 'Section Plane', sublabel: 'Right Toolbar • Sectioning tool', sourceId: 'sectioning:section-plane', keywords: ['tool', 'section plane', 'clip plane'] },
      { id: 'tool::section::cut', type: 'tool', label: 'Section Cut', sublabel: 'Right Toolbar • Sectioning tool', sourceId: 'sectioning:section-cut', keywords: ['tool', 'section cut', 'face cut'] },
      { id: 'tool::render::settings', type: 'tool', label: 'Render Settings', sublabel: 'Right Toolbar • Render flyout', sourceId: 'flyout:render', keywords: ['tool', 'render', 'mesh', 'lines', 'terrain', 'point cloud'] },
    ];
    entities.push(...toolEntities);

    const searchSets = adapter.getSearchSets?.() ?? [];
    for (const ss of searchSets) {
      entities.push({
        id: `search-set::${ss.id}`,
        type: 'search-set',
        label: ss.name,
        sublabel: 'Saved search query',
        sourceId: ss.id,
        keywords: [ss.name],
      });
    }

    return entities;
  }, [adapter]);

  const availableCategories = useMemo(() => {
    return new Set<SearchCategory>([
      'object',
      'view',
      'property',
      'item',
      'material',
      'group',
      'tool',
      'setting',
      'search-set',
    ]);
  }, [index]);

  const isLoading = index.length === 0;

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const lower = debouncedQuery.toLowerCase();

    const filtered: SearchEntity[] = [];
    for (const entity of index) {
      const isGlobalSearchCommand =
        entity.sourceId === 'global-search:quick-commands' ||
        entity.sourceId === 'global-search:controls' ||
        entity.sourceId === 'global-search:filters';
      if (activeFilters.length > 0 && !activeFilters.includes(entity.type) && !isGlobalSearchCommand) continue;
      const matches =
        entity.label.toLowerCase().includes(lower) ||
        entity.sublabel.toLowerCase().includes(lower) ||
        entity.keywords.some(k => k.toLowerCase().includes(lower));
      if (matches) {
        filtered.push(entity);
        if (filtered.length >= MAX_RESULTS) break;
      }
    }
    return filtered;
  }, [debouncedQuery, activeFilters, index]);

  const toggleActiveFilter = useCallback((value: SearchCategory) => {
    setActiveFilters((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      return [...prev, value];
    });
  }, []);

  const resetSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setActiveFilters([]);
  }, []);

  return {
    query,
    setQuery: handleQueryChange,
    activeFilters,
    toggleActiveFilter,
    results,
    isLoading,
    hasQuery: debouncedQuery.trim().length > 0,
    availableCategories,
    resetSearch,
  };
}
