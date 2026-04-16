export type SearchCategory =
  | 'object'
  | 'view'
  | 'property'
  | 'item'
  | 'material'
  | 'group'
  | 'tool'
  | 'setting'
  | 'search-set';

export interface SearchEntity {
  id: string;
  type: SearchCategory;
  label: string;
  sublabel: string;
  sourceId: string;
  keywords: string[];
}

export const CATEGORY_LABELS: Record<SearchCategory, string> = {
  'object': 'Object',
  'view': 'View',
  'property': 'Property',
  'item': 'Item',
  'material': 'Material',
  'group': 'Group',
  'tool': 'Tool',
  'setting': 'Setting',
  'search-set': 'Search Set',
};

export const FILTER_OPTIONS: Array<{ value: SearchCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'object', label: 'Objects' },
  { value: 'view', label: 'Views' },
  { value: 'property', label: 'Property' },
  { value: 'item', label: 'Items' },
  { value: 'material', label: 'Materials' },
  { value: 'group', label: 'Groups' },
  { value: 'tool', label: 'Tools' },
  { value: 'setting', label: 'Settings' },
  { value: 'search-set', label: 'Search Sets' },
];
