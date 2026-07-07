import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star, Play, Tv } from "lucide-react";
import { Channel, Category } from "../types";

interface RowSliderProps {
  title: string;
  channels: Channel[];
  activeChannelId?: string;
  onSelectChannel: (channel: Channel, category?: Category | "RoarZone" | "All" | "Favorites" | "RecentUpdate") => void;
  favoriteIds: string[];
  onToggleFavorite: (channelId: string, e: any) => void;
  onViewAll?: () => void;
  category?: Category | "RoarZone" | "All" | "Favorites" | "RecentUpdate";
  autoSlide?: boolean;
}

export default function RowSlider({
  title,
  channels,
  activeChannelId,
  onSelectChannel,
  favoriteIds,
  onToggleFavorite,
  onViewAll,
  category,
  autoSlide = false,
}: RowSliderProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Check scroll position to show/hide paddles
  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    const rowEl = rowRef.current;
    if (rowEl) {
      rowEl.addEventListener("scroll", checkScroll);
      // Run once on load/resize
      checkScroll();
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (rowEl) {
        rowEl.removeEventListener("scroll", checkScroll);
      }
      window.removeEventListener("resize", checkScroll);
    };
  }, [channels]);

  // Handle auto-sliding logic
  useEffect(() => {
    if (!autoSlide || channels.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      if (rowRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
        const reachedEnd = scrollLeft + clientWidth >= scrollWidth - 15;
        if (reachedEnd) {
          rowRef.current.scrollTo({
            left: 0,
            behavior: "smooth",
          });
        } else {
          rowRef.current.scrollBy({
            left: 216, // typical card size + space
            behavior: "smooth",
          });
        }
      }
    }, 3800); // Shift every 3.8s for beautiful and rhythmic animation

    return () => clearInterval(interval);
  }, [autoSlide, channels, isHovered]);

  const slide = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (channels.length === 0) return null;

  return (
    <div 
      className="relative group/row my-6 px-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Category Heading with cinematic line */}
      <div className="flex items-center justify-between mb-3.5 px-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-6 bg-[#E50914] rounded-full"></span>
          <h3 className="font-display font-semibold text-base sm:text-lg md:text-xl text-white tracking-wide">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium font-sans text-neutral-550 uppercase tracking-wider hidden sm:inline">
            {channels.length} Streams
          </span>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-bold text-[#E50914] hover:text-white bg-[#E50914]/10 hover:bg-[#E50914] border border-[#E50914]/20 px-3 py-1 rounded-md transition-all duration-300 transform active:scale-95 cursor-pointer"
            >
              View All
            </button>
          )}
        </div>
      </div>

      {/* Row container viewport */}
      <div className="relative">
        {/* Left glass slider paddle */}
        {showLeftArrow && (
          <button
            onClick={() => slide("left")}
            className="absolute left-0 top-0 bottom-0 w-10 md:w-12 bg-black/65 backdrop-blur-md text-white border-r border-white/5 opacity-100 flex items-center justify-center z-20 hover:bg-black/90 hover:text-[#E50914] hover:scale-x-105 active:scale-95 transition-all duration-300 cursor-pointer"
            aria-label="Slide Left"
          >
            <ChevronLeft className="w-6 h-6 md:w-7 md:h-7 stroke-[2.5]" />
          </button>
        )}

        {/* Right glass slider paddle */}
        {showRightArrow && (
          <button
            onClick={() => slide("right")}
            className="absolute right-0 top-0 bottom-0 w-10 md:w-12 bg-black/65 backdrop-blur-md text-white border-l border-white/5 opacity-100 flex items-center justify-center z-20 hover:bg-black/90 hover:text-[#E50914] hover:scale-x-105 active:scale-95 transition-all duration-300 cursor-pointer"
            aria-label="Slide Right"
          >
            <ChevronRight className="w-6 h-6 md:w-7 md:h-7 stroke-[2.5]" />
          </button>
        )}

        {/* Horizontal scroll track */}
        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-3 px-1"
        >
          {channels.map((chan) => {
            const isActive = activeChannelId === chan.id;
            const isFav = favoriteIds.includes(chan.id);

            return (
              <div
                key={chan.id}
                id={`slider-card-${chan.id}`}
                onClick={() => onSelectChannel(chan, category)}
                className={`flex-none w-[170px] sm:w-[200px] bg-zinc-950 border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform select-none hover:scale-105 hover:-translate-y-1 relative group/card shadow-md ${
                  isActive
                    ? "border-[#E50914] bg-red-950/10 ring-1 ring-[#E50914]/40 shadow-lg shadow-[#E50914]/15"
                    : "border-zinc-900/70 hover:border-zinc-800/80 shadow-zinc-950/25"
                }`}
              >
                {/* Visual Cover Header (Logo with sports theme backdrop) */}
                <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center p-3 border-b border-zinc-900 group-hover/card:bg-zinc-900 transition-colors overflow-hidden">
                  {/* Glowing hover ring */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10 opacity-70"></div>
                  
                  {chan.logo ? (
                    <img
                      src={chan.logo}
                      alt={chan.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback = target.nextSibling as HTMLDivElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                      className="max-w-full max-h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] z-10 transition-transform duration-500 group-hover/card:scale-110"
                    />
                  ) : null}

                  {/* Fallback avatar if logo breaks */}
                  <div
                    className="hidden absolute inset-0 bg-zinc-800 text-zinc-300 font-extrabold text-xs items-center justify-center font-sans tracking-wide z-10"
                    style={{ display: chan.logo ? "none" : "flex" }}
                  >
                    {chan.name.slice(0, 3).toUpperCase()}
                  </div>

                  {/* Red Live Hover Play Badge */}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-15">
                    <div className="w-10 h-10 rounded-full bg-[#E50914] flex items-center justify-center text-white shadow-lg shadow-[#E50914]/40 transform scale-75 group-hover/card:scale-100 transition-transform duration-300">
                      <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Dynamic Status Overlay */}
                  {chan.isFootballHDZone && chan.status ? (
                    <span className={`absolute top-2 right-2 flex items-center gap-1 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold uppercase z-20 border ${
                      chan.status.toLowerCase() === "live" 
                        ? "text-red-500 border-red-500/20" 
                        : "text-amber-500 border-amber-500/20"
                    }`}>
                      {chan.status.toLowerCase() === "live" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                      )}
                      {chan.status}
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-red-500 uppercase z-20 border border-red-500/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                      LIVE
                    </span>
                  )}
                </div>

                {/* Sub Metadata info */}
                <div className="p-3">
                  <h4 className="font-sans font-bold text-xs sm:text-sm text-zinc-200 line-clamp-1 transition-colors duration-200 group-hover/card:text-white">
                    {chan.name}
                  </h4>

                  {chan.isFootballHDZone && (chan.teamA || chan.teamB) && (
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-350 font-medium">
                      <span className="truncate max-w-[60px]">{chan.teamA || "Team A"}</span>
                      <span className="text-zinc-600 font-extrabold text-[8px]">VS</span>
                      <span className="truncate max-w-[60px]">{chan.teamB || "Team B"}</span>
                    </div>
                  )}

                  {chan.isFootballHDZone && chan.startTime && (
                    <div className="text-[9px] font-mono text-zinc-400 mt-1 flex items-center gap-1">
                      <span>🕒</span>
                      <span className="truncate max-w-[130px]">{chan.startTime}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] font-sans font-medium text-zinc-500 flex items-center gap-1 uppercase tracking-wider">
                      <Tv className="w-3 h-3 text-[#E50914]" />
                      {chan.isFootballHDZone ? "Football Zone" : "Live TV"}
                    </span>
                    
                    {/* Tiny favorite button */}
                    <button
                      onClick={(e) => onToggleFavorite(chan.id, e)}
                      className={`p-1.5 rounded-md hover:bg-zinc-800 transition-all cursor-pointer ${
                        isFav ? "text-yellow-500" : "text-zinc-600 hover:text-yellow-400"
                      }`}
                      title={isFav ? "Remove from List" : "Add to List"}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? "fill-yellow-500" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
