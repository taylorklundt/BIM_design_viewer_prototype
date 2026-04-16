export function MiniMap() {
  return (
    <div
      className="absolute bottom-4 right-3 z-20 bg-white overflow-hidden rounded-[8px]"
      style={{
        width: '236px',
        height: '169px',
        outline: '4px solid rgba(255,255,255,0.5)',
        boxShadow: '0px 0px 28px 0px rgba(0,0,0,0.28)',
      }}
    >
      {/* Empty state centered content */}
      <div className="absolute inset-0 flex items-center justify-center px-3">
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-2">
            <p
              style={{
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: '0.15px',
                color: '#232729',
              }}
            >
              Map Sheets to Get Started
            </p>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '0.15px',
                color: '#6A767C',
              }}
            >
              Once mapped, sheets can be used to navigate the model.
            </p>
          </div>
          <button
            type="button"
            className="self-start rounded bg-[#E3E6E8] px-3 py-1.5 text-[14px] font-semibold text-[#232729] hover:bg-[#D6DADC] transition-colors"
            style={{ letterSpacing: '0.15px', lineHeight: '20px' }}
          >
              Start Mapping
          </button>
        </div>
      </div>
    </div>
  );
}
