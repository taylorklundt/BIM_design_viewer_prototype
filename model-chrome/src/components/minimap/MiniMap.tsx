import { Navigation } from 'lucide-react';

export function MiniMap() {
  return (
    <div className="absolute bottom-4 right-3 z-20 w-44 h-32 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Placeholder thumbnail area */}
      <div className="w-full h-full bg-gray-50 flex items-center justify-center relative">
        {/* Simulated floor plan lines */}
        <div className="absolute inset-2 border border-gray-200 rounded-sm">
          <div className="absolute top-2 left-2 w-8 h-12 border border-gray-300 rounded-sm bg-gray-100" />
          <div className="absolute top-2 left-12 w-10 h-8 border border-gray-300 rounded-sm bg-gray-100" />
          <div className="absolute bottom-2 left-2 w-16 h-6 border border-gray-300 rounded-sm bg-gray-100" />
          <div className="absolute bottom-2 right-2 w-6 h-10 border border-gray-300 rounded-sm bg-gray-100" />
        </div>
        {/* Viewport indicator */}
        <div className="absolute bottom-5 right-8">
          <Navigation size={12} className="text-blue-500 fill-blue-500" />
        </div>
      </div>
    </div>
  );
}
