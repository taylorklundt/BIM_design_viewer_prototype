import { useState } from 'react';
import { LeftToolbarButton } from './LeftToolbarButton';
import type { DockStore, PanelId } from '../dock-manager/useDockStore';
import viewsMarkupsIcon from '../../assets/icons/left-toolbar/views-markups.svg';
import itemsIcon from '../../assets/icons/left-toolbar/items.svg';
import sheetsIcon from '../../assets/icons/left-toolbar/sheets.svg';
import objectTreeIcon from '../../assets/icons/left-toolbar/object-tree.svg';
import propertiesIcon from '../../assets/icons/left-toolbar/properties.svg';
import searchSetsIcon from '../../assets/icons/left-toolbar/search-sets.svg';
import deviationIcon from '../../assets/icons/left-toolbar/deviation.svg';

const tools: { src: string; label: string; shortcut: string; panelId: PanelId }[] = [
  { src: viewsMarkupsIcon, label: 'Views',         shortcut: 'Alt V', panelId: 'views' },
  { src: itemsIcon,        label: 'Related Items',  shortcut: 'Alt R', panelId: 'items' },
  { src: sheetsIcon,       label: 'Sheets',         shortcut: 'Alt H', panelId: 'sheets' },
  { src: objectTreeIcon,   label: 'Object Tree',    shortcut: 'Alt O', panelId: 'object-tree' },
  { src: propertiesIcon,   label: 'Properties',     shortcut: 'Alt P', panelId: 'properties' },
  { src: searchSetsIcon,   label: 'Search Sets',    shortcut: 'Alt S', panelId: 'search-sets' },
  { src: deviationIcon,    label: 'Deviation',      shortcut: 'Alt D', panelId: 'deviation' },
];

interface LeftToolbarProps {
  store: DockStore;
  onHoverChange?(hovering: boolean): void;
}

export function LeftToolbar({ store, onHoverChange }: LeftToolbarProps) {
  const [showTooltips, setShowTooltips] = useState(false);
  const openIds = new Set(store.openPanels.map((p) => p.id));

  return (
    <div
      id="left-toolbar"
      className="absolute left-2 top-2 z-50 flex flex-col gap-1 bg-white rounded-lg shadow-[0_0_20px_0_rgba(0,0,0,0.2)] p-1"
      onMouseEnter={() => { setShowTooltips(true); onHoverChange?.(true); }}
      onMouseLeave={() => { setShowTooltips(false); onHoverChange?.(false); }}
    >
      {tools.map((tool) => (
        <LeftToolbarButton
          key={tool.label}
          src={tool.src}
          label={tool.label}
          shortcut={tool.shortcut}
          showTooltip={showTooltips}
          isActive={openIds.has(tool.panelId)}
          onClick={() => store.togglePanel(tool.panelId, tool.label)}
        />
      ))}
    </div>
  );
}
