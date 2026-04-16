import { ToolbarButton, type ToolbarButtonProps } from '../../shared/ToolbarButton';

type RightToolbarButtonProps = Omit<ToolbarButtonProps, 'tooltipSide'>;

export function RightToolbarButton(props: RightToolbarButtonProps) {
  return <ToolbarButton {...props} tooltipSide="left" />;
}
