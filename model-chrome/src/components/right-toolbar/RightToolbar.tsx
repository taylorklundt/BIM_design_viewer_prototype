import { RightToolbarGroup } from './RightToolbarGroup';
import { RightToolbarButton } from './RightToolbarButton';
import orthographicIcon from '../../assets/icons/right-toolbar/orthographic.svg';
import renderModesIcon from '../../assets/icons/right-toolbar/render-modes.svg';
import xRayIcon from '../../assets/icons/right-toolbar/x-ray.svg';
import markupIcon from '../../assets/icons/right-toolbar/markup.svg';
import measureIcon from '../../assets/icons/right-toolbar/measure.svg';
import quickCreateIcon from '../../assets/icons/right-toolbar/quick-create.svg';
import sectioningIcon from '../../assets/icons/right-toolbar/sectioning.svg';
import resetIcon from '../../assets/icons/right-toolbar/reset.svg';
import undoIcon from '../../assets/icons/right-toolbar/undo.svg';
import redoIcon from '../../assets/icons/right-toolbar/redo.svg';

const group1 = [
  { src: orthographicIcon, label: 'Orthographic' },
  { src: renderModesIcon, label: 'Render Modes' },
  { src: xRayIcon, label: 'X-Ray' },
] as const;

const group2 = [
  { src: markupIcon, label: 'Markup' },
  { src: measureIcon, label: 'Measure' },
  { src: quickCreateIcon, label: 'Quick Create' },
  { src: sectioningIcon, label: 'Sectioning' },
] as const;

const group3 = [
  { src: resetIcon, label: 'Reset' },
  { src: undoIcon, label: 'Undo' },
  { src: redoIcon, label: 'Redo' },
] as const;

export function RightToolbar() {
  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
      <RightToolbarGroup>
        {group1.map((tool) => (
          <RightToolbarButton key={tool.label} src={tool.src} label={tool.label} />
        ))}
      </RightToolbarGroup>
      <RightToolbarGroup>
        {group2.map((tool) => (
          <RightToolbarButton key={tool.label} src={tool.src} label={tool.label} />
        ))}
      </RightToolbarGroup>
      <RightToolbarGroup>
        {group3.map((tool) => (
          <RightToolbarButton key={tool.label} src={tool.src} label={tool.label} />
        ))}
      </RightToolbarGroup>
    </div>
  );
}
