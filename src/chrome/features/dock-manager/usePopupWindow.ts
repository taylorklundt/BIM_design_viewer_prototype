import { useEffect, useRef, useState } from 'react';
import type { PanelId } from './useDockStore';

interface UsePopupWindowOptions {
  panelId: PanelId;
  title: string;
  active: boolean;
  onClose: () => void;
}

function copyStylesToPopup(popup: Window) {
  const mainHead = document.head;
  const popupHead = popup.document.head;

  mainHead.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    if (clone instanceof HTMLLinkElement) {
      const href = clone.getAttribute('href');
      if (href && !href.startsWith('http')) {
        clone.setAttribute('href', new URL(href, window.location.href).href);
      }
    }
    popupHead.appendChild(clone);
  });
}

export function usePopupWindow({ panelId, title, active, onClose }: UsePopupWindowOptions): {
  containerEl: HTMLElement | null;
} {
  const popupRef = useRef<Window | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
      setContainerEl(null);
      return;
    }

    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    const width = 420;
    const height = 600;
    const left = window.screenX + window.outerWidth - width - 40;
    const top = window.screenY + 80;

    const popup = window.open(
      '',
      `detached-panel-${panelId}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`,
    );

    if (!popup) {
      console.warn(`[usePopupWindow] Popup blocked for panel "${panelId}". Falling back.`);
      onCloseRef.current();
      return;
    }

    popupRef.current = popup;

    popup.document.title = title;
    popup.document.body.style.margin = '0';
    popup.document.body.style.padding = '0';
    popup.document.body.style.overflow = 'hidden';
    popup.document.body.style.background = '#ffffff';

    copyStylesToPopup(popup);

    const container = popup.document.createElement('div');
    container.id = 'panel-root';
    container.style.width = '100%';
    container.style.height = '100%';
    popup.document.body.appendChild(container);

    setContainerEl(container);

    const handleUnload = () => {
      popupRef.current = null;
      setContainerEl(null);
      onCloseRef.current();
    };
    popup.addEventListener('beforeunload', handleUnload);

    return () => {
      popup.removeEventListener('beforeunload', handleUnload);
      if (!popup.closed) popup.close();
      popupRef.current = null;
      setContainerEl(null);
    };
  }, [active, panelId, title]);

  return { containerEl };
}
