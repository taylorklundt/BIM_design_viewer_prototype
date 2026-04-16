import { useEffect, useState } from 'react';
import caretDownIcon from '../../assets/icons/mode-identifier/caret-down.svg';

type ModeIdentifierMode = 'default' | 'markup' | 'measure' | 'create' | 'sectioning';

interface ModeIdentifierDetail {
  mode: ModeIdentifierMode;
  label: string;
}

export function ModeIdentifierOverlay() {
  const [modeState, setModeState] = useState<ModeIdentifierDetail>({
    mode: 'default',
    label: '',
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const modeDescriptionByMode: Record<ModeIdentifierMode, string> = {
    default: '',
    markup: 'Markup mode lets you annotate the selected saved view with drawing and text tools.',
    measure: 'Measure mode lets you take precise measurements directly on the model.',
    create: 'Create mode lets you add and organize saved views for the current model position.',
    sectioning: 'Sectioning mode lets you cut through the model to inspect interior geometry.',
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ModeIdentifierDetail>).detail;
      if (!detail) return;
      setModeState(detail);
      setIsExpanded(false);
    };

    window.addEventListener('mv:mode-identifier', handler);
    return () => window.removeEventListener('mv:mode-identifier', handler);
  }, []);

  if (modeState.mode === 'default') return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[240] pointer-events-auto">
      <div
        className={`p-1 rounded-[8px] border border-[#3b4044] bg-[#171a1c] text-white shadow-[0px_4px_20px_rgba(0,0,0,0.35)] ${
          isExpanded ? 'min-w-[320px]' : 'h-8'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Mode identifier toggle"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="w-6 h-6 rounded-[6px] bg-[#3E3E3E] hover:bg-[#4A4A4A] transition-colors flex items-center justify-center shrink-0"
          >
            <img
              src={caretDownIcon}
              alt=""
              width={16}
              height={16}
              className={`block transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          <div className="text-[12px] leading-4 font-semibold whitespace-nowrap">
            {modeState.label}
          </div>
        </div>
        {isExpanded && (
          <div className="px-1 pb-1 pt-1 text-[12px] leading-4 text-[#c5c9cd] max-w-[360px]">
            {modeDescriptionByMode[modeState.mode]}
          </div>
        )}
      </div>
    </div>
  );
}
