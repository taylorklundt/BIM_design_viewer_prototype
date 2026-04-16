import type { RefObject } from 'react';

interface ViewerCanvasProps {
  viewerContainerRef?: RefObject<HTMLDivElement | null>;
}

export function ViewerCanvas({ viewerContainerRef }: ViewerCanvasProps) {
  return (
    <div
      ref={viewerContainerRef}
      className="absolute inset-0 bg-gray-100"
    />
  );
}
