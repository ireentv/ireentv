import { RefreshCw, Download, Settings } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  onDownloadApp: () => void;
  onOpenSettings: () => void;
}

export default function Header({ onRefresh, isRefreshing, onDownloadApp, onOpenSettings }: HeaderProps) {
  return (
    <header className="bg-[#050505] px-[20px] sm:px-[30px] py-[15px] border-b border-[#1a1a1a] shadow-[0_4px_15px_rgba(0,0,0,0.9)] sticky top-0 z-50 flex justify-between items-center gap-4">
      <h1 className="rgb-text text-[20px] sm:text-[26px] font-black uppercase tracking-[2px] select-none">
        IreenTV
      </h1>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onDownloadApp}
          className="bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/40 px-[12px] sm:px-[18px] py-[8px] rounded-[6px] text-xs sm:text-[15px] font-bold cursor-pointer outline-none flex items-center gap-1.5 sm:gap-2 hover:bg-[#00ffcc] hover:text-black hover:border-white hover:shadow-[0_0_15px_#00ffcc] hover:scale-105 active:scale-95 select-none transition-all duration-300"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Download App
        </button>
        <button
          onClick={onOpenSettings}
          className="bg-[#111] text-white border border-[#333] px-[12px] sm:px-[18px] py-[8px] rounded-[6px] text-xs sm:text-[15px] font-bold cursor-pointer outline-none flex items-center gap-1.5 sm:gap-2 hover:bg-[#00ffcc] hover:text-black hover:border-white hover:shadow-[0_0_15px_#00ffcc] hover:scale-105 active:scale-95 select-none transition-all duration-300"
          aria-label="Settings"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Settings
        </button>
        <button
          id="refresh-btn"
          onClick={onRefresh}
          tabIndex={0}
          aria-label="Refresh channels list"
          className="bg-[#111] text-white border border-[#333] px-[12px] sm:px-[18px] py-[8px] rounded-[6px] text-xs sm:text-[15px] font-bold cursor-pointer outline-none flex items-center gap-1.5 sm:gap-2 hover:bg-[#00ffcc] hover:text-black hover:border-white hover:shadow-[0_0_15px_#00ffcc] hover:scale-105 focus:bg-[#00ffcc] focus:text-black focus:border-white focus:shadow-[0_0_15px_#00ffcc] focus:scale-105 active:scale-95 select-none transition-all duration-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </header>
  );
}
