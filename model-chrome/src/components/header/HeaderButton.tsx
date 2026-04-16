interface HeaderButtonProps {
  src: string;
  label: string;
  variant?: 'secondary' | 'tertiary';
  iconSize?: number;
  onClick?: () => void;
}

export function HeaderButton({
  src,
  label,
  variant = 'tertiary',
  iconSize = 16,
  onClick,
}: HeaderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex items-center justify-center rounded p-1 transition-colors ${
        variant === 'secondary'
          ? 'bg-[#d6dadc] hover:bg-[#c8cdd0] active:bg-[#bcc1c5]'
          : 'hover:bg-gray-200 active:bg-gray-300'
      }`}
    >
      <img src={src} alt="" width={iconSize} height={iconSize} className="block" />
    </button>
  );
}
