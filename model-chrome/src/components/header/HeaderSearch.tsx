import searchIcon from '../../assets/icons/header/search.svg';

export function HeaderSearch() {
  return (
    <div className="flex items-center bg-[#eef0f1] rounded h-9 w-[248px] pl-3 pr-2 py-1.5 gap-2">
      <input
        type="text"
        placeholder="Search"
        className="bg-transparent outline-none text-sm text-[#232729] placeholder-[#6a767c] tracking-[0.15px] flex-1 min-w-0"
      />
      <div className="flex items-center justify-center p-1 rounded flex-shrink-0">
        <img src={searchIcon} alt="" width={24} height={24} className="block" />
      </div>
    </div>
  );
}
