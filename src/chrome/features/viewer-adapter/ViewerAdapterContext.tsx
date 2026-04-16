import { createContext, useContext } from 'react';
import type { ViewerAdapter } from './types';

const ViewerAdapterContext = createContext<ViewerAdapter | null>(null);

export function ViewerAdapterProvider({
  adapter,
  children,
}: {
  adapter: ViewerAdapter;
  children: React.ReactNode;
}) {
  return (
    <ViewerAdapterContext.Provider value={adapter}>
      {children}
    </ViewerAdapterContext.Provider>
  );
}

export function useViewerAdapter(): ViewerAdapter {
  const ctx = useContext(ViewerAdapterContext);
  if (!ctx) {
    throw new Error('useViewerAdapter must be used within a ViewerAdapterProvider');
  }
  return ctx;
}
