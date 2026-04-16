import type { ReactNode } from 'react';

interface RightToolbarGroupProps {
  children: ReactNode;
}

export function RightToolbarGroup({ children }: RightToolbarGroupProps) {
  return (
    <div className="flex flex-col gap-1 bg-white rounded-lg shadow-[0_0_4px_0_rgba(0,0,0,0.25)] p-1">
      {children}
    </div>
  );
}
