import { useEffect, useState } from 'react';
import { Channel, CategoryType } from './types';
import {
  fetchAndParseM3U,
  normalizeChannelName,
  filterChannels,
  PRIORITY_URL_1,
  PRIORITY_URL_2,
  DEFAULT_URL,
  TOFFEE_URL,
} from './utils';

import SplashScreen from './components/SplashScreen.tsx';
import Header from './components/Header.tsx';
import CategoryBar from './components/CategoryBar.tsx';
import ChannelCard from './components/ChannelCard.tsx';
import PlayerOverlay from './components/PlayerOverlay.tsx';
import DownloadModal from './components/DownloadModal.tsx';

function SuggestedChannelLogo({ logo, name }: { logo?: string; name: string }) {
  const [hasError, setHasError] = useState(false);

  if (!logo || hasError) {
    return (
      <span className="text-xs text-gray-400 font-black tracking-widest select-none">
        {name.substring(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={logo}
      alt={name}
      referrerPolicy="no-referrer"
      className="w-full h-full object-contain object-center scale-95 group-hover:scale-105 transition-transform duration-300"
      onError={() => setHasError(true)}
    />
  );
}

export default function App() {
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('All');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // TV remote control index focus
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Method to fetch all streams in parallel, consolidate duplicate names as redundant servers
  const loadChannels = async (isRef = false) => {
    if (isRef) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorText(null);

    try {
      const [sonyLiv, tapmad, toffee, toffeeChannelsRes] = await Promise.all([
        fetchAndParseM3U(PRIORITY_URL_1),
        fetchAndParseM3U(PRIORITY_URL_2),
        fetchAndParseM3U(TOFFEE_URL),
        fetch(`${DEFAULT_URL}?t=${new Date().getTime()}`).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      const toffeeChannels = toffeeChannelsRes?.channels || [];

      // Find first valid Toffee channel with headers in the new playlist to use as a fallback cookie source
      const firstValidToffeeChan = toffeeChannels.find(
        (tfChan: any) => tfChan && tfChan.headers && tfChan.headers.cookie
      );

      // 1. Process Toffee channels from the JSON data, decorate them with dynamic cookies & headers
      const decoratedToffeeChannels = toffeeChannels.map((tfChan: any) => {
        const headers = tfChan.headers || {};
        const cookieVal = headers.cookie || firstValidToffeeChan?.headers?.cookie || "Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9ibGRjbXByb2QtY2RuLnRvZmZlZWxpdmUuY29t:Expires=1784556037:KeyName=prod_linear:Signature=tLV5BaXSJ2NZ_UvE1OpmioDaOEyP5pdUw_z5VpRxxxorOl21DjTzipdqes82hjp6mx0i9lcIY8PTpPioeirhDg";
        const uaVal = headers["user-agent"] || headers.User_Agent || firstValidToffeeChan?.headers?.["user-agent"] || "okhttp/5.1.0";
        const hostVal = headers.Host || firstValidToffeeChan?.headers?.Host || "bldcmprod-cdn.toffeelive.com";

        try {
          const urlObj = new URL(tfChan.link);
          urlObj.searchParams.set("cookie", cookieVal);
          urlObj.searchParams.set("user-agent", uaVal);
          urlObj.searchParams.set("host", hostVal);
          return {
            name: tfChan.name,
            logo: tfChan.logo || "",
            category: tfChan.category_name || "Others",
            url: urlObj.toString(),
          };
        } catch (urlErr) {
          return {
            name: tfChan.name,
            logo: tfChan.logo || "",
            category: tfChan.category_name || "Others",
            url: tfChan.link,
          };
        }
      });

      // 2. Keep the three M3U playlists completely clean, untouched and independent (no cross-pollution of headers/cookies)
      const consolidatedMap = new Map<string, Channel>();
      const combined = [...sonyLiv, ...tapmad, ...toffee, ...decoratedToffeeChannels];

      combined.forEach((ch) => {
        const key = normalizeChannelName(ch.name);
        if (consolidatedMap.has(key)) {
          const existing = consolidatedMap.get(key)!;
          if (!existing.urls.includes(ch.url)) {
            existing.urls.push(ch.url);
          }
        } else {
          consolidatedMap.set(key, {
            name: ch.name,
            logo: ch.logo,
            category: ch.category,
            urls: [ch.url],
          });
        }
      });

      const channelList = Array.from(consolidatedMap.values());

      if (channelList.length === 0) {
        setErrorText('❌ কোনো চ্যানেল পাওয়া যায়নি!');
      }

      setAllChannels(channelList);
      setFilteredChannels(channelList);
      setActiveCategory('All');
      setFocusedIndex(-1); // Reset focus index
    } catch (err) {
      console.error('Error loading playlists:', err);
      setErrorText('❌ চ্যানেল লিস্ট লোড করতে সমস্যা হচ্ছে। পেজটি রিলোড দিন।');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      // Let splash screen stay visible for 1.5 seconds for branding impact
      setTimeout(() => {
        setShowSplash(false);
      }, 1500);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  // Update filtered list when selected category changes
  useEffect(() => {
    const filtered = filterChannels(allChannels, activeCategory);
    setFilteredChannels(filtered);
    setFocusedIndex(-1); // Reset remote selection focus on category change
  }, [activeCategory, allChannels]);

  // TV keyboard remote arrow control handle
  useEffect(() => {
    const handleRemoteControl = (e: KeyboardEvent) => {
      // Ignore keys if video player is currently active
      if (selectedChannel !== null) return;

      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) return;

      const activeEl = document.activeElement;
      const isCard = activeEl?.classList.contains('channel-card');
      const isCategoryBtn = activeEl?.classList.contains('category-btn');
      const isRefreshBtn = activeEl?.id === 'refresh-btn';

      // Default jump: if nothing is focused, start focus on the active category button
      if (!isCard && !isCategoryBtn && !isRefreshBtn) {
        const firstCategory = document.querySelector('.category-btn') as HTMLElement;
        if (firstCategory) {
          firstCategory.focus();
        }
        return;
      }

      if (isRefreshBtn) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const activeCat = document.querySelector('.category-btn.active') as HTMLElement;
          if (activeCat) activeCat.focus();
        }
      } else if (isCategoryBtn) {
        const categoryButtons = Array.from(document.querySelectorAll('.category-btn')) as HTMLElement[];
        const currentIdx = categoryButtons.indexOf(activeEl as HTMLElement);

        if (e.key === 'ArrowRight' && currentIdx < categoryButtons.length - 1) {
          e.preventDefault();
          categoryButtons[currentIdx + 1].focus();
        } else if (e.key === 'ArrowLeft' && currentIdx > 0) {
          e.preventDefault();
          categoryButtons[currentIdx - 1].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const refreshBtn = document.getElementById('refresh-btn');
          if (refreshBtn) refreshBtn.focus();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          // Focus the first channel card
          if (filteredChannels.length > 0) {
            setFocusedIndex(0);
          }
        }
      } else if (isCard) {
        const columnsCount = getColumnsCount();
        let nextIdx = focusedIndex;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (focusedIndex < filteredChannels.length - 1) {
            nextIdx = focusedIndex + 1;
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (focusedIndex > 0) {
            nextIdx = focusedIndex - 1;
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (focusedIndex + columnsCount < filteredChannels.length) {
            nextIdx = focusedIndex + columnsCount;
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (focusedIndex >= columnsCount) {
            nextIdx = focusedIndex - columnsCount;
          } else {
            // Jump back to the active category button
            const activeCat = document.querySelector('.category-btn.active') as HTMLElement;
            if (activeCat) {
              setFocusedIndex(-1);
              activeCat.focus();
            }
          }
        }

        if (nextIdx !== focusedIndex) {
          setFocusedIndex(nextIdx);
        }
      }
    };

    const getColumnsCount = (): number => {
      const width = window.innerWidth;
      if (width >= 1536) return 8; // 2xl
      if (width >= 1280) return 6; // xl
      if (width >= 1024) return 5; // lg
      if (width >= 768) return 4;  // md
      if (width >= 640) return 3;  // sm
      return 2;
    };

    window.addEventListener('keydown', handleRemoteControl);
    return () => {
      window.removeEventListener('keydown', handleRemoteControl);
    };
  }, [filteredChannels, focusedIndex, selectedChannel]);

  // Filter/Find suggested channels (excluding the currently playing one)
  const suggestedChannels = allChannels
    .filter((ch) => ch.name !== selectedChannel?.name)
    .sort((a, b) => {
      if (a.category === selectedChannel?.category && b.category !== selectedChannel?.category) {
        return -1;
      }
      if (a.category !== selectedChannel?.category && b.category === selectedChannel?.category) {
        return 1;
      }
      return 0;
    });

  return (
    <div className="flex flex-col min-h-screen bg-black text-white select-none">
      {/* Dynamic Animated Splash Screen */}
      <SplashScreen isVisible={showSplash} />

      {/* Header and Branding section */}
      <Header
        onRefresh={() => loadChannels(true)}
        isRefreshing={isRefreshing}
        onDownloadClick={() => setShowDownloadModal(true)}
      />

      {/* Marquee Ticker Banner */}
      <div className="w-full bg-[#0a0a0a] border-y border-[#161616] py-3 overflow-hidden marquee-container relative z-10 flex items-center">
        <div className="absolute left-0 top-0 bottom-0 px-4 bg-red-600/90 text-white font-black text-xs md:text-sm flex items-center gap-2 z-20 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span>ঘোষণা</span>
        </div>
        <div className="w-full pl-[95px] md:pl-[110px] overflow-hidden whitespace-nowrap">
          <div className="marquee-text text-sm md:text-base font-bold text-gray-200 tracking-wide select-none">
            ⚠️ ওয়েবসাইটে কিছু চ্যানেল প্লে হতে সমস্যা হয় তাই আপনার পছন্দের চ্যানেলটি দেখতে <span className="text-[#00ffcc] font-black">download</span> করুন <span className="text-[#00ffcc] font-black">IreenTV</span> মোবাইল অ্যাপস
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 px-[15px] sm:px-[25px] md:px-[40px] xl:px-[60px] py-[30px] w-full max-w-full mx-auto">
        
        {/* Dynamic In-Page Theater Player with Suggestions Side List */}
        {selectedChannel && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 w-full animate-fade-in">
            {/* Left side: Responsive Video Player */}
            <div className="lg:col-span-8 xl:col-span-9 w-full flex flex-col gap-3">
              <PlayerOverlay
                channel={selectedChannel}
                onClose={() => setSelectedChannel(null)}
              />
              <div className="flex justify-between items-center bg-[#050505] border border-[#1a1a1a] rounded-xl px-5 py-4 shadow-lg">
                <div>
                  <h2 className="text-[#00ffcc] text-lg md:text-2xl font-bold tracking-tight">
                    {selectedChannel.name}
                  </h2>
                  <p className="text-gray-400 text-xs md:text-sm mt-1 flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    Category: <span className="text-white font-medium">{selectedChannel.category || 'Live TV'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Suggested list container */}
            <div className="lg:col-span-4 xl:col-span-3 flex flex-col bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-hidden h-[300px] lg:h-auto lg:max-h-[500px] xl:max-h-[530px] shadow-lg">
              <div className="bg-[#0a0a0a] px-4 py-3.5 border-b border-[#1a1a1a] flex justify-between items-center shrink-0">
                <span className="text-[#00ffcc] text-sm md:text-base font-black tracking-wide flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse" />
                  পরবর্তী চ্যানেলসমূহ
                </span>
                <span className="text-gray-500 text-xs font-mono">{suggestedChannels.length} Channels</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                {suggestedChannels.slice(0, 30).map((ch, index) => (
                  <div
                    key={ch.name + index}
                    onClick={() => setSelectedChannel(ch)}
                    className="flex items-center gap-3 p-2.5 bg-[#0c0c0c] hover:bg-[#111] active:bg-black rounded-lg border border-[#161616] hover:border-[#00ffcc]/40 hover:shadow-[0_0_10px_rgba(0,255,204,0.1)] transition-all duration-300 cursor-pointer group"
                  >
                    {/* Channel Logo */}
                    <div className="w-[50px] h-[35px] bg-black/85 rounded flex items-center justify-center overflow-hidden border border-[#222] shrink-0 group-hover:border-[#00ffcc]/30">
                      <SuggestedChannelLogo logo={ch.logo} name={ch.name} />
                    </div>
                    {/* Channel Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs md:text-sm font-bold truncate group-hover:text-[#00ffcc] transition-colors">
                        {ch.name}
                      </div>
                      <div className="text-gray-500 text-[10px] md:text-xs truncate mt-0.5">
                        {ch.category || 'Live TV'}
                      </div>
                    </div>
                    <div className="text-[10px] px-2 py-0.5 bg-[#1f1f1f] border border-[#2d2d2d] rounded text-gray-400 font-medium group-hover:bg-[#00ffcc]/10 group-hover:text-[#00ffcc] group-hover:border-[#00ffcc]/20 transition-all shrink-0">
                      PLAY
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category bar filters */}
        {!selectedChannel && !isLoading && !errorText && (
          <CategoryBar
            activeCategory={activeCategory}
            onSelectCategory={(cat) => setActiveCategory(cat)}
          />
        )}

        {/* Loading Indicator */}
        {!selectedChannel && (isLoading || isRefreshing) && !showSplash && (
          <div
            id="loading"
            className="text-center text-[18px] text-[#00ffcc] mb-[20px] font-bold py-12 blink-animation"
          >
            চ্যানেল লিস্ট আপডেট করা হচ্ছে... দয়া করে অপেক্ষা করুন।
          </div>
        )}

        {/* Error Feedback */}
        {!selectedChannel && errorText && !isLoading && (
          <div className="text-center text-red-500 font-bold py-12 text-lg">
            {errorText}
          </div>
        )}

        {/* Dynamic Responsive 5 to 10 Column Channel Cards Grid based on screen width */}
        {!selectedChannel && !isLoading && !errorText && (
          <div
            id="channel-list"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 pb-12"
          >
            {filteredChannels.length === 0 ? (
              <h3 className="text-red-500 font-bold text-center col-span-full py-8 text-lg">
                এই ক্যাটাগরিতে কোনো চ্যানেল পাওয়া যায়নি!
              </h3>
            ) : (
              filteredChannels.map((channel, index) => (
                <div key={channel.name + index} className="contents">
                  <ChannelCard
                    channel={channel}
                    isFocused={focusedIndex === index}
                    onClick={() => {
                      setFocusedIndex(index);
                      setSelectedChannel(channel);
                      // Scroll to top smoothly so player is immediately visible
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Persistent Smart TV styled footer */}
      <footer className="bg-[#050505] text-center p-[25px] border-t border-[#1a1a1a] text-[#555] text-[14px]">
        <p>
          &copy; 2026 <span className="text-[#00ffcc] font-bold">IreenTV</span>. All
          rights reserved. Designed for Android Smart TV.
        </p>
      </footer>

      {/* Download apps modal popup */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </div>
  );
}
