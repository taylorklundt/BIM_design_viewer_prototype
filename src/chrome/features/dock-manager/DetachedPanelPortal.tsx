import { createPortal } from 'react-dom';
import { usePopupWindow } from './usePopupWindow';
import type { PanelId } from './useDockStore';

interface DetachedPanelPortalProps {
  panelId: PanelId;
  title: string;
  onReattach: (id: PanelId) => void;
  children: React.ReactNode;
}

export function DetachedPanelPortal({
  panelId,
  title,
  onReattach,
  children,
}: DetachedPanelPortalProps) {
  const { containerEl } = usePopupWindow({
    panelId,
    title,
    active: true,
    onClose: () => onReattach(panelId),
  });

  if (!containerEl) return null;

  return createPortal(
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
      }}
    >
      {children}
    </div>,
    containerEl,
  );
}
