import { useEffect, useState } from 'react';
import { useViewerAdapter } from '../viewer-adapter/ViewerAdapterContext';
import type { SearchSet } from '../viewer-adapter/types';

export function SearchSetsPanel() {
  const adapter = useViewerAdapter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchSets, setSearchSets] = useState<SearchSet[]>([]);

  useEffect(() => {
    const handler = () => {
      setIsOpen((prev) => {
        const nextOpen = !prev;
        if (nextOpen) {
          setSearchSets(adapter.getSearchSets?.() ?? []);
        }
        return nextOpen;
      });
    };
    window.addEventListener('mv:toggle-search-sets', handler);
    return () => window.removeEventListener('mv:toggle-search-sets', handler);
  }, [adapter]);

  const handleRun = (id: string) => {
    adapter.executeSearchSet?.(id);
  };

  const handleDelete = (id: string) => {
    adapter.deleteSearchSet?.(id);
    setSearchSets((prev) => prev.filter((s) => s.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="absolute left-16 top-4 z-50 w-72 bg-white rounded-lg shadow-[0_0_20px_0_rgba(0,0,0,0.2)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">Search Sets</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {searchSets.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-400 text-center">No saved searches</p>
        ) : (
          <ul>
            {searchSets.map((set) => (
              <li
                key={set.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
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
        )}
      </div>
    </div>
  );
}
