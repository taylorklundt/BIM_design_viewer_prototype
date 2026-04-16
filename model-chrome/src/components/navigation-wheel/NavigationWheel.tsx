import { Compass } from 'lucide-react';

export function NavigationWheel() {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
      <button
        type="button"
        aria-label="Navigation control"
        className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg flex items-center justify-center transition-colors"
      >
        <Compass size={20} />
      </button>
    </div>
  );
}
