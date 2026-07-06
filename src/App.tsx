import React, { useEffect, useState, useMemo } from 'react';
import { 
  Tv, Search, Heart, RefreshCw, Sun, Moon, 
  Clock, Flame, HelpCircle, Eye, Sparkles, Filter, Trash2, ArrowLeft, Server, ArrowRight
} from 'lucide-react';
import { Channel } from './types';
import VideoPlayer from './components/VideoPlayer';
import ChannelCard from './components/ChannelCard';

// Client-side robust M3U Parser and server consolidator for static page hosts (like Cloudflare Pages)
function parseClientM3U(data: string): Channel[] {
  const rawChannels: Channel[] = [];
  const lines = data.split('\n');
  let currentChannel: Partial<Channel> | null = null;
  let index = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      if (currentChannel && currentChannel.url) {
        if (!currentChannel.id || currentChannel.id.trim() === '') {
          currentChannel.id = `ch-${index}`;
        } else {
          currentChannel.id = `${currentChannel.id}-${index}`;
        }
        rawChannels.push(currentChannel as Channel);
        index++;
      }

      currentChannel = {
        urls: []
      };
      
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      currentChannel.logo = logoMatch ? logoMatch[1] : '';

      const categoryMatch = line.match(/group-title="([^"]*)"/i);
      let rawCategory = categoryMatch ? categoryMatch[1].trim() : '';

      if (!rawCategory) {
        const categoryMatch2 = line.match(/group-title=([^,\s]+)/i);
        rawCategory = categoryMatch2 ? categoryMatch2[1].replace(/"/g, '').trim() : 'Others';
      }

      let category = 'Others';
      if (rawCategory) {
        const catLower = rawCategory.toLowerCase();
        if (catLower === 'bangla' || catLower === 'bangladeshi' || catLower.includes('bangla')) {
          category = 'Bangla';
        } else if (catLower === 'sports' || catLower.includes('cricket') || catLower.includes('fifa')) {
          category = 'Sports';
        } else if (catLower === 'movies' || catLower.includes('movie') || catLower.includes('cine')) {
          category = 'Movies';
        } else if (catLower === 'music' || catLower.includes('beat')) {
          category = 'Music';
        } else if (catLower === 'kids' || catLower.includes('cartoon') || catLower.includes('gopal')) {
          category = 'Kids';
        } else if (catLower === 'documentary' || catLower.includes('earth') || catLower.includes('discovery') || catLower.includes('geo')) {
          category = 'Documentary';
        } else if (catLower === 'islamic' || catLower.includes('relagion') || catLower.includes('quran') || catLower.includes('peace')) {
          category = 'Islamic';
        } else if (catLower === 'news') {
          category = 'News';
        } else if (catLower === 'hindi' || catLower.includes('entertainment')) {
          category = 'Hindi';
        } else {
          category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
        }
      }
      currentChannel.category = category;

      const lastCommaIndex = line.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        currentChannel.name = line.substring(lastCommaIndex + 1).trim();
      } else {
        currentChannel.name = 'Unknown Channel';
      }

      const idMatch = line.match(/tvg-id="([^"]*)"/i);
      currentChannel.id = idMatch ? idMatch[1] : '';

    } else if (line.startsWith('#')) {
      continue;
    } else {
      if (currentChannel) {
        if (!currentChannel.url) {
          currentChannel.url = line;
        }
        if (currentChannel.urls) {
          currentChannel.urls.push(line);
        } else {
          currentChannel.urls = [line];
        }
      }
    }
  }

  if (currentChannel && currentChannel.url) {
    if (!currentChannel.id || currentChannel.id.trim() === '') {
      currentChannel.id = `ch-${index}`;
    } else {
      currentChannel.id = `${currentChannel.id}-${index}`;
    }
    rawChannels.push(currentChannel as Channel);
  }

  // Deduplicate and group channels with the same name to form "Servers"
  const grouped: Channel[] = [];
  const nameMap = new Map<string, Channel>();

  rawChannels.forEach(ch => {
    const key = ch.name.trim().toLowerCase();
    const existing = nameMap.get(key);
    if (existing) {
      if (ch.url && !existing.urls?.includes(ch.url)) {
        existing.urls = [...(existing.urls || [existing.url]), ch.url];
      }
    } else {
      const newChan: Channel = {
        ...ch,
        urls: ch.urls && ch.urls.length > 0 ? ch.urls : [ch.url]
      };
      nameMap.set(key, newChan);
      grouped.push(newChan);
    }
  });

  return grouped;
}

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [activePage, setActivePage] = useState<'home' | 'player'>('home');

  // Theme State (Dark mode by default)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('tv_theme');
    return saved === 'light' ? false : true;
  });

  // Favorites state (array of channel IDs)
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('tv_fav_ids');
    return saved ? JSON.parse(saved) : [];
  });

  // Selected Channel State
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>('');

  // Clock state for beautiful live TV timezone display
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Channels with static host fallback
  const fetchChannels = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let data;
      try {
        const response = await fetch(`/api/channels${forceRefresh ? '?refresh=true' : ''}`);
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        data = await response.json();
      } catch (apiErr) {
        console.warn('Backend API unavailable. Falling back to robust client-side direct M3U parser...', apiErr);
        // Fallback directly to fetching the raw M3U playlist from GitHub in the browser
        const fallbackResponse = await fetch("https://raw.githubusercontent.com/lotaji/playlist-vip/refs/heads/main/playlist_vip.m3u");
        if (!fallbackResponse.ok) {
          throw new Error('Could not fetch channels from local server or GitHub backup source.');
        }
        const text = await fallbackResponse.text();
        const parsed = parseClientM3U(text);
        data = {
          success: true,
          channels: parsed
        };
      }

      if (data.success && data.channels) {
        setChannels(data.channels);

        // Auto-select first channel or restore last played channel from local storage
        const lastPlayedId = localStorage.getItem('tv_last_played_id');
        if (lastPlayedId) {
          const matched = data.channels.find((ch: Channel) => ch.id === lastPlayedId);
          if (matched) {
            setSelectedChannel(matched);
            setActiveStreamUrl(matched.url);
          } else if (data.channels.length > 0) {
            setSelectedChannel(data.channels[0]);
            setActiveStreamUrl(data.channels[0].url);
          }
        } else if (data.channels.length > 0) {
          setSelectedChannel(data.channels[0]);
          setActiveStreamUrl(data.channels[0].url);
        }
      } else {
        throw new Error(data.error || 'Could not load channels list.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  // Update theme classes on HTML element
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
      localStorage.setItem('tv_theme', 'dark');
      document.body.className = 'bg-black text-zinc-100 transition-colors duration-300';
    } else {
      html.classList.remove('dark');
      localStorage.setItem('tv_theme', 'light');
      document.body.className = 'bg-zinc-50 text-zinc-900 transition-colors duration-300';
    }
  }, [darkMode]);

  // Handle Favorites toggle
  const toggleFavorite = (id: string) => {
    const updated = favorites.includes(id)
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    
    setFavorites(updated);
    localStorage.setItem('tv_fav_ids', JSON.stringify(updated));
  };

  // Clear all favorites helper
  const clearAllFavorites = () => {
    if (window.confirm('Are you sure you want to clear all favorite channels?')) {
      setFavorites([]);
      localStorage.setItem('tv_fav_ids', JSON.stringify([]));
    }
  };

  // Select Channel and save to last played
  const handleSelectChannel = (channel: Channel, autoNavigate = true) => {
    setSelectedChannel(channel);
    setActiveStreamUrl(channel.url);
    localStorage.setItem('tv_last_played_id', channel.id);
    if (autoNavigate) {
      setActivePage('player');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Switch category and navigate to home list
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setActivePage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Translate categories to English beautifully
  function translateCategory(id: string): string {
    switch (id) {
      case 'Sports': return 'Sports';
      case 'Bangla': return 'Bangla TV';
      case 'Movies': return 'Movies';
      case 'Music': return 'Music';
      case 'Kids': return 'Kids';
      case 'Documentary': return 'Documentary';
      case 'Islamic': return 'Islamic';
      case 'News': return 'News';
      case 'Hindi': return 'Hindi';
      case 'Others': return 'Others';
      case 'All': return 'All Channels';
      case 'Favorites': return 'Favorites';
      default: return id;
    }
  }

  // Compute available categories and count channels dynamically
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    channels.forEach(ch => {
      const cat = ch.category || 'Others';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const list = Object.entries(counts).map(([name, count]) => ({
      id: name,
      name: translateCategory(name),
      count
    })).sort((a, b) => b.count - a.count); // Sort by quantity

    // Inject "All" and "Favorites" at the top
    return [
      { id: 'All', name: 'All Channels', count: channels.length },
      { id: 'Favorites', name: 'My Favorites', count: favorites.length },
      ...list
    ];
  }, [channels, favorites]);

  // Filtered Channels list
  const filteredChannels = useMemo(() => {
    return channels.filter(ch => {
      // 1. Search Query filter (matches Name or Category)
      const matchesSearch = 
        ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Category filter
      if (selectedCategory === 'All') {
        return true;
      }
      if (selectedCategory === 'Favorites') {
        return favorites.includes(ch.id);
      }
      return ch.category === selectedCategory;
    });
  }, [channels, selectedCategory, searchQuery, favorites]);

  // Quick select next/prev channel
  const playNextChannel = () => {
    if (!selectedChannel || filteredChannels.length <= 1) return;
    const currentIndex = filteredChannels.findIndex(ch => ch.id === selectedChannel.id);
    const nextIndex = (currentIndex + 1) % filteredChannels.length;
    handleSelectChannel(filteredChannels[nextIndex], activePage === 'player');
  };

  const playPrevChannel = () => {
    if (!selectedChannel || filteredChannels.length <= 1) return;
    const currentIndex = filteredChannels.findIndex(ch => ch.id === selectedChannel.id);
    const prevIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
    handleSelectChannel(filteredChannels[prevIndex], activePage === 'player');
  };

  return (
    <div className={`min-h-screen font-sans ${darkMode ? 'dark text-zinc-100 bg-black' : 'text-zinc-800 bg-zinc-50'}`}>
      
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 w-full bg-white dark:bg-black border-b border-zinc-200/50 dark:border-zinc-900/50 transition-all duration-300 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 h-16 flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => setActivePage('home')}>
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/20 animate-pulse">
              <Tv className="w-5.5 h-5.5 animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider font-display text-red-600 dark:text-red-500">
                IREENTV
              </h1>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">HD Live Streaming</p>
            </div>
          </div>

          {/* Clock Widget for premium live vibe (desktop-only) */}
          <div className="hidden md:flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200/40 dark:border-zinc-800/40 px-3.5 py-1.5 rounded-xl font-mono text-xs text-zinc-500 dark:text-zinc-400 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-red-500" />
            <span>UTC {currentTime.toISOString().split('T')[1].slice(0, 8)}</span>
          </div>

          {/* Action Center (Search, Theme Toggle, Reload) */}
          <div className="flex items-center gap-2 flex-grow max-w-md justify-end md:flex-grow-0">
            
            {/* Theme Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-300 hover:text-red-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-all"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Force Refresh Cache Database */}
            <button
              onClick={() => fetchChannels(true)}
              disabled={refreshing || loading}
              className={`p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-300 hover:text-red-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-all ${
                refreshing ? 'animate-spin text-red-500 bg-zinc-200 dark:bg-zinc-800' : ''
              }`}
              title="Refresh Channels List"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Favorites Count Indicator Tab Shortcut */}
            <button
              onClick={() => {
                setSelectedCategory('Favorites');
                setActivePage('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="relative p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-300 hover:text-rose-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-all"
              title="View Favorite Channels"
            >
              <Heart className="w-4 h-4" />
              {favorites.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {favorites.length}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Categories Bar inside Header - Sticky & Accessible from anywhere! */}
        <div className="border-t border-zinc-200/50 dark:border-zinc-900/50 bg-zinc-50/50 dark:bg-black/80 py-2">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 flex items-center gap-2 overflow-x-auto select-none no-scrollbar">
            {categoriesWithCounts.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-950/20 font-bold scale-[1.02]'
                    : 'bg-zinc-100 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {cat.id === 'Favorites' ? (
                  <Heart className={`w-3 h-3 ${selectedCategory === 'Favorites' ? 'fill-white text-white' : 'fill-none text-rose-500'}`} />
                ) : null}
                {cat.name}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  selectedCategory === cat.id 
                    ? 'bg-white/20 text-white font-bold' 
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 py-6">
        
        {error && (
          <div id="error-banner" className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
            <div className="p-2 bg-red-500/15 rounded-lg text-red-500 shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-500">Connection Error</h3>
              <p className="text-xs text-zinc-400 mt-1">{error}</p>
              <button 
                onClick={() => fetchChannels()}
                className="mt-2 text-xs font-semibold text-red-400 hover:text-red-300 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ----------------- VIEW 1: HOME GRID PAGE ----------------- */}
        {activePage === 'home' && (
          <div id="home-view-container" className="flex flex-col gap-6">
            
            {/* Hero / Filter Information header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/50 dark:border-zinc-900/50 pb-5">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-red-500" />
                  {selectedCategory === 'All' ? 'All Channels' : selectedCategory === 'Favorites' ? 'My Favorite Channels' : `${translateCategory(selectedCategory)} Channels`}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {selectedCategory === 'Favorites' 
                    ? 'Watch and manage your saved premium channels.' 
                    : 'Browse through our extensive library of live streaming channels.'}
                </p>
              </div>

              {/* Home Search bar & clear favorites */}
              <div className="flex items-center gap-3 shrink-0">
                {selectedCategory === 'Favorites' && favorites.length > 0 && (
                  <button
                    onClick={clearAllFavorites}
                    className="px-3.5 py-2 rounded-xl border border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-xs flex items-center gap-1.5 transition-colors animate-pulse"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Favorites
                  </button>
                )}

                <div className="relative w-64 md:w-72">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input 
                    type="text"
                    placeholder="Search channels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 pl-9 pr-8 py-2.5 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-[10px] font-bold text-zinc-400 hover:text-zinc-250"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Smart Caching Info Banner */}
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-900/50 rounded-2xl flex items-start gap-3 shadow-sm">
              <Sparkles className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Smart HD Stream Caching Enabled</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Our system automatically proxies and optimizes streaming URLs to resolve CORS and HTTP Mixed Content issues. If any stream goes offline or list updates are needed, click the Refresh icon in the header to sync the live playlist cache instantly.
                </p>
              </div>
            </div>

            {/* Loading / Channels Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-x-4 gap-y-2.5 py-12">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden animate-pulse">
                    <div className="w-full aspect-[2.2/1] bg-zinc-900"></div>
                    <div className="p-2.5 flex justify-between bg-black">
                      <div className="w-24 h-3 bg-zinc-900 rounded"></div>
                      <div className="w-8 h-3 bg-zinc-900 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredChannels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-x-4 gap-y-2.5">
                {filteredChannels.map((ch) => (
                  <ChannelCard
                    key={ch.id}
                    channel={ch}
                    isActive={selectedChannel?.id === ch.id}
                    isFavorite={favorites.includes(ch.id)}
                    onSelect={() => handleSelectChannel(ch)}
                    onToggleFavorite={() => toggleFavorite(ch.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-zinc-100 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-900/30 rounded-3xl backdrop-blur-md">
                <div className="p-4 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-full mb-3 text-zinc-400 dark:text-zinc-500">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Channels Found</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                  {selectedCategory === 'Favorites' 
                    ? "You haven't added any channels to your favorites list yet. Click the heart icon on any channel card to save it here."
                    : "No channels found matching your active filter. Try searching for other keywords or switching categories."}
                </p>
                {selectedCategory === 'Favorites' && (
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="mt-4 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-500 transition-colors shadow-md"
                  >
                    Browse All Channels
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ----------------- VIEW 2: DEDICATED PLAYER PAGE ----------------- */}
        {activePage === 'player' && selectedChannel && (
          <div id="player-view-container" className="flex flex-col gap-6">
            
            {/* Back Navigation Bar */}
            <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-900/50 pb-4">
              <button
                onClick={() => {
                  setActivePage('home');
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-900/50 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-all shadow-sm group active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Channels List
              </button>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>Active Category:</span>
                <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full font-bold text-red-500 dark:text-red-400 uppercase tracking-wider text-[10px]">
                  {translateCategory(selectedChannel.category)}
                </span>
              </div>
            </div>

            {/* Main Player Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left Side: Player, Active Info, Alternative Server Links */}
              <div className="lg:col-span-2 flex flex-col gap-5">
                
                {/* Video Player */}
                <VideoPlayer 
                  key={`${selectedChannel.id}-${activeStreamUrl}`}
                  channel={selectedChannel} 
                  activeUrl={activeStreamUrl}
                  onPrev={playPrevChannel}
                  onNext={playNextChannel}
                  onClose={() => setActivePage('home')}
                />

                {/* Compact Server Switcher */}
                {selectedChannel.urls && selectedChannel.urls.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 bg-zinc-100/80 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 p-2.5 rounded-2xl backdrop-blur-md shadow-sm">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-1 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-red-500" />
                      Servers:
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedChannel.urls.map((url, index) => {
                        const isActive = activeStreamUrl === url;
                        return (
                          <button
                            key={index}
                            onClick={() => setActiveStreamUrl(url)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-red-600 text-white border-red-600 shadow-sm font-extrabold scale-[1.02]'
                                : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            Server {index + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Right Side: Next Up Sidebar */}
              <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-900/50 p-4 rounded-3xl flex flex-col gap-4 h-[600px] lg:h-[580px] backdrop-blur-md shadow-sm">
                
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 font-display">Related Channels</h3>
                  </div>
                  <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 font-bold px-2 py-0.5 rounded-full">
                    {filteredChannels.length} Channels
                  </span>
                </div>

                {/* Sidebar Search */}
                <div className="relative shrink-0">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input 
                    type="text"
                    placeholder="Filter related..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 pl-9 pr-8 py-2 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-250"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Sidebar scroll list */}
                <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-1.5">
                  {filteredChannels.map((ch) => (
                    <div 
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch, false)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                        selectedChannel?.id === ch.id 
                          ? 'bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400 font-semibold' 
                          : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/10 dark:hover:bg-zinc-800/30 border-transparent text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-1 border border-zinc-200 dark:border-zinc-800 shrink-0 overflow-hidden">
                          {ch.logo ? (
                            <img 
                              src={ch.logo} 
                              alt={ch.name} 
                              className="max-w-full max-h-full object-contain"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const p = (e.target as HTMLImageElement).parentElement;
                                if (p) {
                                  const f = document.createElement('div');
                                  f.className = 'text-red-500 font-bold text-xs';
                                  f.innerText = ch.name.charAt(0);
                                  p.appendChild(f);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-red-500 font-bold text-xs">{ch.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs truncate" title={ch.name}>{ch.name}</p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{translateCategory(ch.category)}</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(ch.id);
                        }}
                        className={`p-1.5 rounded transition-all ${
                          favorites.includes(ch.id) ? 'text-rose-500' : 'text-zinc-450 hover:text-zinc-650 dark:hover:text-zinc-200'
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Aesthetic Footer */}
      <footer className="mt-20 border-t border-zinc-200/50 dark:border-zinc-900/50 py-8 bg-zinc-100 dark:bg-black text-center text-xs text-zinc-500 select-none">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-400">IREENTV — Live Streaming Web Player</span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-600">
            © {new Date().getFullYear()} — All streaming content and playlist links are collected from public online sources.
          </p>
        </div>
      </footer>

    </div>
  );
}
