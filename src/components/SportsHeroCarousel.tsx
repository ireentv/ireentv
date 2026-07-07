import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Info, Sparkles, Tv } from "lucide-react";
import { Channel } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SportsHeroCarouselProps {
  channels: Channel[];
  onPlayChannel: (channel: Channel) => void;
  onSetSearchTerm: (term: string) => void;
  onSelectCategory: (cat: any) => void;
}

interface Slide {
  id: number;
  title: string;
  banglaTitle: string;
  sportType: string;
  description: string;
  banglaDescription: string;
  image: string;
  badge: string;
  triggerSearch: string; // The search phrase to execute or trigger
  accentColor: string; // Tailwind color e.g., 'red', 'amber', 'emerald'
}

const SPORTS_SLIDES: Slide[] = [
  {
    id: 1,
    title: "ICC Cricket Passion Power Pride",
    banglaTitle: "আইসিসি ক্রিকেট বিশ্বকাপ ও টুর্নামেন্ট সরাসরি",
    sportType: "Cricket 🏏",
    description: "Watch live international cricket matches, including ODI, T20 and Test clashes with pristine HD stream feeds and multiple backup servers for zero buffering.",
    banglaDescription: "বাফারিং ছাড়াই এইচডি কোয়ালিটিতে আইসিসি ওয়ানডে, টি-২০ এবং টেস্ট ক্রিকেট ম্যাচ সরাসরি উপভোগ করুন।",
    image: "/icc_cricket_banner.png",
    badge: "CRICKET DIRECT • LIVE",
    triggerSearch: "willow",
    accentColor: "from-amber-600/80 to-red-600/20"
  },
  {
    id: 2,
    title: "The World's Top Football Leagues",
    banglaTitle: "বিশ্বের শীর্ষ ফুটবল লীগ সরাসরি",
    sportType: "Football ⚽",
    description: "Witness the elite giants of European and global football battle for glory. Stream all matchweeks from Premier League, LaLiga, Serie A, and Champions League.",
    banglaDescription: "ইউরোপীয় ও গ্লোবাল ক্লাবের শ্রেষ্ঠত্বের লড়াই। প্রিমিয়ার লীগ, লা লিগা, ও চ্যাম্পিয়ন্স লীগের প্রতিটি ম্যাচ সরাসরি উপভোগ করুন।",
    image: "/football_leagues_banner.png",
    badge: "ELITE LEAGUES • LIVE",
    triggerSearch: "sony ten 2",
    accentColor: "from-blue-600/80 to-emerald-600/20"
  },
  {
    id: 3,
    title: "FIFA World Cup 2026™ Live",
    banglaTitle: "ফিফা বিশ্বকাপ ২০২৬ লাইভ",
    sportType: "FIFA World Cup 🏆",
    description: "Three Nations, One World, One Trophy! Follow the legendary clashes in USA, Mexico, and Canada live with world-class stream options and supreme server backups.",
    banglaDescription: "তিনটি দেশ, একটি বিশ্ব, একটি ট্রফি! আমেরিকা, মেক্সিকো এবং কানাডার মাঠে বিশ্ব ফুটবলের ঐতিহাসিক লড়াইটি সরাসরি দেখুন।",
    image: "/fifa_world_cup_2026_banner.png",
    badge: "WORLD CUP • COMING SOON",
    triggerSearch: "sports",
    accentColor: "from-emerald-600/85 to-sky-600/20"
  },
  {
    id: 4,
    title: "Wimbledon Championships Tennis Live",
    banglaTitle: "উইম্বলডন টেনিস চ্যাম্পিয়নশিপ সরাসরি",
    sportType: "Tennis 🎾",
    description: "Savor the grass court action of the world's most prestigious Grand Slam tournament live. Trace every legendary rally and matchpoint with smooth pristine stream feeds.",
    banglaDescription: "বিশ্বের সুপরিচিত লন টেনিস গ্র্যান্ড স্ল্যামের প্রতিটি ম্যাচ সরাসরি উপভোগ করুন। কোর্টের প্রতিটি চমৎকার শট ও রুদ্ধশ্বাস ম্যাচপয়েন্ট দেখুন লাইভ স্ট্রিমিংয়ে।",
    image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1600&auto=format&fit=crop",
    badge: "GRAND SLAM • ACTIVE LIVE",
    triggerSearch: "ten",
    accentColor: "from-emerald-600/80 to-sky-600/20"
  },
  {
    id: 5,
    title: "Formula 1 High-Speed Grand Prix Racing",
    banglaTitle: "ফর্মুলা ওয়ান গতির লড়াই লাইভ",
    sportType: "Motorsport 🏎️",
    description: "Unchain the speed! Experience the maximum horsepower wheel-to-wheel race tracking across premium F1 & beIN global broadcasting feeds instantly.",
    banglaDescription: "গতি ও রোমাঞ্চের চূড়ান্ত পর্যায়! বিশ্বের সবচেয়ে দ্রুততম সার্কিট ট্র্যাকগুলোর লাইভ ওভারটেক ও পিটস্টপ ফোর-কে আল্ট্রা ক্লিয়ার কোয়ালিটিতে দেখুন।",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=1600&auto=format&fit=crop",
    badge: "GLOBAL F1 DIRECT • LIVE",
    triggerSearch: "bein",
    accentColor: "from-red-600/80 to-purple-600/20"
  }
];

export default function SportsHeroCarousel({
  channels,
  onPlayChannel,
  onSetSearchTerm,
  onSelectCategory,
}: SportsHeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restart auto play interval
  const startRotation = () => {
    stopRotation();
    autoPlayTimerRef.current = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % SPORTS_SLIDES.length);
    }, 6000); // Transitions every 6 seconds
  };

  const stopRotation = () => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isHovered) {
      startRotation();
    } else {
      stopRotation();
    }
    return () => stopRotation();
  }, [isHovered, currentIndex]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % SPORTS_SLIDES.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + SPORTS_SLIDES.length) % SPORTS_SLIDES.length);
  };

  // Triggers action of banner click
  const handleWatchLive = (slide: Slide) => {
    // 1. We look for a matching channel name/id
    const targetQuery = slide.triggerSearch.toLowerCase();
    const matchedChan = channels.find((c) => 
      c.name.toLowerCase().includes(targetQuery) || 
      c.id.toLowerCase().includes(targetQuery)
    );

    if (matchedChan) {
      onPlayChannel(matchedChan);
    } else {
      // 2. Fallbacks to Premium Sports filter & set search term so user finds it instantly
      onSelectCategory("Premium Sports");
      onSetSearchTerm(slide.triggerSearch);
    }
  };

  const currentSlide = SPORTS_SLIDES[currentIndex];

  return (
    <div 
      onClick={() => handleWatchLive(currentSlide)}
      className="relative w-full h-[360px] sm:h-[420px] md:h-[480px] lg:h-[520px] xl:h-[560px] rounded-3xl overflow-hidden bg-zinc-950 group/carousel border border-zinc-900 shadow-2xl cursor-pointer hover:border-zinc-800 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id="sports-hero-carousel-container"
    >
      {/* Background Image Panel with elegant fade transition */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.3 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={currentSlide.image}
              alt={currentSlide.title}
              className="w-full h-full object-cover object-center scale-102 transition-transform duration-[6000ms] ease-out group-hover/carousel:scale-104"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </AnimatePresence>

        {/* Ambient Overlay Gradients (Netflix Style Dark Immersion) */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-zinc-950/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/50 to-transparent z-10" />
        
        {/* Colorful dynamic accent corner glows */}
        <div className={`absolute bottom-0 left-0 w-[450px] h-[350px] bg-gradient-to-tr ${currentSlide.accentColor} filter blur-[130px] opacity-25 mix-blend-screen pointer-events-none transition-all duration-1000 z-10`} />
      </div>

      {/* Slide Content Layout */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 sm:p-10 md:p-14 lg:p-16 select-none max-w-4xl">
        <div className="space-y-2.5 sm:space-y-4">
          
          {/* Badge & Sport Label Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 bg-[#E50914] text-white text-[8px] sm:text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-red-650/20 active:scale-95 transition-transform">
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white animate-ping"></span>
              {currentSlide.badge}
            </span>
            <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-zinc-350 text-[8.5px] sm:text-[10.5px] font-bold rounded-lg uppercase tracking-wide">
              {currentSlide.sportType}
            </span>
          </div>

          {/* Titles Series (High Typography Pairings) */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="font-display font-black text-lg sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-tight uppercase leading-tight italic line-clamp-2 sm:line-clamp-none">
              {currentSlide.title}
            </h1>
            <h2 className="font-sans font-bold text-sm sm:text-xl md:text-3.5xl text-red-500 tracking-tight leading-relaxed sm:leading-none line-clamp-2 sm:line-clamp-none">
              {currentSlide.banglaTitle}
            </h2>
          </div>

          {/* Descriptions Series (Responsive limits - optimized for mobile spacing and height) */}
          <div className="space-y-1 sm:space-y-1.5 max-w-2xl">
            <p className="text-zinc-350 text-[11px] sm:text-sm md:text-base font-sans leading-relaxed drop-shadow-md line-clamp-2 md:line-clamp-none">
              {currentSlide.description}
            </p>
            <p className="text-zinc-400 text-[10px] sm:text-xs md:text-sm font-sans italic opacity-95 leading-relaxed line-clamp-1 sm:line-clamp-none">
              {currentSlide.banglaDescription}
            </p>
          </div>

          {/* Action Row Controllers */}
          <div className="flex flex-wrap items-center gap-3 pt-1.2 sm:pt-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                onSelectCategory("Premium Sports");
                onSetSearchTerm("");
              }}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-zinc-900/95 hover:bg-zinc-800 text-zinc-250 hover:text-white rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-wider border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer backdrop-blur-md active:scale-97 flex items-center gap-2"
              id={`carousel-all-sports-btn-${currentIndex}`}
            >
              <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-red-550" />
              <span>Sports Directory / সব খেলা</span>
            </button>
          </div>

        </div>
      </div>

      {/* Manual Sliding Left/Right Controls */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer transition-all z-20 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:scale-105 active:scale-95 shadow-2.5xl backdrop-blur-sm"
        title="Previous Slide"
        id="carousel-prev-control"
      >
        <ChevronLeft className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer transition-all z-20 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:scale-105 active:scale-95 shadow-2.5xl backdrop-blur-sm"
        title="Next Slide"
        id="carousel-next-control"
      >
        <ChevronRight className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />
      </button>

      {/* Indicator Circle Progress Rings */}
      <div className="absolute bottom-5 right-6 sm:right-10 md:right-14 z-25 flex items-center gap-2">
        {SPORTS_SLIDES.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => {
              setDirection(idx > currentIndex ? 1 : -1);
              setCurrentIndex(idx);
            }}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              idx === currentIndex 
                ? "w-8 bg-[#E50914] shadow-lg shadow-red-650/40" 
                : "w-2 bg-zinc-650 hover:bg-zinc-400"
            }`}
            title={`Go to Slide ${idx + 1}`}
            id={`carousel-dot-${idx}`}
          />
        ))}
      </div>

    </div>
  );
}
