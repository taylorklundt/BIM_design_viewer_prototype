import { useCallback, useEffect } from 'react';
import searchIcon from '../../assets/icons/header/search.svg';

export function HeaderSearch() {
  const handleClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent('mv:toggle-global-search'));
  }, []);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('mv:toggle-global-search'));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      id="header-search-bar"
      className="flex items-center bg-[#eef0f1] hover:bg-[#d6dadc] transition-colors rounded h-9 w-[248px] pl-3 pr-2 py-1.5 gap-2 cursor-pointer"
      onClick={handleClick}
    >
      <span className="text-sm text-[#6a767c] tracking-[0.15px] flex-1 min-w-0 select-none">
        Search
      </span>
      <div className="flex items-center justify-center p-1 rounded flex-shrink-0">
        <img src={searchIcon} alt="" width={24} height={24} className="block" />
      </div>
    </div>
  );
}
