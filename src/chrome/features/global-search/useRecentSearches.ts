import { useState, useCallback } from 'react';
import type { SearchEntity } from './types';

const MAX_RECENT = 20;

export function useRecentSearches() {
  const [recents, setRecents] = useState<SearchEntity[]>([]);

  const addRecent = useCallback((entity: SearchEntity) => {
    setRecents(prev => {
      const deduped = prev.filter(e => e.id !== entity.id);
      return [entity, ...deduped].slice(0, MAX_RECENT);
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
  }, []);

  return { recents, addRecent, clearRecents };
}
