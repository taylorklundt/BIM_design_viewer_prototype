interface LeftToolbarButtonProps {
  src: string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function LeftToolbarButton({
  src,
  label,
  isActive = false,
  onClick,
}: LeftToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex items-center justify-center rounded p-1.5 transition-colors ${
        isActive
          ? 'bg-blue-50'
          : 'hover:bg-gray-100 active:bg-gray-200'
      }`}
    >
      <img src={src} alt="" width={24} height={24} className="block" />
    </button>
  );
}
