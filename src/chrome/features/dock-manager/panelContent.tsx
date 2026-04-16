import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  AlertTriangle,
  Binoculars,
  ClipboardList,
  FileQuestion,
  Home,
  ListChecks,
  ShieldCheck,
  Wrench,
  ChevronRight,
  ChevronDown,
  Folder,
  Star,
} from 'lucide-react';
import { useViewerAdapter } from '../viewer-adapter/ViewerAdapterContext';
import type { SearchSet, ViewData, ViewFolder, PropertyGroup, ObjectProperty } from '../viewer-adapter/types';
import type { PanelId } from './useDockStore';
import searchFieldIcon from '../../assets/icons/panel/searchField.svg';
import filterButtonIcon from '../../assets/icons/panel/filterButton.svg';

export type PropertiesTabId = 'all-properties' | 'related-items';

function PanelSearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center w-full h-7 rounded-md border border-[#ECEFF1] bg-[#F5F7F8] px-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-[#111827] placeholder-[#6B7785] outline-none"
      />
      <img src={searchFieldIcon} alt="" width={24} height={24} className="shrink-0" />
    </div>
  );
}

// ─── Search Sets ─────────────────────────────────────────────────────────────

function SearchSetsContent() {
  const adapter = useViewerAdapter();
  const [searchSets, setSearchSets] = useState<SearchSet[]>([]);

  useEffect(() => {
    setSearchSets(adapter.getSearchSets?.() ?? []);
  }, [adapter]);

  const handleRun = (id: string) => adapter.executeSearchSet?.(id);
  const handleDelete = (id: string) => {
    adapter.deleteSearchSet?.(id);
    setSearchSets((prev) => prev.filter((s) => s.id !== id));
  };

  if (searchSets.length === 0) {
    return (
      <p className="px-3 py-6 text-sm text-gray-400 text-center">No saved searches</p>
    );
  }

  return (
    <ul>
      {searchSets.map((set) => (
        <li
          key={set.id}
          className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
        >
          <span className="text-sm text-gray-700 truncate flex-1 mr-2">{set.name}</span>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => handleRun(set.id)}
              className="px-2 py-0.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Run
            </button>
            <button
              onClick={() => handleDelete(set.id)}
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-500 rounded"
            >
              Del
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Related Items ────────────────────────────────────────────────────────────

const ITEMS = [
  { label: 'Assets', Icon: Home },
  { label: 'Coordination Issues', Icon: AlertTriangle },
  { label: 'Punch List', Icon: Wrench },
  { label: 'Quality Inspections', Icon: ClipboardList },
  { label: 'Quality Observation', Icon: Binoculars },
  { label: 'RFIs', Icon: FileQuestion },
  { label: 'Safety Inspections', Icon: ShieldCheck },
  { label: 'Safety Observation', Icon: Binoculars },
  { label: 'Submittals', Icon: ListChecks },
] as const;

function ItemsContent() {
  return (
    <ul className="px-2 py-1">
      {ITEMS.map(({ label, Icon }) => (
        <li key={label}>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-2 py-[11px] text-left transition-colors hover:bg-gray-100"
          >
            <span className="flex items-center gap-3 text-sm font-semibold text-gray-700">
              <Icon size={16} strokeWidth={2} className="text-gray-600" />
              {label}
            </span>
            <span className="pr-1 text-xl leading-none text-gray-400">›</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ─── Object Tree ──────────────────────────────────────────────────────────────

interface ObjNode {
  id: string;
  label: string;
  type: 'folder' | 'file';
  objectId?: string;
  expressID?: string;
  parentId?: string;
  children?: ObjNode[];
}

const DEMO_OBJECT_TREE: ObjNode[] = [
  {
    id: 'mep', label: 'MEP Schematics', type: 'folder', children: [],
  },
  { id: 'found', label: 'Foundation & Piling', type: 'folder' },
  { id: 'f02', label: 'Floor 02', type: 'folder' },
  { id: 'f01', label: 'Floor 01', type: 'folder' },
  { id: 'struct', label: 'Structural Blueprints', type: 'folder' },
  { id: 'park', label: 'Parking_Sublevel_P2.ifc', type: 'file' },
  { id: 'main', label: 'Main_Utility_Hub.nwd', type: 'file' },
  { id: 'aurora', label: 'Aurora_Towers_Core.rvt', type: 'file' },
  { id: 'arch', label: 'Architectural Designs', type: 'folder' },
  { id: 'site', label: 'Site Staging Plans', type: 'folder' },
  { id: 'facade', label: 'Building Facade', type: 'folder' },
  { id: 'walls', label: 'Interior Walls', type: 'folder' },
  { id: 'hvac', label: 'HVAC Layout', type: 'folder' },
  { id: 'plumb', label: 'Plumbing & Drainage', type: 'folder' },
  { id: 'elec', label: 'Electrical Grids', type: 'folder' },
  { id: 'fire', label: 'Fire Suppression', type: 'folder' },
  { id: 'roof', label: 'Roofing System', type: 'folder' },
  { id: 'civil', label: 'Civil Engineering Docs', type: 'folder' },
];

const BREADCRUMBS = ['Tool Name', 'Child Page Title', 'Active C...'];

function flattenObjNodes(nodes: ObjNode[]): ObjNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenObjNodes(node.children) : [])]);
}

function collectObjNodeIds(node: ObjNode): string[] {
  return [node.id, ...(node.children ? node.children.flatMap(collectObjNodeIds) : [])];
}

function buildObjectTreeByType(nodes: Array<{ id: string; label: string; ifcType: string; expressID: string }>): ObjNode[] {
  const byType = new Map<string, ObjNode[]>();
  nodes.forEach((node) => {
    const typeLabel = node.ifcType || 'Uncategorized';
    const folderId = `ifc-${typeLabel}`;
    const child: ObjNode = {
      id: node.id,
      label: node.label || node.expressID,
      type: 'file',
      objectId: node.expressID || node.id,
      expressID: node.expressID,
      parentId: folderId,
    };
    if (!byType.has(typeLabel)) byType.set(typeLabel, []);
    byType.get(typeLabel)!.push(child);
  });

  return Array.from(byType.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([typeLabel, children]) => ({
      id: `ifc-${typeLabel}`,
      label: typeLabel,
      type: 'folder',
      children: children.sort((a, b) => a.label.localeCompare(b.label)),
    }));
}

function ObjectTreeToolbar() {
  const [query, setQuery] = useState('');
  return (
    <div className="border-b border-[#e5e7eb]">
      <div className="flex items-center gap-2 px-3 py-2">
        <PanelSearchBar value={query} onChange={setQuery} placeholder="Filter by Keyword" />
        <button
          type="button"
          aria-label="Filter"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"
        >
          <img src={filterButtonIcon} alt="" width={16} height={16} />
        </button>
      </div>
      <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 overflow-hidden">
        {BREADCRUMBS.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-1 shrink-0">
            {i > 0 && <ChevronRight size={10} className="text-gray-400" />}
            <span className={i === BREADCRUMBS.length - 1 ? 'font-semibold text-gray-800' : 'hover:underline cursor-pointer'}>
              {crumb}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface ObjTreeNodeProps {
  node: ObjNode;
  depth?: number;
  checkedIds: Set<string>;
  expandedIds: Set<string>;
  loadingIds?: Set<string>;
  onToggleChecked: (node: ObjNode, checked: boolean) => void;
  onToggleExpanded: (nodeId: string) => void;
}

function ObjTreeNode({
  node,
  depth = 0,
  checkedIds,
  expandedIds,
  loadingIds,
  onToggleChecked,
  onToggleExpanded,
}: ObjTreeNodeProps) {
  const expanded = node.children ? expandedIds.has(node.id) : false;
  const checked = checkedIds.has(node.id);
  const isFolder = node.type === 'folder';
  const isLoading = loadingIds ? loadingIds.has(node.id) : false;

  return (
    <>
      <div
        className="flex items-center gap-1 hover:bg-gray-50 cursor-pointer select-none"
        style={{ paddingLeft: 8 + depth * 20, paddingRight: 8, paddingTop: 6, paddingBottom: 6 }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={isLoading}
          onChange={(e) => onToggleChecked(node, e.target.checked)}
          className={`w-4 h-4 shrink-0 accent-blue-500 ${isLoading ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
          onClick={(e) => e.stopPropagation()}
        />

        {isFolder && (
          <button
            type="button"
            onClick={() => onToggleExpanded(node.id)}
            className="w-5 h-5 flex items-center justify-center shrink-0 text-gray-500"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {isFolder && <Folder size={16} className="text-gray-400 shrink-0" />}

        {isLoading ? (
          <span className="flex-1 ml-1 h-3.5 rounded bg-gray-200 mv-skeleton-pulse" style={{ maxWidth: 120 }} />
        ) : (
          <span
            className="text-sm text-gray-700 truncate flex-1 ml-1"
            onClick={() => isFolder && onToggleExpanded(node.id)}
          >
            {node.label}
          </span>
        )}
      </div>

      {expanded && node.children?.map((child) => (
        <ObjTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          checkedIds={checkedIds}
          expandedIds={expandedIds}
          loadingIds={loadingIds}
          onToggleChecked={onToggleChecked}
          onToggleExpanded={onToggleExpanded}
        />
      ))}
    </>
  );
}

function ObjectTreeContent() {
  const adapter = useViewerAdapter();
  const [objectEntries, setObjectEntries] = useState(() => adapter.getObjectList?.() ?? []);
  const prevEntryCountRef = useRef(objectEntries.length);
  useEffect(() => {
    const unsubscribe = adapter.subscribeObjectList?.((entries) => {
      if (entries.length !== prevEntryCountRef.current) {
        prevEntryCountRef.current = entries.length;
        setObjectEntries(entries);
      }
    });
    if (!unsubscribe) {
      setObjectEntries(adapter.getObjectList?.() ?? []);
    }
    return () => unsubscribe?.();
  }, [adapter]);

  const realObjectNodes = useMemo<ObjNode[]>(() => {
    const entries = objectEntries;
    const normalized = entries.map((entry) => ({
      id: entry.id,
      label: entry.name || entry.expressID,
      ifcType: entry.ifcType || '',
      expressID: entry.expressID,
    }));
    return buildObjectTreeByType(normalized);
  }, [objectEntries]);
  const objectTreeNodes = realObjectNodes.length > 0 ? realObjectNodes : DEMO_OBJECT_TREE;
  const flatNodes = useMemo(() => flattenObjNodes(objectTreeNodes), [objectTreeNodes]);
  const nodeIdByExpressId = useMemo(() => {
    const map = new Map<string, string>();
    flatNodes.forEach((node) => {
      if (node.expressID) map.set(node.expressID, node.id);
      if (node.objectId) map.set(node.objectId, node.id);
      map.set(node.id, node.id);
    });
    return map;
  }, [flatNodes]);
  const parentIdByNodeId = useMemo(() => {
    const map = new Map<string, string>();
    flatNodes.forEach((node) => {
      if (node.parentId) map.set(node.id, node.parentId);
    });
    return map;
  }, [flatNodes]);

  const [streamComplete, setStreamComplete] = useState(() => adapter.getObjectStreamingState?.()?.streamComplete ?? true);
  useEffect(() => {
    const unsubscribe = adapter.subscribeObjectStreamingState?.((state) => {
      setStreamComplete(state.streamComplete);
    });
    return () => unsubscribe?.();
  }, [adapter]);

  const loadingIds = useMemo<Set<string> | undefined>(() => {
    if (streamComplete) return undefined;
    const ids = new Set<string>();
    flatNodes.forEach((node) => ids.add(node.id));
    return ids;
  }, [streamComplete, flatNodes]);

  const [rootExpanded, setRootExpanded] = useState(true);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const syncingFromModelSelectionRef = useRef(false);
  const totalObjects = flatNodes.length;
  const checkedCount = checkedIds.size;
  const rootChecked = totalObjects > 0 && checkedCount === totalObjects;

  useEffect(() => {
    setCheckedIds(new Set());
  }, [objectTreeNodes]);

  useEffect(() => {
    const unsubscribe = adapter.subscribeSelectedObjects?.((selectedExpressIds) => {
      const nextChecked = new Set<string>();
      const parentsToExpand = new Set<string>();

      selectedExpressIds.forEach((expressId) => {
        const nodeId = nodeIdByExpressId.get(String(expressId));
        if (!nodeId) return;
        nextChecked.add(nodeId);
        const parentId = parentIdByNodeId.get(nodeId);
        if (parentId) parentsToExpand.add(parentId);
      });

      syncingFromModelSelectionRef.current = true;
      setCheckedIds(nextChecked);
      if (parentsToExpand.size > 0) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          parentsToExpand.forEach((id) => next.add(id));
          return next;
        });
      }
      queueMicrotask(() => {
        syncingFromModelSelectionRef.current = false;
      });
    });
    return () => unsubscribe?.();
  }, [adapter, nodeIdByExpressId, parentIdByNodeId]);

  useEffect(() => {
    if (syncingFromModelSelectionRef.current) return;
    const selectedObjectIds = flatNodes
      .filter((node) => checkedIds.has(node.id))
      .map((node) => node.objectId)
      .filter((id): id is string => Boolean(id));
    adapter.setSelectedObjects?.(selectedObjectIds);
  }, [adapter, checkedIds, flatNodes]);

  const onToggleChecked = useCallback((node: ObjNode, checked: boolean) => {
    const affectedIds = collectObjNodeIds(node);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      affectedIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }, []);

  const onToggleRootChecked = useCallback((checked: boolean) => {
    if (checked) setCheckedIds(new Set(flatNodes.map((node) => node.id)));
    else setCheckedIds(new Set());
  }, [flatNodes]);

  const onToggleExpanded = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!actionsOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [actionsOpen]);

  const onHideObjects = useCallback(() => {
    const checkedExpressIds = flatNodes
      .filter((node) => checkedIds.has(node.id))
      .map((node) => node.expressID)
      .filter((id): id is string => Boolean(id));

    if (checkedExpressIds.length > 0) {
      adapter.hideObjects?.(checkedExpressIds);
    }
    setActionsOpen(false);
  }, [adapter, checkedIds, flatNodes]);

  return (
    <div className="py-1">
      {checkedCount > 0 && (
        <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-gray-50 px-2 py-1.5">
          <span className="text-xs font-medium text-gray-600">{checkedCount} selected</span>
          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              onClick={() => setActionsOpen((o) => !o)}
              className="h-7 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700 flex items-center gap-1 hover:bg-gray-50"
            >
              Actions
              <ChevronDown size={12} />
            </button>
            {actionsOpen && (
              <div className="absolute right-0 top-full mt-1 min-w-[140px] rounded-md border border-gray-200 bg-white shadow-lg z-50 py-1">
                <button
                  type="button"
                  onClick={onHideObjects}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                >
                  Hide objects
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Root row */}
      <div className="flex items-center gap-1 hover:bg-gray-50 cursor-pointer select-none px-2 py-1.5">
        <input
          type="checkbox"
          checked={rootChecked}
          disabled={!!loadingIds}
          onChange={(e) => onToggleRootChecked(e.target.checked)}
          className={`w-4 h-4 shrink-0 accent-blue-500 ${loadingIds ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          onClick={() => setRootExpanded((e) => !e)}
          className="w-5 h-5 flex items-center justify-center shrink-0 text-gray-500"
        >
          {rootExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="flex-1" />
        <span className="text-xs text-gray-500">{totalObjects} Objects</span>
      </div>

      {rootExpanded && objectTreeNodes.map((node) => (
        <ObjTreeNode
          key={node.id}
          node={node}
          depth={0}
          checkedIds={checkedIds}
          expandedIds={expandedIds}
          loadingIds={loadingIds}
          onToggleChecked={onToggleChecked}
          onToggleExpanded={onToggleExpanded}
        />
      ))}
    </div>
  );
}

// ─── Properties ──────────────────────────────────────────────────────────────

function PropertyRow({
  prop,
  isFavorited,
  onToggleFavorite,
}: {
  prop: ObjectProperty;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      className="group border-b border-[#eef0f1] last:border-b-0 h-8"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="pl-3 pr-2 py-1 text-xs text-[#232729] truncate max-w-[140px]">
        {prop.name}
      </td>
      <td className="pr-2 py-1 text-xs text-[#6a767c] truncate max-w-[140px]">
        {prop.value}
      </td>
      <td className="w-7 pr-2 py-1 text-center">
        <button
          type="button"
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          onClick={onToggleFavorite}
          className={`inline-flex items-center justify-center w-5 h-5 rounded hover:bg-[#eef0f1] transition-colors ${hovered || isFavorited ? 'opacity-100' : 'opacity-0'}`}
          tabIndex={hovered || isFavorited ? 0 : -1}
        >
          <Star
            size={13}
            className={isFavorited ? 'text-[#f5a623] fill-[#f5a623]' : 'text-[#9da7ad]'}
          />
        </button>
      </td>
    </tr>
  );
}

function PropertyGroupCard({
  group,
  favoriteKeys,
  onToggleFavorite,
  searchQuery,
}: {
  group: PropertyGroup;
  favoriteKeys: Set<string>;
  onToggleFavorite: (groupName: string, propName: string) => void;
  searchQuery: string;
}) {
  const [expanded, setExpanded] = useState(true);

  const filteredProps = useMemo(() => {
    if (!searchQuery) return group.properties;
    const q = searchQuery.toLowerCase();
    return group.properties.filter(
      (p) => p.name.toLowerCase().includes(q) || p.value.toLowerCase().includes(q),
    );
  }, [group.properties, searchQuery]);

  if (filteredProps.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-[0_0_4px_rgba(0,0,0,0.12)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full px-3 py-2.5 text-left hover:bg-[#fafbfb] transition-colors"
      >
        {expanded
          ? <ChevronDown size={14} className="text-[#6a767c] shrink-0" />
          : <ChevronRight size={14} className="text-[#6a767c] shrink-0" />}
        <span className="text-[13px] font-semibold text-[#232729] truncate">{group.name}</span>
        <span className="text-[11px] text-[#9da7ad] ml-auto shrink-0">{filteredProps.length}</span>
      </button>
      {expanded && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f4f5f6] border-y border-[#d6dadc]">
              <th className="pl-3 pr-2 py-1.5 text-left text-[11px] font-semibold text-[#6a767c] uppercase tracking-wider">Name</th>
              <th className="pr-2 py-1.5 text-left text-[11px] font-semibold text-[#6a767c] uppercase tracking-wider">Value</th>
              <th className="w-7 pr-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {filteredProps.map((prop) => {
              const favKey = `${group.name}::${prop.name}`;
              return (
                <PropertyRow
                  key={favKey}
                  prop={prop}
                  isFavorited={favoriteKeys.has(favKey)}
                  onToggleFavorite={() => onToggleFavorite(group.name, prop.name)}
                />
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function PropertiesContent({ propertiesTab = 'all-properties' }: { propertiesTab?: PropertiesTabId } = {}) {
  const adapter = useViewerAdapter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<PropertyGroup[]>([]);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = adapter.subscribeSelectedObjects?.((ids) => {
      setSelectedIds(ids.map(String));
    });
    return () => unsub?.();
  }, [adapter]);

  useEffect(() => {
    const expressID = selectedIds[0];
    if (!expressID) {
      setGroups([]);
      return;
    }
    const result = adapter.getObjectProperties?.(expressID) ?? [];
    setGroups(result);
  }, [adapter, selectedIds]);

  const handleToggleFavorite = useCallback((groupName: string, propName: string) => {
    const key = `${groupName}::${propName}`;
    setFavoriteKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const favoritesGroup: PropertyGroup | null = useMemo(() => {
    if (favoriteKeys.size === 0) return null;
    const props: ObjectProperty[] = [];
    for (const g of groups) {
      for (const p of g.properties) {
        if (favoriteKeys.has(`${g.name}::${p.name}`)) {
          props.push(p);
        }
      }
    }
    if (props.length === 0) return null;
    return { name: 'Favorites', properties: props };
  }, [favoriteKeys, groups]);

  if (propertiesTab === 'related-items') {
    return (
      <p className="px-3 py-6 text-sm text-[#9da7ad] text-center">
        No related items available for the selected object.
      </p>
    );
  }

  if (selectedIds.length === 0) {
    return (
      <p className="px-3 py-6 text-sm text-[#9da7ad] text-center">
        Select an element to view its properties.
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="px-3 py-6 text-sm text-[#9da7ad] text-center">
        No properties available for this element.
      </p>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden bg-[#f4f5f6]">
      {/* Search bar — stays fixed above the scrollable area */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white border-b border-[#e5e7eb]">
        <PanelSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search properties"
        />
        <button
          type="button"
          aria-label="Filter properties"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"
        >
          <img src={filterButtonIcon} alt="" width={16} height={16} />
        </button>
      </div>

      {/* Property groups — only this area scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
        {favoritesGroup && (
          <PropertyGroupCard
            group={favoritesGroup}
            favoriteKeys={favoriteKeys}
            onToggleFavorite={handleToggleFavorite}
            searchQuery={searchQuery}
          />
        )}
        {groups.map((g) => (
          <PropertyGroupCard
            key={g.name}
            group={g}
            favoriteKeys={favoriteKeys}
            onToggleFavorite={handleToggleFavorite}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  );
}

export function PropertiesToolbar({ propertiesTab = 'all-properties' }: { propertiesTab?: PropertiesTabId } = {}) {
  if (propertiesTab === 'related-items') {
    return null;
  }
  return null;
}

// ─── Views & Markups ─────────────────────────────────────────────────────────

function ViewsToolbar() {
  const [query, setQuery] = useState('');
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#e5e7eb]">
      <PanelSearchBar value={query} onChange={setQuery} placeholder="Search viewpoints" />
      <button
        type="button"
        aria-label="Filter"
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"
      >
        <img src={filterButtonIcon} alt="" width={16} height={16} />
      </button>
    </div>
  );
}

function ViewFolderRow({
  folder,
  views,
  folders,
  selectedViewId,
  renamingId,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  depth,
  expandedFolders,
  toggleFolder,
  onSelectView,
  onDoubleClickView,
  onContextMenu,
}: {
  folder: ViewFolder;
  views: ViewData[];
  folders: ViewFolder[];
  selectedViewId: string | null;
  renamingId: string | null;
  renameValue: string;
  onRenameChange: (val: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  depth: number;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  onSelectView: (id: string) => void;
  onDoubleClickView: (id: string, currentName: string) => void;
  onContextMenu: (e: React.MouseEvent, viewId: string) => void;
}) {
  const expanded = expandedFolders.has(folder.id);
  const childFolders = folders.filter((f) => f.parentFolderId === folder.id);
  const childViews = views.filter((v) => v.folderId === folder.id);

  return (
    <>
      <div
        data-view-row
        className="flex items-center gap-1 hover:bg-gray-50 cursor-pointer select-none"
        style={{ paddingLeft: 8 + depth * 20, paddingRight: 8, paddingTop: 6, paddingBottom: 6 }}
        onClick={() => toggleFolder(folder.id)}
      >
        <button type="button" className="w-5 h-5 flex items-center justify-center shrink-0 text-gray-500">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <Folder size={16} className="text-gray-400 shrink-0" />
        <span className="text-sm text-gray-700 truncate flex-1 ml-1">{folder.name}</span>
      </div>
      {expanded && (
        <>
          {childFolders.map((cf) => (
            <ViewFolderRow
              key={cf.id}
              folder={cf}
              views={views}
              folders={folders}
              selectedViewId={selectedViewId}
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onSelectView={onSelectView}
              onDoubleClickView={onDoubleClickView}
              onContextMenu={onContextMenu}
            />
          ))}
          {childViews.map((v) => (
            <ViewRow
              key={v.id}
              view={v}
              selected={v.id === selectedViewId}
              depth={depth + 1}
              isRenaming={renamingId === v.id}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
              onSelect={onSelectView}
              onDoubleClick={onDoubleClickView}
              onContextMenu={onContextMenu}
            />
          ))}
        </>
      )}
    </>
  );
}

function ViewRow({
  view,
  selected,
  depth,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: {
  view: ViewData;
  selected: boolean;
  depth: number;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (val: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string, currentName: string) => void;
  onContextMenu: (e: React.MouseEvent, viewId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  if (isRenaming) {
    return (
      <div
        data-view-row
        className="flex items-center gap-1 bg-blue-50"
        style={{ paddingLeft: 28 + depth * 20, paddingRight: 8, paddingTop: 4, paddingBottom: 4 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onRenameCommit(); if (e.key === 'Escape') onRenameCancel(); }}
          onBlur={onRenameCommit}
          className="text-sm flex-1 border border-blue-400 rounded px-1.5 py-0.5 outline-none"
        />
      </div>
    );
  }

  return (
    <div
      data-view-row
      className={`flex items-center gap-1 cursor-pointer select-none ${
        selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
      }`}
      style={{ paddingLeft: 28 + depth * 20, paddingRight: 8, paddingTop: 6, paddingBottom: 6 }}
      onClick={() => onSelect(view.id)}
      onDoubleClick={() => onDoubleClick(view.id, view.name)}
      onContextMenu={(e) => onContextMenu(e, view.id)}
    >
      <span className="text-sm truncate flex-1">{view.name}</span>
      {view.markups.length > 0 && (
        <span className="text-[11px] text-gray-400 shrink-0">{view.markups.length} markup{view.markups.length !== 1 ? 's' : ''}</span>
      )}
      {view.isProjectView && (
        <span className="text-[11px] text-gray-500 border border-gray-300 rounded px-1.5 py-0.5 shrink-0">Project View</span>
      )}
    </div>
  );
}

function ViewsContent() {
  const adapter = useViewerAdapter();
  const [views, setViews] = useState<ViewData[]>([]);
  const [folders, setFolders] = useState<ViewFolder[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; viewId: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = adapter.subscribeViews?.((v, selId) => {
      setViews(v);
      setSelectedViewId(selId);
    });
    setFolders(adapter.getFolders?.() ?? []);
    return () => unsub?.();
  }, [adapter]);

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clickTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSelectView = useCallback((id: string) => {
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      if (id === selectedViewId) {
        adapter.deselectView?.();
      } else {
        adapter.selectView?.(id);
      }
    }, 250);
  }, [adapter, selectedViewId]);

  const handleContextMenu = useCallback((e: React.MouseEvent, viewId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, viewId });
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  const handleEdit = useCallback(() => {
    if (!contextMenu) return;
    const viewId = contextMenu.viewId;
    setContextMenu(null);
    window.dispatchEvent(new CustomEvent('mv:activate-right-tool', { detail: { sourceId: 'mode:markup', viewId } }));
  }, [contextMenu]);

  const handleRename = useCallback(() => {
    if (!contextMenu) return;
    const view = views.find((v) => v.id === contextMenu.viewId);
    setRenamingId(contextMenu.viewId);
    setRenameValue(view?.name ?? '');
    setContextMenu(null);
  }, [contextMenu, views]);

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      adapter.renameView?.(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renamingId, renameValue, adapter]);

  const handleDoubleClick = useCallback((id: string, currentName: string) => {
    clearTimeout(clickTimerRef.current);
    setRenamingId(id);
    setRenameValue(currentName);
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  const handleDelete = useCallback(() => {
    if (!contextMenu) return;
    adapter.deleteView?.(contextMenu.viewId);
    setContextMenu(null);
  }, [contextMenu, adapter]);

  // Separate root-level folders and views (folderId is null)
  const rootFolders = folders.filter((f) => !f.parentFolderId);
  const rootViews = views.filter((v) => !v.folderId);

  const handleBackgroundClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-view-row]') || target.closest('[data-context-menu]')) return;
    if (selectedViewId) adapter.deselectView?.();
  }, [adapter, selectedViewId]);

  return (
    <div className="py-1 relative min-h-full" onClick={handleBackgroundClick}>
      {views.length === 0 && folders.length === 0 && (
        <p className="px-3 py-6 text-sm text-gray-400 text-center">
          No views yet. Enter markup mode to create one.
        </p>
      )}

      {rootFolders.map((folder) => (
        <ViewFolderRow
          key={folder.id}
          folder={folder}
          views={views}
          folders={folders}
          selectedViewId={selectedViewId}
          renamingId={renamingId}
          renameValue={renameValue}
          onRenameChange={setRenameValue}
          onRenameCommit={commitRename}
          onRenameCancel={cancelRename}
          depth={0}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          onSelectView={handleSelectView}
          onDoubleClickView={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
      ))}

      {rootViews.map((view) => (
        <ViewRow
          key={view.id}
          view={view}
          selected={view.id === selectedViewId}
          depth={0}
          isRenaming={renamingId === view.id}
          renameValue={renameValue}
          onRenameChange={setRenameValue}
          onRenameCommit={commitRename}
          onRenameCancel={cancelRename}
          onSelect={handleSelectView}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
      ))}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          data-context-menu
          className="fixed bg-white rounded-lg shadow-[0_4px_12px_0_rgba(0,0,0,0.2)] py-1 z-[300] min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button type="button" onClick={handleEdit} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
            Edit
          </button>
          <button type="button" onClick={handleRename} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
            Rename
          </button>
          <button type="button" onClick={handleDelete} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sheets ──────────────────────────────────────────────────────────────────

function SheetsContent() {
  return (
    <p className="px-3 py-6 text-sm text-gray-400 text-center">
      No sheets loaded.
    </p>
  );
}

// ─── Deviation ───────────────────────────────────────────────────────────────

function DeviationContent() {
  return (
    <p className="px-3 py-6 text-sm text-gray-400 text-center">
      No deviation data available.
    </p>
  );
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const PANEL_REGISTRY: Record<PanelId, { Content: () => JSX.Element; Toolbar?: () => JSX.Element }> = {
  'views':       { Content: ViewsContent, Toolbar: ViewsToolbar },
  'items':       { Content: ItemsContent },
  'sheets':      { Content: SheetsContent },
  'object-tree': { Content: ObjectTreeContent, Toolbar: ObjectTreeToolbar },
  'properties':  { Content: PropertiesContent, Toolbar: PropertiesToolbar },
  'search-sets': { Content: SearchSetsContent },
  'deviation':   { Content: DeviationContent },
};
