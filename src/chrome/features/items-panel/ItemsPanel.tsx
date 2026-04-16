import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Binoculars,
  ClipboardList,
  FileQuestion,
  Home,
  ListChecks,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

const ITEMS = [
  { label: 'Assets', Icon: Home },
  { label: 'Coordination Issues', Icon: AlertTriangle },
  { label: 'Punch List', Icon: Wrench },
  { label: 'Quality Inspections', Icon: ClipboardList },
  { label: 'Quality Observation', Icon: Binoculars },
  { label: 'RFIs', Icon: FileQuestion },
  { label: 'Safety Inspections', Icon: ShieldCheck },
  { label: 'Safety Observation', Icon: Binoculars },
  { label: 'Submittals', Icon: ListChecks },
] as const;

interface ItemsPanelProps {
  isOpen?: boolean;
  onRequestClose?: () => void;
}

export function ItemsPanel({ isOpen: controlledOpen, onRequestClose }: ItemsPanelProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof controlledOpen === 'boolean';
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const close = () => {
    if (isControlled) {
      onRequestClose?.();
      return;
    }
    setInternalOpen(false);
  };

  useEffect(() => {
    if (isControlled) return;
    const handler = () => setInternalOpen((prev) => !prev);
    window.addEventListener('mv:toggle-items', handler);
    return () => window.removeEventListener('mv:toggle-items', handler);
  }, [isControlled]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute left-12 top-16 z-50 w-[430px] max-w-[min(430px,calc(100vw-16px))] overflow-hidden rounded-xl border border-[#d5d7da] bg-[#f3f4f6] shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
      style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className="flex items-center justify-between border-b border-[#d9dcdf] bg-[#f4f5f6] px-3 py-2">
        <span className="text-sm font-semibold text-gray-700">
          Items
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-lg leading-none text-gray-500 hover:text-gray-700"
            aria-label="Minimize items panel"
          >
            −
          </button>
          <button
            type="button"
            onClick={close}
            className="text-lg leading-none text-gray-500 hover:text-gray-700"
            aria-label="Close items panel"
          >
            ×
          </button>
        </div>
      </div>

      <ul className="px-4 py-3">
        {ITEMS.map(({ label, Icon }) => (
          <li key={label}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2 py-[11px] text-left transition-colors hover:bg-[#e9ecef] active:bg-[#dfe3e7]"
            >
              <span className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <Icon size={16} strokeWidth={2} className="text-gray-700" />
                {label}
              </span>
              <span className="pr-1 text-xl leading-none text-gray-700">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
