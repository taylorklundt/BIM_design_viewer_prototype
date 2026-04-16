import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useViewerAdapter } from '../viewer-adapter/ViewerAdapterContext';
import orbitIcon from '../../assets/icons/navigation-wheel/orbit-icon.svg';
import homeIcon from '../../assets/icons/navigation-wheel/home-icon.svg';
import flyIcon from '../../assets/icons/navigation-wheel/fly-icon.svg';
import cursorIcon from '../../assets/icons/navigation-wheel/cursor-icon.svg';
import orbitCursor from '../../assets/cursors/orbit-cursor.svg';
import flyCursor from '../../assets/cursors/fly-cursor.svg';

type WheelActionId = 'home' | 'select' | 'orbit' | 'fly';
type ModeActionId = 'select' | 'orbit' | 'fly';

export function NavigationWheel() {
  const adapter = useViewerAdapter();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<WheelActionId | null>(null);
  const [activeAction, setActiveAction] = useState<ModeActionId>('select');
  const orbitRadius = 84;
  const actions = [
    // Even 40deg spacing on a shared radius (radial arc).
    { id: 'home' as const, icon: homeIcon, label: 'Home', angleDeg: 150 },
    { id: 'select' as const, icon: cursorIcon, label: 'Select', angleDeg: 110 },
    { id: 'fly' as const, icon: flyIcon, label: 'Fly', angleDeg: 70 },
    { id: 'orbit' as const, icon: orbitIcon, label: 'Orbit', angleDeg: 30 },
  ].map((action) => {
    const radians = (action.angleDeg * Math.PI) / 180;
    const offsetX = Math.cos(radians) * orbitRadius;
    const offsetY = -Math.sin(radians) * orbitRadius;
    return {
      ...action,
      orbitX: `${offsetX.toFixed(2)}px`,
      orbitY: `${offsetY.toFixed(2)}px`,
    };
  });
  const activeIcon = actions.find((action) => action.id === activeAction)?.icon ?? orbitIcon;

  useEffect(() => {
    switch (activeAction) {
      case 'orbit':
        adapter.setCursorIcon?.(orbitCursor);
        break;
      case 'fly':
        adapter.setCursorIcon?.(flyCursor);
        break;
      case 'select':
      default:
        // Select mode should always use the normal system cursor.
        adapter.setCursorIcon?.(null);
        break;
    }
  }, [activeAction, adapter]);

  const handleAction = (actionId: WheelActionId) => {
    switch (actionId) {
      case 'home':
        adapter.fitToView();
        break;
      case 'select':
        setActiveAction('select');
        adapter.setInteractionMode?.('select');
        break;
      case 'orbit':
        setActiveAction('orbit');
        adapter.setInteractionMode?.('orbit');
        break;
      case 'fly':
        setActiveAction('fly');
        adapter.setInteractionMode?.('fly');
        break;
    }
  };

  return (
    <div
      className="mv-nav-wheel"
      onMouseLeave={() => {
        setIsOpen(false);
        setHoveredAction(null);
      }}
    >
      {hoveredAction && (
        <div className="mv-nav-wheel-tooltip">
          {actions.find((action) => action.id === hoveredAction)?.label}
        </div>
      )}

      <button
        type="button"
        aria-label="Navigation menu"
        className={`mv-nav-wheel-center ${isOpen ? 'is-open' : ''}`}
        onMouseEnter={() => setIsOpen(true)}
        onFocus={() => setIsOpen(true)}
      >
        <span className="mv-nav-wheel-center-icon">
          <img
            className="mv-nav-wheel-center-icon-image"
            src={activeIcon}
            alt=""
            aria-hidden="true"
          />
        </span>
      </button>

      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          aria-label={action.id}
          onClick={() => handleAction(action.id)}
          onMouseEnter={() => setHoveredAction(action.id)}
          onFocus={() => setHoveredAction(action.id)}
          onBlur={() => setHoveredAction(null)}
          style={
            {
              '--orbit-x': action.orbitX,
              '--orbit-y': action.orbitY,
            } as CSSProperties
          }
          className={`mv-nav-wheel-action mv-nav-wheel-action-${action.id} ${
            action.id === activeAction ? 'is-active' : ''
          } ${
            isOpen ? 'is-open' : ''
          }`}
        >
          <img className="mv-nav-wheel-action-icon" src={action.icon} alt="" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
