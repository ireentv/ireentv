import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Tv, 
  RotateCcw, 
  Heart, 
  Play, 
  Wifi,
  Search,
  ExternalLink,
  ChevronDown,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  X,
  User,
  Download
} from "lucide-react";
import { Channel, Category } from "./types";
import VideoPlayer from "./components/VideoPlayer";
import RowSlider from "./components/RowSlider";
import SportsHeroCarousel from "./components/SportsHeroCarousel";

// Advanced classification matcher that acts as a robust category splitting engine
export function matchCategory(chan: Channel, cat: Category, favoriteIds: string[] = []): boolean {
  if (cat === "All") return true;
  if (cat === "Favorites") return favoriteIds.includes(chan.id);

  const name = chan.name.toLowerCase();
  const group = (chan as any).group?.toLowerCase() || "";

  // Helper matching for Bangla criteria
  const hasBengali = /[\u0980-\u09FF]/.test(chan.name);
  const isBangla = 
    hasBengali || 
    name.includes("bangla") || 
    name.includes("somoy") || 
    name.includes("jamuna") || 
    name.includes("atn") || 
    name.includes("channel i") || 
    name.includes("independent") || 
    name.includes("ekattor") || 
    name.includes("news24") || 
    name.includes("ntv") || 
    name.includes("rtv") || 
    name.includes("gazi") || 
    name.includes("gtv") || 
    name.includes("t sports") || 
    name.includes("t-sports") || 
    name.includes("badi") || 
    name.includes("ch24") || 
    name.includes("deepto") || 
    name.includes("duronto") || 
    name.includes("boishakhi") || 
    name.includes("asian") || 
    name.includes("desh") || 
    name.includes("maasranga") || 
    name.includes("saatv") || 
    name.includes("nagorik") || 
    name.includes("news 24") || 
    name.includes("independent tv") || 
    group.includes("bangla") || 
    group.includes("local") || 
    group.includes("bangladesh");

  if (cat === "Bangla") {
    return isBangla;
  }

  if (cat === "Premium Sports") {
    return (
      (name.includes("sports") || 
       name.includes("football") || 
       name.includes("cricket") || 
       name.includes("golf") || 
       name.includes("premier") || 
       name.includes("laliga") || 
       name.includes("espn") || 
       name.includes("sports3") ||
       name.includes("star sports") || 
       name.includes("willow") || 
       name.includes("ten sports") || 
       name.includes("ten") || 
       name.includes("astro") || 
       name.includes("sky") || 
       name.includes("tnt") || 
       name.includes("bein") || 
       name.includes("eurosport") || 
       name.includes("super sport") || 
       name.includes("wwe") || 
       name.includes("ufc") || 
       name.includes("grand prix") || 
       name.includes("f1") || 
       group.includes("sports") || 
       group.includes("cricket") || 
       group.includes("football")) &&
       !isBangla
    );
  }

  if (cat === "Documentary") {
    return (
      name.includes("discovery") || 
      name.includes("national geographic") || 
      name.includes("nat geo") || 
      name.includes("history") || 
      name.includes("animal planet") || 
      name.includes("documentary") || 
      name.includes("science") || 
      name.includes("investigation discovery") || 
      name.includes("id tv") ||
      name.includes("nasa") ||
      name.includes("smithsonian") ||
      group.includes("documentary") || 
      group.includes("knowledge")
    );
  }

  if (cat === "International News") {
    const isBanglaNews = 
      name.includes("somoy") || 
      name.includes("jamuna") || 
      name.includes("independent") || 
      name.includes("ekattor") || 
      name.includes("news24");
    return (
      (name.includes("bbc") || 
       name.includes("cnn") || 
       name.includes("al jazeera") || 
       name.includes("news") || 
       name.includes("sky news") || 
       name.includes("fox news") || 
       name.includes("msnbc") || 
       name.includes("ndtv") || 
       name.includes("dw") || 
       name.includes("france24") || 
       name.includes("reuters") || 
       name.includes("cna") || 
       name.includes("euro news") || 
       name.includes("bloomberg") || 
       name.includes("cnbc") ||
       name.includes("trt") ||
       name.includes("nhk") ||
       group.includes("news")) &&
      !isBangla && !isBanglaNews
    );
  }

  if (cat === "Entertainment Hindi") {
    return (
      name.includes("star plus") || 
      name.includes("sony tv") || 
      name.includes("sab") || 
      name.includes("colors") || 
      name.includes("zee tv") || 
      name.includes("star gold") || 
      name.includes("sony max") || 
      name.includes("zee cinema") || 
      name.includes("hindi") || 
      name.includes("rishtey") || 
      name.includes("dangal") || 
      name.includes("shemaroo") || 
      name.includes("filmy") || 
      name.includes("b4u") || 
      name.includes("bollywood") || 
      group.includes("hindi") || 
      group.includes("india")
    ) && !isBangla;
  }

  if (cat === "Music") {
    return (
      name.includes("music") || 
      name.includes("mtv") || 
      name.includes("v h1") || 
      name.includes("zoom") || 
      name.includes("9xm") || 
      name.includes("song") || 
      name.includes("melodic") || 
      name.includes("sing") || 
      name.includes("beats") || 
      name.includes("t-series") || 
      name.includes("karaoke") || 
      name.includes("mix") || 
      name.includes("clubland") ||
      group.includes("music")
    );
  }

  if (cat === "Kids") {
    return (
      name.includes("cartoon") || 
      name.includes("nickelodeon") || 
      name.includes("nick") || 
      name.includes("disney") || 
      name.includes("pogo") || 
      name.includes("hungama") || 
      name.includes("kids") || 
      name.includes("anime") || 
      name.includes("baby") || 
      name.includes("boomer") || 
      name.includes("cn d") || 
      name.includes("duronto") || 
      name.includes("cbeebies") || 
      name.includes("cbbc") || 
      group.includes("kids") || 
      group.includes("cartoon")
    );
  }

  if (cat === "Movies") {
    return (
      name.includes("movie") || 
      name.includes("cinema") || 
      name.includes("film") || 
      name.includes("hbo") || 
      name.includes("star gold") || 
      name.includes("sony max") || 
      name.includes("zee cinema") || 
      name.includes("cine") || 
      name.includes("bioscope") || 
      name.includes("thriller") || 
      name.includes("classic") || 
      name.includes("blockbuster") || 
      name.includes("box office") ||
      group.includes("movie") || 
      group.includes("movies") || 
      group.includes("cinema")
    );
  }

  if (cat === "FootballHDZone") {
    return !!chan.isFootballHDZone;
  }

  return true;
}

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isStaticMode, setIsStaticMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All" | "Favorites">("All");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Custom user notification state
  const [showNotification, setShowNotification] = useState(true);

  // Download / Install App Modal state
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Progressive Web App (PWA) Install States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(true); // Default with fallback support

  // Register Service Worker & Handle Install Promotion
  useEffect(() => {
    // 1. Register Service Worker on production/sandboxed site
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js")
          .then((reg) => {
            console.log("IreenTV Service Worker registered successfully:", reg.scope);
          })
          .catch((err) => {
            console.warn("Service Worker registration bypassed or failed:", err);
          });
      });
    }

    // 2. Intercept beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 3. Standalone inspection to auto-hide install buttons if launched as standalone PWA
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (isStandalone) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      // Smooth browser fallback instructions in Bengali for instant usability
      alert("IreenTV ক্রোম থেকে ইন্সটল করতে:\n\n১. ব্রাউজারের উপরে ডান কোনায় (⋮) থ্রি-ডট মেনুতে ক্লিক করুন।\n২. 'Save and share' অথবা 'Install app' অপশনটি সিলেক্ট করুন।\n\nমোবাইলের ক্ষেত্রে 'Add to Home screen' প্রেস করুন।");
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA user action choice: ${outcome}`);
      setDeferredPrompt(null);
      if (outcome === "accepted") {
        setShowInstallBtn(false);
      }
    } catch (err) {
      console.error("Install presentation trigger failed:", err);
    }
  };

  // Standalone Player & Browse Grid Page State Management
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingCategory, setPlayingCategory] = useState<Category | "RoarZone" | "All" | "Favorites">("All");
  const [forceAllGridView, setForceAllGridView] = useState(false);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<string[]>([]);

  // Load recently updated channels from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ireentv_recently_updated");
      if (saved) {
        setRecentlyUpdatedIds(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not parse recently updated ids:", e);
    }
  }, []);

  const markChannelAsUpdated = useCallback((channelId: string) => {
    setRecentlyUpdatedIds((prev) => {
      const filtered = prev.filter((id) => id !== channelId);
      const updated = [channelId, ...filtered].slice(0, 40); // Keep top 40 recently updated
      try {
        localStorage.setItem("ireentv_recently_updated", JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  }, []);

  // Load favorites from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cric_tv_favorites");
      if (saved) {
        setFavoriteIds(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not parse favorites:", e);
    }
  }, []);

  // Sync favorites back to local storage
  const saveFavorites = (ids: string[]) => {
    setFavoriteIds(ids);
    try {
      localStorage.setItem("cric_tv_favorites", JSON.stringify(ids));
    } catch (e) {
      console.warn("Could not save favorites:", e);
    }
  };

  const toggleFavorite = (channelId: string, e: any) => {
    e.stopPropagation(); // Avoid choosing the channel if they clicked inside banner/slide
    if (favoriteIds.includes(channelId)) {
      saveFavorites(favoriteIds.filter((id) => id !== channelId));
    } else {
      saveFavorites([...favoriteIds, channelId]);
    }
  };

  // Fetch channels from server proxy
  const loadChannels = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let data: any[] = [];
      try {
        const response = await fetch("/api/channels");
        if (response.ok) {
          data = await response.json();
          setIsStaticMode(false);
        } else {
          throw new Error(`Failed to load server channels: status ${response.status}`);
        }
      } catch (err) {
        console.warn("Express backend API failed, trying direct GitHub raw loading fallback:", err);
        setIsStaticMode(true);
        // Fallback: Fetch directly from raw github repositories
        let cricChannels: any[] = [];
        try {
          const cricResponse = await fetch(
            "https://raw.githubusercontent.com/lotaji/playlist-vip/refs/heads/main/playlist_vip.m3u"
          );
          if (cricResponse.ok) {
            const text = await cricResponse.text();
            const lines = text.split(/\r?\n/);
            let currentItem: any = null;
            let channelIndex = 0;

            const finalizeCurrentItem = () => {
              if (currentItem && currentItem.name && currentItem.urls && currentItem.urls.length > 0) {
                const urls = currentItem.urls;
                currentItem.link = urls[0];
                if (urls.length > 1) {
                  currentItem.link2 = urls[1];
                }
                if (urls.length > 2) {
                  currentItem.link3 = urls[2];
                }

                currentItem.id = currentItem.tvgId ? `crichd-m3u-${currentItem.tvgId}-${channelIndex}` : `crichd-m3u-${channelIndex}`;

                if (!currentItem.logo) {
                  currentItem.logo = "https://images.unsplash.com/photo-1540747737956-378724044453?q=80&w=200&auto=format&fit=crop";
                }

                currentItem.referer = currentItem.optReferer || "https://executeandship.com/";
                currentItem.origin = currentItem.optOrigin || "https://executeandship.com";
                if (currentItem.optUa) {
                  currentItem.ua = currentItem.optUa;
                }

                if (currentItem.link2) {
                  currentItem.referer2 = currentItem.optReferer || "https://executeandship.com/";
                  currentItem.origin2 = currentItem.optOrigin || "https://executeandship.com";
                  if (currentItem.optUa) currentItem.ua2 = currentItem.optUa;
                }

                if (currentItem.link3) {
                  currentItem.referer3 = currentItem.optReferer || "https://executeandship.com/";
                  currentItem.origin3 = currentItem.optOrigin || "https://executeandship.com";
                  if (currentItem.optUa) currentItem.ua3 = currentItem.optUa;
                }

                cricChannels.push(currentItem);
                channelIndex++;
              }
              currentItem = null;
            };

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              if (line.startsWith("#EXTINF:")) {
                finalizeCurrentItem();

                currentItem = {
                  urls: [],
                  optReferer: "",
                  optOrigin: "",
                  optUa: ""
                };

                // Extract tvg-logo
                const logoMatch = line.match(/tvg-logo=["']([^"']+)["']/i);
                if (logoMatch) {
                  currentItem.logo = logoMatch[1];
                }

                // Extract group-title
                const groupMatch = line.match(/group-title=["']([^"']+)["']/i);
                if (groupMatch) {
                  currentItem.group = groupMatch[1];
                }

                // Extract tvg-id
                const idMatch = line.match(/tvg-id=["']([^"']+)["']/i);
                if (idMatch) {
                  currentItem.tvgId = idMatch[1];
                }

                // Get the display name (after the last comma)
                const commaIndex = line.lastIndexOf(",");
                if (commaIndex !== -1) {
                  currentItem.name = line.substring(commaIndex + 1).trim();
                } else {
                  currentItem.name = `M3U Channel ${channelIndex + 1}`;
                }
              } else if (line.startsWith("#EXTVLCOPT:")) {
                if (currentItem) {
                  const opt = line.substring("#EXTVLCOPT:".length).trim();
                  const eqIdx = opt.indexOf("=");
                  if (eqIdx !== -1) {
                    const key = opt.substring(0, eqIdx).toLowerCase().trim();
                    const val = opt.substring(eqIdx + 1).trim();
                    if (key === "http-client-referrer" || key === "http-referrer" || key === "referer") {
                      currentItem.optReferer = val;
                    } else if (key === "http-user-agent" || key === "user-agent") {
                      currentItem.optUa = val;
                    } else if (key === "http-origin" || key === "origin") {
                      currentItem.optOrigin = val;
                    }
                  }
                }
              } else if (line.startsWith("#")) {
                // Comments end the previous channel
                finalizeCurrentItem();
              } else {
                // This is the stream URL
                if (currentItem) {
                  currentItem.urls.push(line);
                }
              }
            }
            finalizeCurrentItem();
          }
        } catch (cricErr) {
          console.error("Direct CricHD fallback fetch failed:", cricErr);
        }

        let roarZoneChannels: any[] = [];
        try {
          const roarResponse = await fetch(
            "https://raw.githubusercontent.com/sm-monirulislam/RoarZone-Auto-Update-playlist/refs/heads/main/RoarZone_data.json"
          );
          if (roarResponse.ok) {
            const rawRoarData: any = await roarResponse.json();
            let parsedArray: any[] = [];
            if (rawRoarData && rawRoarData.response && Array.isArray(rawRoarData.response)) {
              parsedArray = rawRoarData.response;
            } else if (Array.isArray(rawRoarData)) {
              parsedArray = rawRoarData;
            } else if (rawRoarData && typeof rawRoarData === "object") {
              const firstArrayKey = Object.keys(rawRoarData).find(k => Array.isArray(rawRoarData[k]));
              if (firstArrayKey) {
                parsedArray = rawRoarData[firstArrayKey];
              }
            }

            roarZoneChannels = parsedArray.map((item: any, index: number) => {
              const streamUrl = item.url || item.link || item.stream || item.stream_url || "";
              const logoUrl = item.logo || item.src || item.image || item.thumbnail || "https://images.unsplash.com/photo-1540747737956-378724044453?q=80&w=200&auto=format&fit=crop";
              const refererVal = "https://tv.roarzone.net/";
              const originVal = "https://tv.roarzone.net";
              const genreSuffix = item.group ? ` [${item.group.toUpperCase()}]` : "";
              const name = `${item.name || `RoarZone CL ${index + 1}`}${genreSuffix}`;

              return {
                id: String(item.id || `roarzone-${index}`),
                name: name,
                logo: logoUrl,
                link: streamUrl,
                referer: item.referer || item.headers?.Referer || refererVal,
                origin: item.origin || item.headers?.Origin || originVal,
                isRoarZone: true
              };
            }).filter((c: any) => c.link);
          }
        } catch (roarErr) {
          console.error("Direct RoarZone fallback fetch failed:", roarErr);
        }

        let footballHDChannels: any[] = [];
        const m3uPlaylists = [
          "https://raw.githubusercontent.com/sportlive18/Sonyliv-Playlist-Autoupdate/refs/heads/main/sonyliv.m3u",
          "https://raw.githubusercontent.com/srhady/tapmad-bd/refs/heads/main/tapmad_bd.m3u"
        ];

        let channelIndex = 0;
        for (const url of m3uPlaylists) {
          try {
            const fbResponse = await fetch(url);
            if (fbResponse.ok) {
              const text = await fbResponse.text();
              const lines = text.split(/\r?\n/);
              let currentItem: any = null;

              const finalizeCurrentItem = () => {
                if (currentItem && currentItem.name && currentItem.urls && currentItem.urls.length > 0) {
                  const urls = currentItem.urls;
                  currentItem.link = urls[0];
                  if (urls.length > 1) {
                    currentItem.link2 = urls[1];
                  }
                  if (urls.length > 2) {
                    currentItem.link3 = urls[2];
                  }

                  currentItem.id = currentItem.tvgId ? `football-m3u-${currentItem.tvgId}-${channelIndex}` : `football-m3u-${channelIndex}`;

                  if (!currentItem.logo) {
                    currentItem.logo = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=200&auto=format&fit=crop";
                  }

                  currentItem.referer = currentItem.optReferer || "https://executeandship.com/";
                  currentItem.origin = currentItem.optOrigin || "https://executeandship.com";
                  if (currentItem.optUa) {
                    currentItem.ua = currentItem.optUa;
                  }

                  if (currentItem.link2) {
                    currentItem.referer2 = currentItem.optReferer || "https://executeandship.com/";
                    currentItem.origin2 = currentItem.optOrigin || "https://executeandship.com";
                    if (currentItem.optUa) currentItem.ua2 = currentItem.optUa;
                  }

                  if (currentItem.link3) {
                    currentItem.referer3 = currentItem.optReferer || "https://executeandship.com/";
                    currentItem.origin3 = currentItem.optOrigin || "https://executeandship.com";
                    if (currentItem.optUa) currentItem.ua3 = currentItem.optUa;
                  }

                  currentItem.status = "LIVE";
                  footballHDChannels.push(currentItem);
                  channelIndex++;
                }
                currentItem = null;
              };

              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                if (line.startsWith("#EXTINF:")) {
                  finalizeCurrentItem();

                  currentItem = {
                    isFootballHDZone: true,
                    group: "Football",
                    urls: [],
                    optReferer: "",
                    optOrigin: "",
                    optUa: ""
                  };

                  // Extract tvg-logo
                  const logoMatch = line.match(/tvg-logo=["']([^"']+)["']/i);
                  if (logoMatch) {
                    currentItem.logo = logoMatch[1];
                  }

                  // Extract group-title
                  const groupMatch = line.match(/group-title=["']([^"']+)["']/i);
                  if (groupMatch) {
                    currentItem.group = groupMatch[1];
                  }

                  // Extract tvg-id
                  const idMatch = line.match(/tvg-id=["']([^"']+)["']/i);
                  if (idMatch) {
                    currentItem.tvgId = idMatch[1];
                  }

                  // Get the display name (after the last comma)
                  const commaIndex = line.lastIndexOf(",");
                  if (commaIndex !== -1) {
                    currentItem.name = line.substring(commaIndex + 1).trim();
                  } else {
                    currentItem.name = `M3U Channel ${channelIndex + 1}`;
                  }
                } else if (line.startsWith("#EXTVLCOPT:")) {
                  if (currentItem) {
                    const opt = line.substring("#EXTVLCOPT:".length).trim();
                    const eqIdx = opt.indexOf("=");
                    if (eqIdx !== -1) {
                      const key = opt.substring(0, eqIdx).toLowerCase().trim();
                      const val = opt.substring(eqIdx + 1).trim();
                      if (key === "http-client-referrer" || key === "http-referrer" || key === "referer") {
                        currentItem.optReferer = val;
                      } else if (key === "http-user-agent" || key === "user-agent") {
                        currentItem.optUa = val;
                      } else if (key === "http-origin" || key === "origin") {
                        currentItem.optOrigin = val;
                      }
                    }
                  }
                } else if (line.startsWith("#")) {
                  // Comments end the previous channel
                  finalizeCurrentItem();
                } else {
                  // This is the stream URL
                  if (currentItem) {
                    currentItem.urls.push(line);
                  }
                }
              }
              finalizeCurrentItem();
            }
          } catch (fbErr) {
            console.error(`Direct fallback fetch failed for ${url}:`, fbErr);
          }
        }

        let smCricChannels: any[] = [];
        try {
          const smResponse = await fetch(
            "https://raw.githubusercontent.com/sm-monirulislam/CricHD-Auto-Update-Playlist/main/crichd_data.json"
          );
          if (smResponse.ok) {
            const smData: any = await smResponse.json();
            if (smData && Array.isArray(smData.response)) {
              smCricChannels = smData.response;
            } else if (Array.isArray(smData)) {
              smCricChannels = smData;
            }
          }
        } catch (smErr) {
          console.error("Direct SM CricHD fallback fetch failed:", smErr);
        }

        let aynaChannels: any[] = [];
        try {
          const aynaResponse = await fetch(
            "https://raw.githubusercontent.com/sm-monirulislam/AynaOTT-auto-update-playlist/refs/heads/main/AynaOTT.json"
          );
          if (aynaResponse.ok) {
            const aynaData: any = await aynaResponse.json();
            if (aynaData && Array.isArray(aynaData)) {
              aynaChannels = aynaData;
            } else if (aynaData && Array.isArray(aynaData.response)) {
              aynaChannels = aynaData.response;
            }
          }
        } catch (aynaErr) {
          console.error("Direct AynaOTT fallback fetch failed:", aynaErr);
        }

        // Build matching maps
        const smMap = new Map<string, any>();
        for (const smChan of smCricChannels) {
          const idKey = smChan.id ? String(smChan.id).toLowerCase().trim() : "";
          if (idKey) {
            smMap.set(idKey, smChan);
          }
          const titleKey = smChan.title ? String(smChan.title).toLowerCase().trim() : "";
          if (titleKey) {
            smMap.set(titleKey, smChan);
          }
        }

        const cleanChanName = (name: string) => {
          return name.toLowerCase()
            .replace(/\[.*?\]/g, "")
            .replace(/\(.*?\)/g, "")
            .replace(/\s+/g, " ")
            .replace(/[^\w\s\u0980-\u09FF]/gi, "")
            .trim();
        };

        const stripSuffixes = (cl: string) => {
          return cl.replace(/\b(hd|sd|tv|sports|channel)\b/g, "").replace(/\s+/g, " ").trim();
        };

        const ayMap = new Map<string, any>();
        for (const item of aynaChannels) {
          const rawTitle = String(item.title || "").toLowerCase().trim();
          if (rawTitle) {
            ayMap.set(rawTitle, item);
          }
          const clTitle = cleanChanName(item.title || "");
          if (clTitle) {
            ayMap.set(clTitle, item);
            const st = stripSuffixes(clTitle);
            if (st && !ayMap.has("st:" + st)) {
              ayMap.set("st:" + st, item);
            }
          }
          const idKey = item.id ? String(item.id).toLowerCase().trim() : "";
          if (idKey) {
            ayMap.set(idKey, item);
          }
        }

        const rawCombined = [...cricChannels, ...roarZoneChannels, ...footballHDChannels];
        data = rawCombined.map((chan: any) => {
          const idKey = chan.id ? String(chan.id).toLowerCase().trim() : "";
          const nameKey = chan.name ? String(chan.name).toLowerCase().trim() : "";
          const cleanName = cleanChanName(chan.name || "");
          
          if (chan.isRoarZone) {
            // Match with AynaOTT Server 2
            let matched = ayMap.get(idKey) || ayMap.get(nameKey) || ayMap.get(cleanName);
            if (!matched && chan.name) {
              const stR = stripSuffixes(cleanName);
              if (stR && ayMap.has("st:" + stR)) {
                matched = ayMap.get("st:" + stR);
              }
            }

            if (matched && matched.url) {
              return {
                ...chan,
                link2: matched.url,
                referer2: matched.referer || "https://executeandship.com/",
                origin2: matched.origin || "https://executeandship.com"
              };
            }
          } else {
            // Match with CricHD Server 2
            let matched = smMap.get(idKey) || smMap.get(nameKey);
            
            if (!matched && chan.name) {
              matched = smMap.get(cleanName);
              if (!matched) {
                for (const smChan of smCricChannels) {
                  const cleanSmTitle = cleanChanName(smChan.title || "");
                  if (cleanSmTitle && (cleanSmTitle === cleanName || cleanName.includes(cleanSmTitle) || cleanSmTitle.includes(cleanName))) {
                    matched = smChan;
                    break;
                  }
                }
              }
            }

            if (matched && matched.url) {
              let finalLink2 = matched.url;
              try {
                if (chan.link && matched.url) {
                  const url1 = new URL(chan.link);
                  const url2 = new URL(matched.url);
                  const md5 = url1.searchParams.get("md5");
                  const expires = url1.searchParams.get("expires");
                  if (md5 && expires) {
                    url2.searchParams.set("md5", md5);
                    url2.searchParams.set("expires", expires);
                    finalLink2 = url2.toString();
                  }
                }
              } catch (e) {
                console.error("Error migrating token to Server 2 URL:", e);
              }

              return {
                ...chan,
                link2: finalLink2,
                referer2: matched.Referer || matched.referer || "https://executeandship.com/",
                origin2: matched.Origin || matched.origin || "https://executeandship.com"
              };
            }
          }
          return chan;
        });
      }

      if (Array.isArray(data) && data.length > 0) {
        const processedChannels: Channel[] = [];
        const seenIds = new Set<string>();
        
        const sanitizeDisplayName = (name: string): string => {
          if (!name) return "";
          return name
            .replace(/\[\s*(crichd|roarzone)\s*\]/gi, "")
            .replace(/\(\s*(crichd|roarzone)\s*\)/gi, "")
            .replace(/\b(crichd|roarzone)\b/gi, "")
            .replace(/\[\s*\]/g, "")
            .replace(/\(\s*\)/g, "")
            .replace(/^\s*[|:\-–—\s]+/g, "")
            .replace(/[|:\-–—\s]+\s*$/g, "")
            .replace(/\s+/g, " ")
            .trim() || name;
        };

        data.forEach((chan) => {
          if (!chan || typeof chan.id !== "string" || !chan.name) return;
          
          let uniqueId = chan.id;
          let counter = 1;
          while (seenIds.has(uniqueId)) {
            uniqueId = `${chan.id}-${counter}`;
            counter++;
          }
          seenIds.add(uniqueId);
          
          processedChannels.push({
            ...chan,
            id: uniqueId,
            name: sanitizeDisplayName(chan.name)
          });
        });

        // Sync recently updated list with any newly added/updated items on server refresh
        setChannels((prevChannels) => {
          if (prevChannels.length > 0) {
            const oldIds = new Set(prevChannels.map(c => c.id));
            const brandNewIds = processedChannels.filter(c => !oldIds.has(c.id)).map(c => c.id);
            if (brandNewIds.length > 0) {
              setRecentlyUpdatedIds((prevUpdated) => {
                const combined = [...brandNewIds, ...prevUpdated.filter(id => !brandNewIds.includes(id))].slice(0, 40);
                try {
                  localStorage.setItem("ireentv_recently_updated", JSON.stringify(combined));
                } catch (e) {
                  console.warn(e);
                }
                return combined;
              });
            }
          }
          return processedChannels;
        });

        setLastSyncTime(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

        // Default populate recently updated ids with the last 15 channels if none exist yet
        try {
          const saved = localStorage.getItem("ireentv_recently_updated");
          if (!saved && processedChannels.length > 0) {
            const newest = processedChannels.slice(-15).reverse().map(c => c.id);
            setRecentlyUpdatedIds(newest);
            localStorage.setItem("ireentv_recently_updated", JSON.stringify(newest));
          }
        } catch (e) {
          console.warn("Could not load default recently updated items:", e);
        }
        
        // Auto-select first channel on clean load if none active
        if (processedChannels.length > 0) {
          setActiveChannel((prev) => {
            if (!prev) return processedChannels[0];
            const matched = processedChannels.find((c) => c.name === prev.name || c.id === prev.id);
            return matched || processedChannels[0];
          });
        }
      } else {
        throw new Error("Invalid playlist data or no channels found");
      }
    } catch (err: any) {
      console.error("Error loading:", err);
      setErrorMsg("Failed to load channel streams. Please verify connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Dynamic filter lists for specific category browsing or search queries
  const filteredChannels = useMemo(() => {
    return channels.filter((chan) => {
      // 1. Search filter
      const matchesSearch = 
        chan.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        chan.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // 2. Category selection classification
      if (activeCategory === "All") return true;
      if (activeCategory === "Favorites") return favoriteIds.includes(chan.id);
      
      return matchCategory(chan, activeCategory, favoriteIds);
    });
  }, [channels, searchTerm, activeCategory, favoriteIds]);

  // Pre-split lists strictly for Netflix highlight-row sliders in Homepage
  const roarZoneChannels = useMemo(() => channels.filter(c => c.isRoarZone), [channels]);
  const footballHDZoneChannels = useMemo(() => channels.filter(c => c.isFootballHDZone), [channels]);
  const premiumSportsChannels = useMemo(() => channels.filter(c => matchCategory(c, "Premium Sports")), [channels]);
  const banglaChannels = useMemo(() => channels.filter(c => matchCategory(c, "Bangla")), [channels]);
  const documentaryChannels = useMemo(() => channels.filter(c => matchCategory(c, "Documentary")), [channels]);
  const internationalNewsChannels = useMemo(() => channels.filter(c => matchCategory(c, "International News")), [channels]);
  const entertainmentHindiChannels = useMemo(() => channels.filter(c => matchCategory(c, "Entertainment Hindi")), [channels]);
  const musicChannels = useMemo(() => channels.filter(c => matchCategory(c, "Music")), [channels]);
  const kidsChannels = useMemo(() => channels.filter(c => matchCategory(c, "Kids")), [channels]);
  const moviesChannels = useMemo(() => channels.filter(c => matchCategory(c, "Movies")), [channels]);
  const favoriteChannels = useMemo(() => channels.filter(c => favoriteIds.includes(c.id)), [channels, favoriteIds]);

  // Sort channels for "Recent Update Channels" row
  const recentUpdateChannels = useMemo(() => {
    if (channels.length === 0) return [];
    
    // Sort channels: those in recentlyUpdatedIds come first, in the order they appear in recentlyUpdatedIds.
    // If not in recentlyUpdatedIds, keep their original order (or reversed to show newer items).
    const map = new Map<string, number>();
    recentlyUpdatedIds.forEach((id, idx) => {
      map.set(id, idx);
    });

    const sortedByRecency = [...channels].sort((a, b) => {
      const indexA = map.has(a.id) ? map.get(a.id)! : Infinity;
      const indexB = map.has(b.id) ? map.get(b.id)! : Infinity;
      
      if (indexA !== Infinity || indexB !== Infinity) {
        return indexA - indexB;
      }
      
      // Default: show newest database streams first
      return channels.indexOf(b) - channels.indexOf(a);
    });
    
    return sortedByRecency;
  }, [channels, recentlyUpdatedIds]);

  // Dynamic next-up list for theater sidebar matching the channel's source category
  const sidebarChannels = useMemo(() => {
    if (playingCategory === "RoarZone") {
      return channels.filter(c => c.isRoarZone);
    }
    if (playingCategory === "FootballHDZone") {
      return channels.filter(c => c.isFootballHDZone);
    }
    if (playingCategory === "All") {
      return channels;
    }
    if (playingCategory === "Favorites") {
      return channels.filter(c => favoriteIds.includes(c.id));
    }
    return channels.filter(c => matchCategory(c, playingCategory as Category, favoriteIds));
  }, [channels, playingCategory, favoriteIds]);

  const handlePlayChannel = (channel: Channel, category: Category | "RoarZone" | "All" | "Favorites" | "RecentUpdate" = "All") => {
    setActiveChannel(channel);
    setPlayingCategory(category === "RecentUpdate" ? "All" : category);
    setIsPlaying(true);
    markChannelAsUpdated(channel.id);
    // Smooth scroll to top of viewport
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans antialiased pb-20 selection:bg-[#E50914] selection:text-white">
      
      {/* Cinematic faint red glow behind app element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] bg-[#E50914]/5 rounded-full filter blur-[150px] pointer-events-none -z-10" />

      {/* NETFLIX NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-zinc-900/60 px-4 py-3 sm:py-4 md:px-12 transition-all">
        <div className="w-full flex items-center justify-between gap-4">
          
          {/* Left: Brand logo & Netflix links */}
          <div className="flex items-center gap-6 sm:gap-10">
            {/* Logo */}
            <div 
              onClick={() => { setActiveCategory("All"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tighter text-[#E50914] select-none uppercase transform transition-transform group-hover:scale-105 active:scale-95 duration-200">
                IreenTV
              </h1>
              <span className="px-1.5 py-0.5 bg-red-650 text-white text-[8px] font-black tracking-widest rounded-sm uppercase scale-90 shadow-[0_0_8px_rgba(229,10,20,0.5)]">
                PRO
              </span>
            </div>

            {/* Premium Navigation Links (Desktop Row Layout with compact text size) */}
            <nav className="hidden xl:flex items-center gap-4 text-xs font-semibold text-zinc-400">
              <button 
                onClick={() => { setActiveCategory("All"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "All" && !isPlaying && !forceAllGridView ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                Home
              </button>
              <button 
                onClick={() => { setActiveCategory("All"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(true); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "All" && !isPlaying && forceAllGridView ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                All Live TV
              </button>
              <button 
                onClick={() => { setActiveCategory("Premium Sports"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "Premium Sports" && !isPlaying ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                Premium Sports
              </button>
              <button 
                onClick={() => { setActiveCategory("FootballHDZone"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "FootballHDZone" && !isPlaying ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                Live Sports HD
              </button>
              <button 
                onClick={() => { setActiveCategory("Bangla"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "Bangla" && !isPlaying ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                Bangla Channels
              </button>
              <button 
                onClick={() => { setActiveCategory("Documentary"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "Documentary" && !isPlaying ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                Documentaries
              </button>
              <button 
                onClick={() => { setActiveCategory("International News"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "International News" && !isPlaying ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                International News
              </button>
              <button 
                onClick={() => { setActiveCategory("Entertainment Hindi"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "Entertainment Hindi" && !isPlaying ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                Entertainment Hindi
              </button>
              <button 
                onClick={() => { setActiveCategory("Music"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "Music" && !isPlaying ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                Melodic Music
              </button>
              <button 
                onClick={() => { setActiveCategory("Kids"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "Kids" && !isPlaying ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                Kids
              </button>
              <button 
                onClick={() => { setActiveCategory("Movies"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeCategory === "Movies" && !isPlaying ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                Movies
              </button>
              <button 
                onClick={() => { setActiveCategory("Favorites"); setSearchTerm(""); setIsPlaying(false); setForceAllGridView(false); }}
                className={`transition-colors hover:text-white cursor-pointer flex items-center gap-1 ${activeCategory === "Favorites" && !isPlaying ? "text-white font-bold border-b-2 border-[#E50914] pb-1" : ""}`}
              >
                <Heart className="w-3 h-3 fill-[#E50914] text-[#E50914]" />
                My List ({favoriteIds.length})
              </button>
            </nav>
          </div>

          {/* Right: Search, Refresh and profile */}
          <div className="flex items-center gap-4 shrink-0">
            
            {/* Interactive Netflix Search */}
            <div className={`hidden md:flex relative items-center bg-zinc-900 border ${isSearchExpanded || searchTerm ? 'border-zinc-750 w-[180px] sm:w-[260px]' : 'border-transparent w-auto'} rounded-full px-3 py-1.5 transition-all duration-300`}>
              <Search 
                className="w-4 h-4 text-zinc-400 cursor-pointer hover:text-white shrink-0" 
                onClick={() => setIsSearchExpanded(prev => !prev)}
              />
              {(isSearchExpanded || searchTerm) && (
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value) {
                      setIsPlaying(false);
                      setForceAllGridView(false);
                    }
                  }}
                  placeholder="Search streams..."
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-xs text-white pl-2 pr-1"
                  autoFocus
                />
              )}
              {searchTerm && (
                <X 
                  className="w-3.5 h-3.5 text-zinc-400 hover:text-white cursor-pointer shrink-0 ml-1"
                  onClick={() => { setSearchTerm(""); setIsSearchExpanded(false); }}
                />
              )}
            </div>

            {/* Force Refresh Button */}
            <button
              onClick={loadChannels}
              disabled={loading}
              className="hidden md:block p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-[#E50914] border border-zinc-850 cursor-pointer disabled:opacity-40 transition-colors"
              title="Refresh channel streams"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin text-[#E50914]" : ""}`} />
            </button>

            {/* Download App Button with popup triggers */}
            <button
              onClick={() => setShowDownloadModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-[#E50914] hover:bg-red-700 text-white text-[10px] sm:text-xs font-bold transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-red-900/40 select-none shrink-0"
              title="Download IreenTV Apps or Install PWA"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download App</span>
            </button>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2 group cursor-pointer relative pb-1">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 via-[#E50914] to-[#E50914] flex items-center justify-center text-white text-xs font-black shadow-md border border-neutral-850">
                <User className="w-4 h-4" />
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />

              {/* Profile dropdown */}
              <div className="absolute right-0 top-full pt-2 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <div className="bg-[#181818] border border-zinc-800 rounded-lg p-3 shadow-2xl min-w-[200px] text-xs space-y-2">
                  <div className="text-zinc-400 border-b border-zinc-900 pb-2 truncate font-mono">
                    ireentvofficial@gmail.com
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Gateway Proxy Connected
                  </div>
                  {lastSyncTime && (
                    <div className="text-zinc-500 font-sans text-[10px]">
                      Last Checked: {lastSyncTime}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Categories Mobile Toggle list */}
        <div className="xl:hidden flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pt-3 border-t border-zinc-900/60 mt-2 pb-1">
          {[
            { key: "All", name: "Home" },
            { key: "AllLiveTV", name: "All Live TV" },
            { key: "Premium Sports", name: "Sports" },
            { key: "FootballHDZone", name: "Live Sports HD" },
            { key: "Bangla", name: "Bangla" },
            { key: "Documentary", name: "Documentaries" },
            { key: "International News", name: "News" },
            { key: "Entertainment Hindi", name: "Hindi" },
            { key: "Music", name: "Music" },
            { key: "Kids", name: "Kids" },
            { key: "Movies", name: "Movies" },
            { key: "Favorites", name: `My List (${favoriteIds.length})` }
          ].map(tab => {
            const isTabActive = tab.key === "AllLiveTV"
              ? (activeCategory === "All" && forceAllGridView)
              : (activeCategory === tab.key && !isPlaying && (tab.key !== "All" || !forceAllGridView));
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === "AllLiveTV") {
                    setActiveCategory("All");
                    setForceAllGridView(true);
                  } else {
                    setActiveCategory(tab.key as Category);
                    setForceAllGridView(false);
                  }
                  setSearchTerm("");
                  setIsPlaying(false);
                }}
                className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-all ${
                  isTabActive
                    ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/25 scale-[1.03]"
                    : "bg-zinc-900/80 text-zinc-400 border border-zinc-850 hover:text-white"
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Mobile Search & Refresh Bar (Only on mobile/tablet widths) */}
        <div className="md:hidden flex items-center gap-3 pt-3 border-t border-zinc-900/60 mt-3 pb-0.5">
          {/* Mobile Search input with search icon */}
          <div className="relative flex-grow flex items-center bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 transition-all">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value) {
                  setIsPlaying(false);
                  setForceAllGridView(false);
                }
              }}
              placeholder="Search streams..."
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-xs text-white pl-2 pr-1"
            />
            {searchTerm && (
              <X 
                className="w-4 h-4 text-zinc-400 hover:text-white cursor-pointer shrink-0 ml-1"
                onClick={() => setSearchTerm("")}
              />
            )}
          </div>

          {/* Mobile Force Refresh Button */}
          <button
            onClick={loadChannels}
            disabled={loading}
            className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-[#E50914] border border-zinc-850 cursor-pointer disabled:opacity-40 transition-colors shrink-0"
            title="Refresh channel streams"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin text-[#E50914]" : ""}`} />
          </button>
        </div>
      </header>



      {/* STATIC DEPLOYMENT CORS EXPLANATION PANEL */}
      {isStaticMode && (
        <div className="w-full px-4 md:px-12 mt-4 select-text">
          <div className="bg-[#1c1912] border border-amber-600/35 p-3.5 sm:p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs md:text-sm text-amber-300 shadow-xl">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1 px-2 bg-amber-650 text-amber-100 bg-amber-600/20 text-[9px] border border-amber-500/25 font-black rounded uppercase font-sans tracking-wide">
                  STATIC SERVER NOTICE
                </span>
                <span className="text-[10px] text-amber-500/80 font-mono font-semibold">
                  Detected Environment: Cloudflare Pages (No Server Backend)
                </span>
              </div>
              <p className="font-sans leading-relaxed text-zinc-300 text-xs mt-1.5">
                আপনার ক্লোডফ্লেয়ার (Cloudflare Pages) স্ট্যাটিক সার্ভার ডিপ্লয়মেন্টে সরাসরি চ্যানেল প্লে করার জন্য ব্রাউজারে একটি 
                <span className="text-amber-400 font-bold"> "Allow CORS" </span> 
                এক্সটেনশন চালু করতে হবে, অথবা প্লেয়ারের নিচে <span className="text-amber-400 font-bold">"Direct" মোড</span> সিলেক্ট করে প্লে করুন। পূর্ণাঙ্গ স্মুথ ডাইন্যামিক প্রক্সি স্ট্রিমিং ও বাফারিং-ফ্রি চ্যানেল প্লেব্যাক ধরে রাখতে অ্যাপটি <span className="text-white underline decoration-amber-400 font-black">Render, Koyeb বা Railway</span> হোস্ট প্ল্যাটফর্মে Express companion ব্যাকএন্ড দিয়ে ডিপ্লয় করুন।
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <a 
                href="https://chromewebstore.google.com/search/allow%20cors" 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-750 text-black font-extrabold rounded-lg text-xs transition-all pointer-events-auto shadow-md"
              >
                CORS Extension খোজেন
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <main className="w-full px-4 md:px-12 py-6">
        
        {/* ALERTS DISPLAY */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-650/10 border border-red-500/25 rounded-xl flex items-center gap-3.5 text-red-300 font-sans text-sm shadow-lg">
            <Wifi className="w-5 h-5 text-red-500 shrink-0" />
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>{errorMsg}</span>
              <button
                onClick={loadChannels}
                className="px-4 py-1.5 bg-[#E50914] hover:bg-red-700 text-white font-medium rounded-lg text-xs transition-all shrink-0 cursor-pointer"
              >
                Reload Catalog
              </button>
            </div>
          </div>
        )}

        {/* VIEW CONDITIONAL LOGIC */}
        {loading ? (
          /* CINEMATIC SPINNER SCREEN */
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-[#E50914] animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white px-2">
                NETFLIX
              </div>
            </div>
            <p className="font-sans text-zinc-400 tracking-wide text-xs sm:text-sm animate-pulse">
              Buffering global live streams, please wait...
            </p>
          </div>
        ) : isPlaying && activeChannel ? (
          
          /* =========================================
             IMMERSIVE SEPARATE PLAYER PAGE / VIEW
             ========================================= */
          <div className="space-y-6">
            
            {/* Player Breadcrumb/Back Controls */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <button
                onClick={() => setIsPlaying(false)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-[#E50914] border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <X className="w-4 h-4" />
                <span>Back to Directory</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 text-zinc-400 text-[11px] font-semibold tracking-wider font-mono uppercase bg-black/35 px-3 py-1.5 rounded-lg border border-zinc-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active: HD Gateway CDN
              </div>
            </div>

            {/* TWO-COLUMN THEATER LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Column 1: Cinematic Video Player Frame (Col Span 8) */}
              <div className="lg:col-span-8 space-y-5">
                
                {/* Visual player holder */}
                <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-[0_12px_44px_rgba(0,0,0,0.8)] relative">
                  <div className="p-1 sm:p-2 bg-zinc-900/40">
                    <VideoPlayer 
                      channel={activeChannel} 
                      isStaticMode={isStaticMode} 
                      onClose={() => setIsPlaying(false)} 
                    />
                  </div>
                </div>

                {/* Stream Description & Quick actions Card */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-[#E50914]/5 rounded-full filter blur-[100px] pointer-events-none -z-10" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4 mb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#E50914]/15 border border-[#E50914]/35 text-[#E50914] text-[9.5px] font-black uppercase rounded tracking-wider">
                          THEATER SOURCE
                        </span>
                        <span className="flex items-center gap-1 text-green-550 font-sans text-xs font-semibold">
                          <Wifi className="w-3.5 h-3.5 animate-pulse" />
                          Live Connected
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase font-display">
                        {activeChannel.name}
                      </h2>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => toggleFavorite(activeChannel.id, e)}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                          favoriteIds.includes(activeChannel.id)
                            ? "bg-amber-600/10 border-amber-500/35 text-amber-400"
                            : "bg-zinc-900 hover:bg-zinc-855 border-zinc-800 text-zinc-300 hover:text-white"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${favoriteIds.includes(activeChannel.id) ? "fill-amber-500 text-amber-500" : ""}`} />
                        {favoriteIds.includes(activeChannel.id) ? "In Your List" : "Add to My List"}
                      </button>
                    </div>
                  </div>

                  {/* Metadata spec specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs text-zinc-400">
                    <div className="space-y-2 bg-black/20 p-3 rounded-xl border border-zinc-900">
                      <p className="flex justify-between items-center">
                        <span className="text-zinc-500">Stream Resource Identifier:</span>
                        <span className="font-mono text-[11px] text-zinc-300 font-bold">{activeChannel.id}</span>
                      </p>
                    </div>
                    
                    <div className="space-y-2 bg-black/20 p-3 rounded-xl border border-zinc-900">
                      <p className="flex justify-between items-center">
                        <span className="text-zinc-500">BDIX Optimized Check:</span>
                        <span className="text-emerald-500 font-bold uppercase text-[10px] tracking-wider">Yes (Active)</span>
                      </p>
                    </div>
                  </div>

                  {/* Guide text */}
                  <div className="p-4 bg-[#141414] border border-[#E50914]/20 rounded-xl space-y-2 text-xs mt-4">
                    <h4 className="font-bold text-white flex items-center gap-1.5 font-sans">
                      <Sparkles className="w-4 h-4 text-[#E50914]" />
                      Streaming Troubleshooting Guide:
                    </h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      If the stream undergoes any buffer loops, click the stream proxy toggles in the player bar above. This alternates between <span className="text-[#E50914] font-bold">Proxy Server Routing</span> and <span className="text-[#E50914] font-bold">Direct Streaming pipelines</span>, instantly bypassing most common browser CORS restrictions!
                    </p>
                  </div>

                </div>

              </div>
              
              {/* Column 2: PLAY VERTICAL SIDEBAR PLAYLIST (Col Span 4) */}
              <div className="lg:col-span-4 space-y-4">
                
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col shadow-xl">
                  {/* Sidebar Header */}
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                    <div className="space-y-0.5">
                      <span className="text-[#E50914] text-[9px] font-black uppercase tracking-widest block">
                        Up Next Playing List
                      </span>
                      <h3 className="text-sm font-black text-white tracking-wide uppercase font-display italic">
                        {playingCategory === "All" 
                          ? "All Channels Directory" 
                          : playingCategory === "Favorites"
                          ? "My Favorites"
                          : playingCategory === "RoarZone"
                          ? "RoarZone VIP"
                          : `${playingCategory} Channels`
                        }
                      </h3>
                    </div>
                    <span className="px-2 py-1 bg-zinc-900 text-[#E50914] text-[10px] font-black rounded-lg border border-zinc-850">
                      {sidebarChannels.length} Streams
                    </span>
                  </div>

                  {/* Sidebar vertical lists */}
                  <div className="max-h-[585px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar scroll-smooth">
                    {sidebarChannels.slice(0, 150).map((chan) => {
                      const isCurrent = activeChannel.id === chan.id;
                      return (
                        <div
                          key={chan.id}
                          onClick={() => {
                            setActiveChannel(chan);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border duration-200 group/sidebar ${
                            isCurrent
                              ? "bg-[#E50914]/10 border-[#E50914]/35 shadow-md animate-pulse"
                              : "bg-zinc-900/50 border-zinc-855/60 hover:bg-zinc-850 hover:border-zinc-750"
                          }`}
                        >
                          {/* Logo container */}
                          <div className="relative w-16 aspect-video rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center p-1 border border-zinc-900 shrink-0">
                            {chan.logo ? (
                              <img
                                src={chan.logo}
                                alt=""
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const fallback = target.nextSibling as HTMLDivElement;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                                className="max-w-full max-h-full object-contain filter drop-shadow-sm transition-transform duration-300 group-hover/sidebar:scale-105"
                              />
                            ) : null}

                            {/* Text Fallback */}
                            <div
                              className="hidden absolute inset-0 bg-zinc-800 text-zinc-300 font-extrabold text-[10px] items-center justify-center font-sans tracking-wide z-10"
                              style={{ display: chan.logo ? "none" : "flex" }}
                            >
                              {chan.name.slice(0, 3).toUpperCase()}
                            </div>

                            {isCurrent && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-25">
                                <span className="w-2 h-2 rounded-full bg-[#E50914] animate-ping"></span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-xs font-bold truncate transition-colors duration-150 ${isCurrent ? "text-[#E50914] font-extrabold" : "text-zinc-200 group-hover/sidebar:text-white"}`}>
                              {chan.name}
                            </h4>

                            {chan.isFootballHDZone && (chan.teamA || chan.teamB) && (
                              <div className="flex items-center gap-1 mt-0.5 text-[9px] text-zinc-400">
                                <span className="truncate max-w-[65px]">{chan.teamA || "Team A"}</span>
                                <span className="text-zinc-600 text-[8px] font-extrabold">VS</span>
                                <span className="truncate max-w-[65px]">{chan.teamB || "Team B"}</span>
                              </div>
                            )}

                            {chan.isFootballHDZone && chan.startTime && (
                              <div className="text-[8px] font-mono text-zinc-500 mt-0.5 truncate">
                                🕒 {chan.startTime}
                              </div>
                            )}

                            {(chan.link2 || chan.link3) && (
                              <div className="text-[8.5px] bg-[#E50914]/10 border border-[#E50914]/20 text-[#E50914] px-1.5 py-0.5 rounded font-sans font-bold inline-block mt-0.5 tracking-wider uppercase">
                                {chan.link3 ? "3 Servers" : "2 Servers"}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-1 min-w-0">
                              <span className="text-[9px] text-zinc-500 font-mono uppercase truncate max-w-[80px]">
                                {chan.isFootballHDZone ? "Football" : "Live TV"}
                              </span>
                              {isCurrent ? (
                                <span className="px-1.5 py-0.5 bg-[#E50914] text-white text-[8px] font-black rounded-sm uppercase tracking-wider animate-pulse font-sans">
                                  Streaming
                                </span>
                              ) : chan.isFootballHDZone && chan.status ? (
                                <span className={`px-1 py-0.5 text-[8px] font-black rounded-sm uppercase tracking-wider ${
                                  chan.status.toLowerCase() === "live"
                                    ? "bg-red-500/20 text-red-400 border border-red-500/25"
                                    : "bg-amber-500/20 text-amber-400 border border-amber-500/25"
                                }`}>
                                  {chan.status}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[8px] text-zinc-500 font-bold font-sans">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-655 font-semibold"></span>
                                  LIVE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>

            </div>

          </div>
        ) : activeCategory === "All" && !searchTerm && !forceAllGridView ? (
          
          /* =========================================
             NETFLIX HOMEPAGE VIEWS (CAROUSEL + ROW SLIDERS)
             ========================================= */
          <div className="space-y-12">
            
            {/* Immersive Auto-sliding Sports Hero Carousel - Hidden on mobile devices */}
            <div className="hidden md:block">
              <SportsHeroCarousel
                channels={channels}
                onPlayChannel={handlePlayChannel}
                onSetSearchTerm={setSearchTerm}
                onSelectCategory={setActiveCategory}
              />
            </div>
            
            {/* Quick stats panel */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-zinc-200">
                  Global Live Streaming Directory (Auto-Updating 24/7 Server)
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
                  Synchronized dynamically with secure API databases and network registries for seamless live streaming. 
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] animate-pulse shadow-[0_0_8px_#E50914]"></span>
                <span className="text-xs font-bold text-zinc-300 bg-black/60 border border-zinc-850 px-3 py-1.5 rounded-lg">
                  {channels.length} Live Streams Connected
                </span>
              </div>
            </div>

            {/* Premium Category rows sliders (Netflix Style with customized highlight categories) */}

            {/* Slider 0: Live Sports HD */}
            <RowSlider
              title="Live Sports HD"
              channels={footballHDZoneChannels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={(chan) => handlePlayChannel(chan, "FootballHDZone")}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              category="FootballHDZone"
              autoSlide={true}
              onViewAll={() => {
                setActiveCategory("FootballHDZone");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Slider 1: Recent Update Channels */}
            <RowSlider
              title="Recent Update Channels"
              channels={recentUpdateChannels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={(chan) => handlePlayChannel(chan, "RecentUpdate")}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              category="RecentUpdate"
              autoSlide={true}
              onViewAll={() => {
                setActiveCategory("All");
                setForceAllGridView(true);
                setSearchTerm("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Slider 2: Premium Sports Streaming */}
            <RowSlider
              title="Premium Sports Streaming"
              channels={premiumSportsChannels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={(chan) => handlePlayChannel(chan, "Premium Sports")}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              category="Premium Sports"
              autoSlide={true}
              onViewAll={() => {
                setActiveCategory("Premium Sports");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Slider 3: Favorite / My List (Displays only if populated!) */}
            {favoriteChannels.length > 0 && (
              <RowSlider
                title="My Favorites (My List)"
                channels={favoriteChannels}
                activeChannelId={activeChannel?.id}
                onSelectChannel={(chan) => handlePlayChannel(chan, "Favorites")}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                category="Favorites"
                autoSlide={true}
                onViewAll={() => {
                  setActiveCategory("Favorites");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}

            {/* Slider 4: Popular Bangla Channels */}
            <RowSlider
              title="Popular Bangla Channels"
              channels={banglaChannels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={(chan) => handlePlayChannel(chan, "Bangla")}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              category="Bangla"
              autoSlide={true}
              onViewAll={() => {
                setActiveCategory("Bangla");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Slider 5: Documentaries */}
            <RowSlider
              title="Documentaries"
              channels={documentaryChannels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={(chan) => handlePlayChannel(chan, "Documentary")}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              category="Documentary"
              autoSlide={true}
              onViewAll={() => {
                setActiveCategory("Documentary");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Slider 6: International News Live */}
            <RowSlider
              title="International News Live"
              channels={internationalNewsChannels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={(chan) => handlePlayChannel(chan, "International News")}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              category="International News"
              autoSlide={true}
              onViewAll={() => {
                setActiveCategory("International News");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Slider 7: Entertainment Hindi */}
            <RowSlider
              title="Entertainment Hindi"
              channels={entertainmentHindiChannels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={(chan) => handlePlayChannel(chan, "Entertainment Hindi")}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              category="Entertainment Hindi"
              autoSlide={true}
              onViewAll={() => {
                setActiveCategory("Entertainment Hindi");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Slider 8: Melodic Music Streams */}
            <RowSlider
              title="Melodic Music Streams"
              channels={musicChannels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={(chan) => handlePlayChannel(chan, "Music")}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              category="Music"
              autoSlide={true}
              onViewAll={() => {
                setActiveCategory("Music");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Slider 9: Safe Kids Entertainment */}
            <RowSlider
              title="Safe Kids Entertainment"
              channels={kidsChannels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={(chan) => handlePlayChannel(chan, "Kids")}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              category="Kids"
              autoSlide={true}
              onViewAll={() => {
                setActiveCategory("Kids");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Slider 10: Movies & Cinema */}
            <RowSlider
              title="Movies & Cinema"
              channels={moviesChannels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={(chan) => handlePlayChannel(chan, "Movies")}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              category="Movies"
              autoSlide={true}
              onViewAll={() => {
                setActiveCategory("Movies");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

          </div>
        ) : (
          
          /* =========================================
             NETFLIX CATEGORY BROWSE VIEW / GRID EXPLORER
             (Displays on Specific Category Tab clicks or Search Queries)
             ========================================= */
          <div className="space-y-6">
            
            {/* Immersive Sub-Category Header Label */}
            <div className="border-b border-zinc-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[#E50914] text-xs font-black tracking-widest uppercase block mb-1">
                  Browse Catalog
                </span>
                <h2 className="font-display font-black text-2xl md:text-3.5xl text-white italic tracking-tight uppercase flex items-center gap-3">
                  <LayoutGrid className="w-6 h-6 text-[#E50914]" />
                  {searchTerm 
                    ? `Search results for: "${searchTerm}"` 
                    : activeCategory === "Favorites" 
                    ? "My Favorites (My List)" 
                    : activeCategory === "Premium Sports" 
                    ? "Premium Sports Streaming" 
                    : activeCategory === "Bangla" 
                    ? "Popular Bangla Streams" 
                    : activeCategory === "Documentary" 
                    ? "Documentaries & Science" 
                    : activeCategory === "International News" 
                    ? "International News Live" 
                    : activeCategory === "Entertainment Hindi" 
                    ? "Entertainment Hindi" 
                    : activeCategory === "Music" 
                    ? "Melodic Music Streams" 
                    : activeCategory === "Kids" 
                    ? "Safe Kids Entertainment"
                    : activeCategory === "Movies"
                    ? "Popular Movies & Cinema"
                    : activeCategory === "FootballHDZone"
                    ? "Live Sports HD"
                    : "All Live TV Channels"
                  }
                </h2>
                <p className="text-zinc-500 text-xs mt-1 font-sans">
                  {searchTerm 
                    ? `Found a total of ${filteredChannels.length} matching streams` 
                    : `Optimized high-speed CDN routes ready with active proxy failovers`
                  }
                </p>
              </div>

              {/* Back to all button */}
              {(activeCategory !== "All" || searchTerm || forceAllGridView) && (
                <button
                  onClick={() => {
                    setActiveCategory("All");
                    setSearchTerm("");
                    setForceAllGridView(false);
                  }}
                  className="px-4.5 py-1.5 bg-zinc-900 hover:bg-[#E50914] border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Back to Home
                </button>
              )}
            </div>

            {/* CINEMATIC CONTENT GRID */}
            {filteredChannels.length === 0 ? (
              
              /* EMPTY NETFLIX NO RESULT CONTAINER */
              <div className="flex flex-col items-center justify-center py-20 bg-zinc-950 border border-zinc-900 rounded-2xl text-center p-6 gap-3 shadow-inner">
                <Wifi className="w-12 h-12 text-zinc-750 animate-pulse" />
                <h4 className="font-display font-bold text-zinc-300 text-base">No Live Streams Found</h4>
                <p className="font-sans text-zinc-500 text-xs max-w-sm leading-relaxed">
                  No streams matched your search keywords or selection criteria. Try search query with general channel terms.
                </p>
                <button
                  onClick={() => { setActiveCategory("All"); setSearchTerm(""); setForceAllGridView(false); }}
                  className="mt-3 text-xs bg-[#E50914] hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-lg transition-all cursor-pointer"
                >
                  Reset Active Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {filteredChannels.map((chan) => {
                  const isActive = activeChannel?.id === chan.id;
                  const isFav = favoriteIds.includes(chan.id);

                  return (
                    <div
                      key={chan.id}
                      onClick={() => handlePlayChannel(chan, activeCategory)}
                      className={`flex flex-col bg-zinc-950 border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform select-none hover:scale-105 hover:-translate-y-1 active:scale-95 shadow-md relative group/grid-card ${
                        isActive
                          ? "border-[#E50914] bg-red-950/10 ring-1 ring-[#E50914]/40 shadow-lg shadow-[#E50914]/15"
                          : "border-zinc-900/80 hover:border-zinc-750 hover:bg-zinc-900"
                      }`}
                    >
                      {/* Logo Frame */}
                      <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center p-3 border-b border-zinc-900 group-hover/grid-card:bg-zinc-900 transition-colors overflow-hidden">
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
                            className="max-w-full max-h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] z-10 transition-transform duration-500 group-hover/grid-card:scale-115"
                          />
                        ) : null}

                        {/* Text Fallback */}
                        <div
                          className="hidden absolute inset-0 bg-zinc-800 text-zinc-300 font-extrabold text-sm items-center justify-center font-sans tracking-wide z-10"
                          style={{ display: chan.logo ? "none" : "flex" }}
                        >
                          {chan.name.slice(0, 3).toUpperCase()}
                        </div>

                        {/* Glow Hover Play badge */}
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/grid-card:opacity-100 transition-opacity duration-300 z-15">
                          <div className="w-9 h-9 rounded-full bg-[#E50914] flex items-center justify-center text-white shadow-lg transform scale-75 group-hover/grid-card:scale-100 transition-transform duration-300">
                            <Play className="w-4.5 h-4.5 fill-white text-white ml-0.5" />
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

                      {/* Card Meta */}
                      <div className="p-3">
                        <h4 className="font-sans font-bold text-xs sm:text-sm text-zinc-200 line-clamp-1 group-hover/grid-card:text-white">
                          {chan.name}
                        </h4>

                        {chan.isFootballHDZone && (chan.teamA || chan.teamB) && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-350 font-medium">
                            <span className="truncate max-w-[60px]">{chan.teamA || "Team A"}</span>
                            <span className="text-zinc-650 font-extrabold text-[8px]">VS</span>
                            <span className="truncate max-w-[60px]">{chan.teamB || "Team B"}</span>
                          </div>
                        )}

                        {chan.isFootballHDZone && chan.startTime && (
                          <div className="text-[9px] font-mono text-zinc-400 mt-1 flex items-center gap-1">
                            <span>🕒</span>
                            <span className="truncate max-w-[130px]">{chan.startTime}</span>
                          </div>
                        )}

                        {(chan.link2 || chan.link3) && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <span className="text-[9px] bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] px-1.5 py-0.5 rounded font-sans font-extrabold uppercase tracking-wider">
                              {chan.link3 ? "3 SERVERS" : "2 SERVERS"}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-1.5 px-0.5">
                          <span className="text-[9px] font-sans font-medium text-zinc-500 uppercase tracking-widest">
                            {chan.isFootballHDZone ? "Football Zone" : "Live TV"}
                          </span>

                          <button
                            onClick={(e) => toggleFavorite(chan.id, e)}
                            className={`p-1 text-zinc-650 hover:text-yellow-400 rounded transition-colors cursor-pointer ${
                              isFav ? "text-yellow-500 animate-pulse" : ""
                            }`}
                            title={isFav ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-yellow-500 text-yellow-500" : ""}`} />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER SERVICE */}
      <footer className="mt-24 border-t border-zinc-900 bg-black/45 py-12 w-full px-4 sm:px-12 text-center text-xs text-neutral-500 font-sans leading-relaxed">
        <div className="flex items-center justify-center gap-2 flex-wrap mb-4 text-neutral-400">
          <span className="text-[#E50914] font-black text-sm tracking-tight mr-1">IreenTV PRO</span>
          <span className="text-zinc-800">|</span>
          <button onClick={() => { setActiveCategory("All"); setSearchTerm(""); }} className="hover:text-white transition-colors cursor-pointer">Home</button>
          <span className="text-zinc-800">•</span>
          <button onClick={() => { setActiveCategory("Premium Sports"); setSearchTerm(""); }} className="hover:text-white transition-colors cursor-pointer">Live Sports</button>
          <span className="text-zinc-800">•</span>
          <button onClick={() => { setActiveCategory("Bangla"); setSearchTerm(""); }} className="hover:text-white transition-colors cursor-pointer">Bangla Streams</button>
          <span className="text-zinc-800">•</span>
          <button onClick={() => { setActiveCategory("Favorites"); setSearchTerm(""); }} className="hover:text-white transition-colors cursor-pointer">My Favorites</button>
        </div>
        
        <p className="flex items-center justify-center gap-1.5 flex-wrap">
          <span>© {new Date().getFullYear()} IreenTV. All rights reserved.</span>
          <span className="text-zinc-800">|</span>
          <span>Developer: <a href="https://anamul.pages.dev/" target="_blank" rel="noopener noreferrer" className="text-[#E50914] hover:text-red-400 font-bold hover:underline transition-colors">MD ANAMUL HOQUE</a></span>
        </p>
        <p className="mt-4 text-[10px] text-zinc-600 max-w-3xl mx-auto leading-relaxed">
          Disclaimer: This catalog application is designed as an open-source educational index connecting to publicly documented live streams and the auto-updating global API servers. We do not host, broadcast, or transmit copyrighted video metadata.
        </p>
      </footer>

      {/* DOWNLOAD MODAL POPUP */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#181818] border border-zinc-800 rounded-2xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl text-center overflow-hidden">
            {/* Red accent light effect at top */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-650 via-[#E50914] to-red-650"></div>
            
            {/* Close Button */}
            <button 
              onClick={() => setShowDownloadModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title / Header */}
            <div className="mt-2 mb-6">
              <div className="w-12 h-12 bg-[#E50914]/10 rounded-full flex items-center justify-center text-[#E50914] mx-auto mb-3">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-sans text-white">Download IreenTV App</h3>
              <p className="text-xs text-zinc-400 mt-1">Select your platform to download or install the app</p>
            </div>

            {/* Actions Grid */}
            <div className="space-y-4">
              {/* Option 1: Mobile & PC PWA Install */}
              <button
                onClick={() => {
                  setShowDownloadModal(false);
                  handleInstallPWA();
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 transition-all text-left cursor-pointer group animate-pulse-subtle"
              >
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <div className="grow">
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Install Mobile and PC</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">ইন্সটল করুন মোবাইল এবং পিসির জন্য (PWA Web App)</p>
                </div>
              </button>

              {/* Option 2: Android TV App Download */}
              <a
                href="https://github.com/lotaji/Android-Smart-TV-App/raw/refs/heads/main/HD%20TV.apk"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowDownloadModal(false)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Tv className="w-5 h-5" />
                </div>
                <div className="grow">
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Download Android TV Apps</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">স্মার্ট টিভি এবং এন্ড্রয়েড বক্সের জন্য APK ডাউনলোড করুন</p>
                </div>
              </a>
            </div>

            {/* Footer / Helper Tip */}
            <p className="text-[10px] text-zinc-500 mt-6 leading-relaxed">
              * Note: PWA installs instantly without play store. Smart TV app supports remote control navigation natively.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
