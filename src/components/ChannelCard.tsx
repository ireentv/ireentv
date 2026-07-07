import { Star } from "lucide-react";
import { Channel } from "../types";

interface ChannelCardProps {
  key?: string | number;
  channel: Channel;
  isActive: boolean;
  onSelect: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: any) => void;
}

export default function ChannelCard({
  channel,
  isActive,
  onSelect,
  isFavorite,
  onToggleFavorite,
}: ChannelCardProps) {
  return (
    <div
      id={`channel-card-${channel.id}`}
      onClick={onSelect}
      className={`relative group flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-300 transform select-none ${
        isActive
          ? "bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/5 hover:-translate-y-0.5"
          : "bg-[#161b22] border-slate-800/80 hover:border-blue-500/50 hover:bg-[#1c232f] hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Channel Logo Frame */}
        <div className="relative w-11 h-11 bg-slate-950 rounded-lg p-1.5 flex items-center justify-center shrink-0 border border-slate-800 group-hover:border-slate-700 overflow-hidden">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                // If logo fails to load, replace with clean text block fallback
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.nextSibling as HTMLDivElement;
                if (fallback) fallback.style.display = "flex";
              }}
              className="max-w-full max-h-full object-contain filter drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
            />
          ) : null}
          <div
            className="hidden absolute inset-0 bg-slate-800 text-slate-300 font-bold text-xs items-center justify-center font-sans tracking-wide"
            style={{ display: channel.logo ? "none" : "flex" }}
          >
            {channel.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Channel Title & Stream Label */}
        <div className="min-w-0 flex-1">
          <h4
            className={`font-sans font-semibold text-sm truncate transition-colors ${
              isActive ? "text-blue-400 font-bold" : "text-slate-200 group-hover:text-blue-400"
            }`}
          >
            {channel.name}
          </h4>

          {channel.isFootballHDZone && (channel.teamA || channel.teamB) && (
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
              {channel.teamAFlag && (
                <img 
                  src={channel.teamAFlag} 
                  alt="" 
                  className="w-4 h-4 object-contain rounded-sm bg-black/10" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => { (e.target as any).style.display = "none"; }}
                />
              )}
              <span className="truncate max-w-[80px] font-medium">{channel.teamA || "Team A"}</span>
              <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wider">VS</span>
              {channel.teamBFlag && (
                <img 
                  src={channel.teamBFlag} 
                  alt="" 
                  className="w-4 h-4 object-contain rounded-sm bg-black/10" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => { (e.target as any).style.display = "none"; }}
                />
              )}
              <span className="truncate max-w-[80px] font-medium">{channel.teamB || "Team B"}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" : "bg-slate-600"}`}></span>
            
            {channel.isFootballHDZone && channel.status ? (
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                channel.status.toLowerCase() === "live" 
                  ? "bg-red-500/25 text-red-400 border border-red-500/30" 
                  : "bg-amber-500/25 text-amber-400 border border-amber-500/30"
              }`}>
                {channel.status}
              </span>
            ) : (
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                {isActive ? "হালনাগাদ লাইভ" : "অনলাইন"}
              </span>
            )}

            {channel.isFootballHDZone && channel.startTime && (
              <span className="text-[9px] font-mono text-zinc-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800/40 truncate max-w-[140px]">
                🕒 {channel.startTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Favorite Ribbon Star */}
      <button
        onClick={onToggleFavorite}
        className={`p-2 rounded-lg transition-all border shrink-0 ${
          isFavorite
            ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20 hover:scale-110"
            : "text-slate-500 bg-transparent border-transparent hover:text-yellow-400 hover:bg-slate-800 hover:border-slate-700 hover:scale-110"
        }`}
        title={isFavorite ? "ফেভারিট থেকে সরান" : "ফেভারিটে যোগ করুন"}
      >
        <Star className={`w-4 h-4 ${isFavorite ? "fill-yellow-400" : ""}`} />
      </button>
    </div>
  );
}
