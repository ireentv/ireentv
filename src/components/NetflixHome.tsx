import { useState, useRef } from 'react';
import { Channel, CategoryType } from '../types';
import { filterChannels } from '../utils';
import { Play, ChevronLeft, ChevronRight, ArrowRight, Flame, Tv, Film, Music, Smile, Globe, Sparkles } from 'lucide-react';

interface NetflixHomeProps {
  allChannels: Channel[];
  onSelectChannel: (channel: Channel) => void;
  onSelectCategory: (category: CategoryType) => void;
}

// Map categories to icons, titles and colors
const CATEGORY_CONFIG: Array<{
  id: CategoryType;
  title: string;
  icon: any;
  badge: string;
  gradient: string;
}> = [
  {
    id: 'Sports',
    title: 'স্পোর্টস হাইলাইটস (Live Sports)',
    icon: Flame,
    badge: 'LIVE MATCHES',
    gradient: 'from-red-600/30 to-amber-600/10',
  },
  {
    id: 'Bangla',
    title: 'বাংলা পপুলার চ্যানেল (Bangla TV)',
    icon: Tv,
    badge: 'TOP BANGLA',
    gradient: 'from-emerald-600/30 to-teal-600/10',
  },
  {
    id: 'Entertainment',
    title: 'এন্টারটেইনমেন্ট চ্যানেল (Entertainment)',
    icon: Sparkles,
    badge: 'DRAMA & SHOWS',
    gradient: 'from-purple-600/30 to-pink-600/10',
  },
  {
    id: 'Movie',
    title: 'মুভি ও সিনেমা কেবিন (Movies)',
    icon: Film,
    badge: 'BLOCKBUSTER',
    gradient: 'from-blue-600/30 to-indigo-600/10',
  },
  {
    id: 'Hindi',
    title: 'হিন্দি পপুলার শো (Hindi TV)',
    icon: Tv,
    badge: 'DESI ENTERTAINMENT',
    gradient: 'from-yellow-600/30 to-orange-600/10',
  },
  {
    id: 'Music',
    title: 'মিউজিক ও গান (Music Hits)',
    icon: Music,
    badge: '24/7 MUSIC',
    gradient: 'from-pink-600/30 to-rose-600/10',
  },
  {
    id: 'Kids',
    title: 'কার্টুন ও কিডস (Kids & Toons)',
    icon: Smile,
    badge: 'CARTOONS',
    gradient: 'from-cyan-600/30 to-sky-600/10',
  },
  {
    id: 'Documentary',
    title: 'ডকুমেন্টারি ও তথ্য (Documentary)',
    icon: Globe,
    badge: 'EXPLORE',
    gradient: 'from-lime-600/30 to-green-600/10',
  },
];

export default function NetflixHome({
  allChannels,
  onSelectChannel,
  onSelectCategory,
}: NetflixHomeProps) {
  // Find top featured channel for Hero banner
  const featuredCandidates = allChannels.filter((c) =>
    ['t sports', 'sony', 'tapmad', 'jamuna', 'star jalsha', 'zee', 'colors', 'gazi', 'somoy'].some((keyword) =>
      c.name.toLowerCase().includes(keyword)
    )
  );

  const featuredList = featuredCandidates.length > 0 ? featuredCandidates.slice(0, 6) : allChannels.slice(0, 6);
  const [heroIndex, setHeroIndex] = useState(0);

  const currentHero = featuredList[heroIndex] || allChannels[0];

  return (
    <div className="w-full flex flex-col gap-10 pb-12 animate-fade-in">
      {/* 🎬 NETFLIX-STYLE HERO BANNER */}
      {currentHero && (
        <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden border border-[#222] bg-gradient-to-r from-black via-[#0a0a0f] to-[#141420] shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
          {/* Subtle Ambient Background Lighting & Effects */}
          <div className="absolute inset-0 bg-radial from-[#00ffcc]/10 via-transparent to-black/80 pointer-events-none" />
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-gradient-to-br from-[#00ffcc]/15 to-red-600/20 rounded-full blur-3xl opacity-60 pointer-events-none animate-pulse" />

          {/* Banner Content Container */}
          <div className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl flex flex-col gap-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-widest bg-red-600 text-white uppercase shadow-[0_0_12px_rgba(220,38,38,0.6)]">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  FEATURED LIVE
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#1a1a1a] text-[#00ffcc] border border-[#00ffcc]/30">
                  {currentHero.category || 'Live TV'}
                </span>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-white/10 text-gray-300 border border-white/10">
                  HD 1080p
                </span>
              </div>

              {/* Title & Slogan */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-md">
                {currentHero.name}
              </h1>

              <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
                সম্পূর্ণ ফ্রিতে এবং কোনো ঝামেলা ছাড়াই সরাসরি দেখুন <span className="text-[#00ffcc] font-bold">{currentHero.name}</span>। ফুল এইচডি কোয়ালিটিতে স্মুথ লাইভ স্ট্রিম উপভোগ করুন!
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <button
                  onClick={() => onSelectChannel(currentHero)}
                  className="px-6 sm:px-8 py-3.5 rounded-xl bg-[#00ffcc] text-black font-extrabold text-base md:text-lg flex items-center gap-3 cursor-pointer hover:bg-white hover:shadow-[0_0_25px_#00ffcc] active:scale-95 transition-all duration-300 shadow-lg"
                >
                  <Play className="w-6 h-6 fill-black" />
                  <span>এখনই দেখুন (Play Now)</span>
                </button>

                <button
                  onClick={() => onSelectCategory((currentHero.category as CategoryType) || 'All')}
                  className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm md:text-base border border-white/15 flex items-center gap-2 cursor-pointer transition-all duration-300"
                >
                  <span>ক্যাটাগরি ব্রাউজ করুন</span>
                  <ArrowRight className="w-4 h-4 text-[#00ffcc]" />
                </button>
              </div>
            </div>

            {/* Right Side: Featured Channel Logo Card & Quick Switcher */}
            <div className="w-full lg:w-auto flex flex-col items-center lg:items-end gap-4 shrink-0">
              {/* Main Preview Logo Box */}
              <div
                onClick={() => onSelectChannel(currentHero)}
                className="group relative w-full sm:w-72 lg:w-80 h-44 sm:h-48 rounded-2xl bg-black/80 border-2 border-[#00ffcc]/40 p-4 flex items-center justify-center overflow-hidden cursor-pointer shadow-[0_0_20px_rgba(0,255,204,0.15)] hover:border-[#00ffcc] hover:shadow-[0_0_30px_rgba(0,255,204,0.3)] transition-all duration-300"
              >
                {currentHero.logo ? (
                  <img
                    src={currentHero.logo}
                    alt={currentHero.name}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain object-center group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-2xl font-black text-gray-400">
                    {currentHero.name}
                  </span>
                )}
                {/* Hover Play Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                  <div className="w-14 h-14 rounded-full bg-[#00ffcc] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 fill-black text-black ml-1" />
                  </div>
                </div>
              </div>

              {/* Quick Hero Switcher Thumbnails */}
              {featuredList.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
                  <span className="text-xs font-bold text-gray-400 mr-1 hidden sm:inline">টপ হাইলাইটস:</span>
                  {featuredList.map((ch, idx) => (
                    <button
                      key={ch.name + idx}
                      onClick={() => setHeroIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                        idx === heroIndex
                          ? 'bg-[#00ffcc] text-black border-[#00ffcc] shadow-[0_0_10px_#00ffcc]'
                          : 'bg-black/60 text-gray-300 border-[#333] hover:border-gray-500'
                      }`}
                    >
                      {ch.name.length > 14 ? ch.name.substring(0, 14) + '...' : ch.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📺 HIGHLIGHT CATEGORY ROWS (হিরো সেকশনের নিচে সবগুলো ক্যাটাগরির চ্যানেলগুলো হাইলাইট) */}
      <div className="flex flex-col gap-10">
        {CATEGORY_CONFIG.map((cfg) => {
          const categoryChannels = filterChannels(allChannels, cfg.id);
          if (categoryChannels.length === 0) return null;

          return (
            <CategoryRow
              key={cfg.id}
              config={cfg}
              channels={categoryChannels}
              onSelectChannel={onSelectChannel}
              onSelectCategory={onSelectCategory}
            />
          );
        })}
      </div>
    </div>
  );
}

// Single Category Row Component with Horizontal Scroll & Netflix Styling
function CategoryRow({
  config,
  channels,
  onSelectChannel,
  onSelectCategory,
}: {
  config: (typeof CATEGORY_CONFIG)[0];
  channels: Channel[];
  onSelectChannel: (channel: Channel) => void;
  onSelectCategory: (category: CategoryType) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const IconComponent = config.icon;

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 group relative">
      {/* Category Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#111] border border-[#222] text-[#00ffcc]">
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>{config.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300 font-mono font-medium">
                {channels.length}
              </span>
            </h2>
          </div>
        </div>

        {/* View All Button */}
        <button
          onClick={() => onSelectCategory(config.id)}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#00ffcc] hover:text-white transition-colors cursor-pointer group/btn"
        >
          <span>সবগুলো চ্যানেল দেখুন</span>
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Horizontal Scroll Area with Arrow Buttons */}
      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-r-xl bg-black/80 text-white border border-l-0 border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#00ffcc] hover:text-black transition-all duration-300 cursor-pointer shadow-lg"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Channel Row Container */}
        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto scrollbar-none py-2 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {channels.slice(0, 20).map((channel, idx) => (
            <div
              key={channel.name + idx}
              onClick={() => onSelectChannel(channel)}
              className="flex-none w-44 sm:w-52 md:w-56 group/card relative rounded-xl bg-[#0a0a0a] border border-[#1d1d1d] hover:border-[#00ffcc] hover:shadow-[0_0_15px_rgba(0,255,204,0.3)] transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
            >
              {/* Logo / Thumbnail Box */}
              <div className="w-full h-28 sm:h-32 bg-black/90 p-3 flex items-center justify-center relative overflow-hidden">
                <ChannelLogoDisplay logo={channel.logo} name={channel.name} />

                {/* Live Badge */}
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[10px] font-black tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>

                {/* Hover Play Icon Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 flex items-center justify-center transition-opacity duration-300">
                  <div className="w-11 h-11 rounded-full bg-[#00ffcc] flex items-center justify-center shadow-lg group-hover/card:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Title & Info */}
              <div className="p-3 bg-[#0d0d0d] border-t border-[#1a1a1a] flex flex-col gap-1">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover/card:text-[#00ffcc] transition-colors">
                  {channel.name}
                </h3>
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
                  <span className="truncate">{channel.category || 'Live TV'}</span>
                  <span className="text-[#00ffcc] font-bold">PLAY</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-l-xl bg-black/80 text-white border border-r-0 border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#00ffcc] hover:text-black transition-all duration-300 cursor-pointer shadow-lg"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

function ChannelLogoDisplay({ logo, name }: { logo?: string; name: string }) {
  const [hasError, setHasError] = useState(false);

  if (!logo || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#111] rounded text-center px-2">
        <span className="text-xs font-black text-gray-400 tracking-wider">
          {name}
        </span>
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={name}
      referrerPolicy="no-referrer"
      className="max-h-full max-w-full object-contain object-center group-hover/card:scale-105 transition-transform duration-300"
      onError={() => setHasError(true)}
    />
  );
}
