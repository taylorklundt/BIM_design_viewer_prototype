import { LeftToolbarButton } from './LeftToolbarButton';
import viewsMarkupsIcon from '../../assets/icons/left-toolbar/views-markups.svg';
import itemsIcon from '../../assets/icons/left-toolbar/items.svg';
import objectTreeIcon from '../../assets/icons/left-toolbar/object-tree.svg';
import propertiesIcon from '../../assets/icons/left-toolbar/properties.svg';
import searchSetsIcon from '../../assets/icons/left-toolbar/search-sets.svg';
import deviationIcon from '../../assets/icons/left-toolbar/deviation.svg';

const tools = [
  { src: viewsMarkupsIcon, label: 'Views and Markups' },
  { src: itemsIcon, label: 'Items' },
  { src: objectTreeIcon, label: 'Object Tree' },
  { src: propertiesIcon, label: 'Properties' },
  { src: searchSetsIcon, label: 'Search Sets' },
  { src: deviationIcon, label: 'Deviation' },
] as const;

export function LeftToolbar() {
  return (
    <div id="left-toolbar" className="absolute left-4 top-4 z-20 flex flex-col gap-1 bg-white rounded-lg shadow-[0_0_20px_0_rgba(0,0,0,0.2)] p-1">
      {tools.map((tool) => (
        <LeftToolbarButton key={tool.label} src={tool.src} label={tool.label} />
      ))}
    </div>
  );
}
