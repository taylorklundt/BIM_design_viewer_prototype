import { HeaderButton } from './HeaderButton';
import { HeaderSearch } from './HeaderSearch';
import arrowLeftIcon from '../../assets/icons/header/arrow-left.svg';
import arrowRightIcon from '../../assets/icons/header/arrow-right.svg';
import caretDownIcon from '../../assets/icons/header/caret-down.svg';
import settingsIcon from '../../assets/icons/header/settings.svg';
import infoIcon from '../../assets/icons/header/info.svg';
import closeIcon from '../../assets/icons/header/close.svg';
import procoreEmblem from '../../assets/icons/header/procoreEmblem.png';

export function Header({ onUploadClick }: { onUploadClick?: () => void }) {
  return (
    <header className="flex items-center justify-between h-12 pl-1.5 bg-white shadow-[0_2px_6px_0_rgba(0,0,0,0.1)] flex-shrink-0 z-30">
      {/* Left section: Procore logo + nav buttons + project dropdown in a shared pill */}
      <div className="flex items-center gap-0">
        <img src={procoreEmblem} alt="Procore" width={24} height={24} className="flex-shrink-0" style={{ marginLeft: 14, marginRight: 22 }} />
        <div className="flex items-center gap-0.5 bg-[#f6f6f6] rounded overflow-hidden" style={{ marginLeft: 0 }}>
          <div className="flex items-center gap-1 px-1.5">
            <HeaderButton src={arrowLeftIcon} label="Back" variant="secondary" />
            <HeaderButton src={arrowRightIcon} label="Forward" variant="secondary" />
          </div>
          <button
            type="button"
            className="flex items-center justify-between w-[213px] bg-[#f6f6f6] rounded-r p-1.5 h-full hover:bg-gray-200 transition-colors"
          >
            <span className="px-1.5 py-0.5 text-sm font-semibold text-[#232729] tracking-[0.15px]">
              Project Model
            </span>
            <img src={caretDownIcon} alt="" width={24} height={24} className="block flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Center section */}
      <HeaderSearch />

      {/* Right section */}
      <div className="flex items-center gap-3 pr-3">
        <button
          type="button"
          onClick={onUploadClick}
          className="px-3 py-1 text-xs font-semibold text-[#232729] bg-[#E3E6E8] hover:bg-[#D6DADC] rounded transition-colors"
        >
          Upload
        </button>
        <div className="flex items-center gap-1.5">
          <HeaderButton src={settingsIcon} label="Settings" iconSize={24} />
          <HeaderButton src={infoIcon} label="Info" iconSize={24} />
        </div>
        <div className="w-px h-12 bg-[#e3e6e8]" />
        <HeaderButton src={closeIcon} label="Close" iconSize={24} />
      </div>
    </header>
  );
}
