export function ViewCube() {
  return (
    <div className="absolute top-4 right-[76px] z-20">
      <div className="w-20 h-20 flex items-center justify-center select-none">
        {/* Pseudo-3D cube shell using CSS transforms */}
        <div className="relative w-14 h-14" style={{ perspective: '200px' }}>
          <div
            className="absolute inset-0 border-2 border-gray-400 bg-gray-100 rounded-sm flex items-center justify-center"
            style={{
              transform: 'rotateX(-15deg) rotateY(-25deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              Front
            </span>
          </div>
          {/* Axis lines */}
          <div className="absolute -bottom-3 left-1/2 w-px h-3 bg-green-500" />
          <div className="absolute top-1/2 -right-3 h-px w-3 bg-red-500" />
          <div className="absolute -top-3 left-1/2 w-px h-3 bg-blue-500" />
        </div>
      </div>
    </div>
  );
}
