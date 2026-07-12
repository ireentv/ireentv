import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Tv, 
  AlertTriangle, 
  Loader2, 
  CheckCircle,
  HelpCircle,
  Settings,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Channel } from "../types";

interface VideoPlayerProps {
  channel: Channel | null;
  isStaticMode?: boolean;
  onClose?: () => void;
}

interface PlayQuality {
  index: number;
  height: number;
  bitrate: number;
  name?: string;
}

export default function VideoPlayer({ channel, isStaticMode = false, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionMode, setConnectionMode] = useState<"auto" | "proxy" | "direct">("auto");
  const [useProxy, setUseProxy] = useState(!isStaticMode);
  const [hasAutoFlipped, setHasAutoFlipped] = useState(false);
  const [selectedServer, setSelectedServer] = useState<number>(1);

  const getAvailableServers = useCallback((chan: Channel | null): number[] => {
    if (!chan) return [1];
    const available = [1];
    let index = 2;
    while (true) {
      const linkKey = `link${index}`;
      if (chan[linkKey]) {
        available.push(index);
        index++;
      } else {
        break;
      }
    }
    return available;
  }, []);

  const cycleConnectionMode = useCallback(() => {
    setConnectionMode((prev) => {
      if (prev === "auto") return "direct";
      if (prev === "direct") return "proxy";
      return "auto";
    });
  }, []);

  // Keep ref of isPlaying to bypass closures in setTimeout
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Synchronize useProxy whenever connectionMode, channel, selectedServer, or isStaticMode changes
  useEffect(() => {
    if (!channel) return;
    const suffix = selectedServer === 1 ? "" : String(selectedServer);
    const activeLink = (channel[`link${suffix}`] as string) || channel.link;

    const isHttp = activeLink?.startsWith("http://");

    if (isHttp) {
      setUseProxy(true);
    } else if (connectionMode === "proxy") {
      setUseProxy(true);
    } else if (connectionMode === "direct") {
      setUseProxy(false);
    } else {
      // In auto mode, we first try to play DIRECT (false). If it fails, we will flip to proxy (true)
      setUseProxy(false);
    }
  }, [connectionMode, channel, selectedServer]);

  // Reset auto-change attempts when stream source variables change
  useEffect(() => {
    setHasAutoFlipped(false);
  }, [channel, selectedServer, connectionMode]);

  // Automatic Direct/Proxy mode watchdog switcher
  useEffect(() => {
    if (connectionMode !== "auto") return;
    if (isPlaying) return; // Channel is already playing!

    // Start a watchdog timer to failover if loading takes too long
    const watchdogTimer = setTimeout(() => {
      if (!isPlayingRef.current && !hasAutoFlipped) {
        console.warn("Watchdog: Channel loading took too long without video active. Switching to proxy mode automatically...");
        setHasAutoFlipped(true);
        setUseProxy(true); // Explicitly switch to proxy mode
      }
    }, 6000); // 6 seconds threshold to try alternative streaming mode

    return () => clearTimeout(watchdogTimer);
  }, [channel, selectedServer, connectionMode, isPlaying, hasAutoFlipped]);

  // Reset auto-flip state on channel change & request automatic fullscreen on Android Smart TV
  useEffect(() => {
    setSelectedServer(1);

    // Dynamic helper to identify if the user is loading from an Android Smart TV device
    const isAndroidSmartTV = () => {
      if (typeof window === "undefined" || !navigator || !navigator.userAgent) return false;
      const ua = navigator.userAgent.toLowerCase();
      // Look for Android signature combined with tv/leanback/box/large screen signatures
      const hasAndroid = ua.includes("android") || ua.includes("googletv") || ua.includes("leanback");
      const hasTVSignature = ua.includes("tv") || 
                             ua.includes("smarttv") || 
                             ua.includes("appletv") || 
                             ua.includes("firetv") || 
                             ua.includes("box") || 
                             ua.includes("large") || 
                             ua.includes("mibox") || 
                             ua.includes("aftn") || 
                             ua.includes("aftb") || 
                             ua.includes("shield");
      return hasAndroid && hasTVSignature;
    };

    if (channel && isAndroidSmartTV()) {
      const enterTVFullscreen = () => {
        const container = containerRef.current;
        const video = videoRef.current;
        if (container) {
          if (container.requestFullscreen) {
            container.requestFullscreen()
              .then(() => setIsFullscreen(true))
              .catch((err) => {
                console.warn("TV Container Fullscreen request failed/deferred:", err);
                if (video && (video as any).webkitEnterFullscreen) {
                  try {
                    (video as any).webkitEnterFullscreen();
                    setIsFullscreen(true);
                  } catch (e) {}
                }
              });
          } else if ((container as any).webkitRequestFullscreen) {
            try {
              (container as any).webkitRequestFullscreen();
              setIsFullscreen(true);
            } catch (e) {}
          } else if (video && (video as any).webkitEnterFullscreen) {
            try {
              (video as any).webkitEnterFullscreen();
              setIsFullscreen(true);
            } catch (e) {}
          }
        }
      };

      // Slight timeout to let DOM mount completely and load the resource
      const timer = setTimeout(enterTVFullscreen, 350);
      return () => clearTimeout(timer);
    }
  }, [channel]);

  // Buffer Quality state variables
  const [levels, setLevels] = useState<PlayQuality[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(-1); // -1 means Auto (Adaptive bitrate)
  const [activeLevelIndex, setActiveLevelIndex] = useState<number>(0);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Auto-hide controls timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlayingRef.current) {
        setShowControls(false);
      }
    }, 4000);
  }, []);

  // Register isPlaying effect to handle automatic countdown when active channel starts playing
  useEffect(() => {
    if (isPlaying) {
      resetControlsTimeout();
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isPlaying, resetControlsTimeout]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Construct proxied stream URL
  const getProxiedUrl = (chan: Channel, serverNum: number) => {
    const suffix = serverNum === 1 ? "" : String(serverNum);
    const streamLink = (chan[`link${suffix}`] as string) || chan.link;
    const refVal = (chan[`referer${suffix}`] as string) || chan.referer;
    const origVal = (chan[`origin${suffix}`] as string) || chan.origin;
    const cookieVal = (chan[`cookie${suffix}`] as string) || "";
    const uaVal = (chan[`ua${suffix}`] as string) || "";
    const hostVal = (chan[`host${suffix}`] as string) || "";

    const encodedUrl = encodeURIComponent(streamLink);
    const referer = refVal ? encodeURIComponent(refVal) : "https%3A%2F%2Fexecuteandship.com%2F";
    const origin = origVal ? encodeURIComponent(origVal) : "https%3A%2F%2Fexecuteandship.com";
    
    let baseProxy = `/api/hls/stream.m3u8?url=${encodedUrl}&referer=${referer}&origin=${origin}`;
    if (cookieVal) baseProxy += `&cookie=${encodeURIComponent(cookieVal)}`;
    if (uaVal) baseProxy += `&ua=${encodeURIComponent(uaVal)}`;
    if (hostVal) baseProxy += `&host=${encodeURIComponent(hostVal)}`;
    return baseProxy;
  };

  const tryNextServer = useCallback(() => {
    if (!channel) return false;
    const available = getAvailableServers(channel);

    const currentIndex = available.indexOf(selectedServer);
    if (currentIndex !== -1 && currentIndex < available.length - 1) {
      const nextServer = available[currentIndex + 1];
      console.warn(`Server ${selectedServer} failed. Automatically falling back to Server ${nextServer}...`);
      setErrorMsg(`সার্ভার ${selectedServer} ব্যর্থ হয়েছে। সার্ভার ${nextServer}-এ অটোমেটিক রিডাইরেক্ট করা হচ্ছে...`);
      setSelectedServer(nextServer);
      return true;
    }
    return false;
  }, [channel, selectedServer, getAvailableServers]);

  const initPlayer = useCallback(() => {
    if (!channel || !videoRef.current) return;

    setErrorMsg(null);
    setIsLoading(true);
    setIsPlaying(false);
    setLevels([]);
    setCurrentLevelIndex(-1);
    setActiveLevelIndex(0);
    setShowQualityMenu(false);

    const suffix = selectedServer === 1 ? "" : String(selectedServer);
    const activeLink = (channel[`link${suffix}`] as string) || channel.link;

    if (!activeLink) {
      setIsLoading(false);
      setErrorMsg("আসন্ন ম্যাচ - সম্প্রচার এখনও শুরু হয়নি। অনুগ্রহ করে ম্যাচ সূচি অনুযায়ী যথাসময়ে পুনরায় প্লে করুন।");
      return;
    }
    // If useProxy is active, proxy stream. Otherwise play direct from browser (extremely helpful for geo-blocked streams).
    const streamUrl = useProxy ? getProxiedUrl(channel, selectedServer) : activeLink;

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;

    // Use HLS.js first for optimized MSE adaptive playback (improves Android, Chrome, Firefox, Edge performance)
    if (Hls.isSupported()) {
      // Use HLS.js
      // Highly optimized for ultra-fast startup and buffer-free live sports playback on weak connections.
      const hls = new Hls({
        maxBufferLength: 60,             // 1 Mbps speeds require longer precached buffers (increased from 20 to 60)
        maxMaxBufferLength: 120,         // Keep up to 120 secs of video in RAM during peak download bursts
        maxBufferSize: 60 * 1024 * 1024, // Allocate up to 60MB of video cache budget
        enableWorker: true,
        lowLatencyMode: false,           // Favour buffer depth/growth over low latency for 1 Mbps lines
        backBufferLength: 15,            
        fragLoadingMaxRetry: 15,         // More tolerance on weak cellular/broadband lines
        manifestLoadingMaxRetry: 15,     
        fragLoadingRetryDelay: 1000,     
        manifestLoadingRetryDelay: 1000,  
        liveSyncDurationCount: 6,        // Start 6 segments back from the live edge (increases buffer pad to absorb fluctuations)
        liveMaxLatencyDurationCount: 15, // Let player fall further behind live stream without skipping/stuttering
        abrEwmaDefaultEstimate: 90000,   // Low starting bandwidth default (90kbps) for instant, stutter-free playback start
        startLevel: -1,                  // Adaptive Bitrate enabled to pick the most reliable resolution automatically
        capLevelToPlayerSize: true,      // Conserves bandwidth by limiting high-res on smaller screens
        abrBandWidthFactor: 0.60,        // Conservative margin (40% discount) to prevent upward switches that choke 1 Mbps lines
        abrBandWidthUpFactor: 0.40,      // Requires extremely consistent high throughput before switching to HD quality
        nudgeMaxRetry: 12,               // Autorecover stuck playback fast by nudging video playhead forward
        testBandwidth: true,             
        highBufferWatchdogPeriod: 3,     
        maxBufferHole: 1.5,              // Safely bypass tiny packet/delivery dropouts up to 1.5s natively
        maxFragLookUpTolerance: 0.3,
        fragLoadingTimeOut: 20000,       // Extended timeout to support slow segment retrieval on 1 Mbps networks
        manifestLoadingTimeOut: 20000
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      let networkRetryCount = 0;
      let mediaRetryCount = 0;
      let networkRetryTimeout: NodeJS.Timeout | null = null;
      let loadingTimeout: NodeJS.Timeout | null = null;

      // Handle standard HTML5 video element events for state synchronization
      const onPlay = () => {
        setIsPlaying(true);
      };
      
      // Debounce loading indicator overlay to prevent screen flashing on minor millisecond network drops
      const onWaiting = () => {
        if (!loadingTimeout) {
          loadingTimeout = setTimeout(() => {
            setIsLoading(true);
          }, 700); // Hides unnecessary spinners during tiny buffering fluctuations
        }
      };
      
      const onPlaying = () => {
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          loadingTimeout = null;
        }
        setIsPlaying(true);
        setIsLoading(false);
      };
      
      const onCanPlay = () => {
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          loadingTimeout = null;
        }
        setIsLoading(false);
      };

      video.addEventListener("play", onPlay);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlaying);
      video.addEventListener("canplay", onCanPlay);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (hls.levels && hls.levels.length > 0) {
          const parsedLevels = hls.levels.map((lvl, idx) => ({
            index: idx,
            height: lvl.height || 0,
            bitrate: lvl.bitrate || 0,
            name: lvl.name || ""
          }));
          setLevels(parsedLevels);
          setCurrentLevelIndex(hls.currentLevel); // Index -1 means Auto by default
        } else {
          setLevels([]);
        }

        video.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      });

      // Hook up level switched event to detect and display change of playing quality in Real-time
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        if (typeof data.level === "number") {
          setActiveLevelIndex(data.level);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS.JS Error detail:", data);
        
        // Buffer Stall event occurs - let HLS.js manage recovery natively inside the browser to avoid recursive loops
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          console.warn("Buffer stall detected. Relying on HLS.js adaptive fallback and native nudging.");
        }

        if (data.fatal) {
          // If a fatal stream error occurs, and we haven't flipped connection type yet, try automatic flip (only if mode is auto)
          if (connectionMode === "auto" && !hasAutoFlipped) {
            setHasAutoFlipped(true);
            setUseProxy(true); // Explicitly switch to proxy mode
            console.warn(`Fatal HLS error (${data.type}) detected. Attempting automatic connection mode flip...`);
            return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetryCount < 5) {
                networkRetryCount++;
                console.warn(`Fatal HLS network error (attempt ${networkRetryCount}/5). Retrying stream load...`);
                setIsLoading(true);
                networkRetryTimeout = setTimeout(() => {
                  if (hlsRef.current) {
                    hlsRef.current.startLoad();
                  }
                }, networkRetryCount * 1500);
              } else {
                if (!tryNextServer()) {
                  setIsLoading(false);
                  setErrorMsg("সাময়িক কানেকশন বিচ্ছিন্নতা! অনুগ্রহ করে রিফ্রেশ বাটন প্রেস করুন বা অন্য কোনো চ্যানেল ট্রাই করুন।");
                }
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (mediaRetryCount < 5) {
                mediaRetryCount++;
                console.warn(`Fatal HLS media error (attempt ${mediaRetryCount}/5). Recovering media...`);
                setIsLoading(true);
                hls.recoverMediaError();
              } else {
                console.warn("Multiple media errors encountered. Attempting fallback server...");
                if (!tryNextServer()) {
                  mediaRetryCount = 0;
                  initPlayer();
                }
              }
              break;
            default:
              console.error("Unrecoverable HLS error type:", data.type);
              if (!tryNextServer()) {
                setIsLoading(false);
                setErrorMsg("প্লেয়ারে অভ্যন্তরীণ সমস্যা হয়েছে। অনুগ্রহ করে রিফ্রেশ করুন।");
                hls.destroy();
                hlsRef.current = null;
              }
              break;
          }
        }
      });

      return () => {
        if (networkRetryTimeout) clearTimeout(networkRetryTimeout);
        if (loadingTimeout) clearTimeout(loadingTimeout);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("canplay", onCanPlay);
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Direct playback if browser supports HLS natively (Safari / iOS)
      video.src = streamUrl;
      video.load();
      
      let nativeRetryCount = 0;
      let nativeRetryTimeout: NodeJS.Timeout | null = null;
      let nativeLoadingTimeout: NodeJS.Timeout | null = null;

      const onPlay = () => {
        if (nativeLoadingTimeout) {
          clearTimeout(nativeLoadingTimeout);
          nativeLoadingTimeout = null;
        }
        setIsPlaying(true);
        setIsLoading(false);
      };
      
      const onWaiting = () => {
        if (!nativeLoadingTimeout) {
          nativeLoadingTimeout = setTimeout(() => {
            setIsLoading(true);
          }, 700); // 700ms debounce of loader on Safari
        }
      };
      
      const onPlaying = () => {
        if (nativeLoadingTimeout) {
          clearTimeout(nativeLoadingTimeout);
          nativeLoadingTimeout = null;
        }
        setIsPlaying(true);
        setIsLoading(false);
      };
      
      const onError = () => {
        console.error("Native HTML5 video error:", video.error);
        if (connectionMode === "auto" && !hasAutoFlipped) {
          setHasAutoFlipped(true);
          setUseProxy(true); // Explicitly switch to proxy mode
          console.warn("Fatal native error detected. Attempting automatic connection mode flip...");
          return;
        }

        if (nativeRetryCount < 5) {
          nativeRetryCount++;
          console.warn(`Native playback error (attempt ${nativeRetryCount}/5). Auto-retrying...`);
          setIsLoading(true);
          nativeRetryTimeout = setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.src = streamUrl;
              videoRef.current.load();
              videoRef.current.play().then(() => {
                setIsPlaying(true);
                setIsLoading(false);
              }).catch((e) => {
                console.warn("Autoplay block or delay on native restart:", e);
                setIsPlaying(false);
                setIsLoading(false);
              });
            }
          }, 2000);
        } else {
          if (!tryNextServer()) {
            setErrorMsg("প্লেব্যাকে ত্রুটি দেখা দিয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন বা পেইজটি রিফ্রেশ করুন।");
            setIsLoading(false);
          }
        }
      };

      video.addEventListener("play", onPlay);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlaying);
      video.addEventListener("error", onError);

      // Attempt autoplay
      video.play().catch(() => {
        setIsPlaying(false);
        setIsLoading(false);
      });

      return () => {
        if (nativeRetryTimeout) clearTimeout(nativeRetryTimeout);
        if (nativeLoadingTimeout) clearTimeout(nativeLoadingTimeout);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("error", onError);
      };
    } else {
      setIsLoading(false);
      setErrorMsg("আপনার ব্রাউজারে HLS স্ট্রিমিং সাপোর্ট করে না।");
    }
  }, [channel, retryCount, useProxy, hasAutoFlipped, selectedServer, connectionMode, tryNextServer]);

  useEffect(() => {
    const cleanup = initPlayer();
    // Auto-show controls when changing channel
    setShowControls(true);
    return () => {
      if (cleanup) cleanup();
    };
  }, [channel, retryCount, useProxy, selectedServer, initPlayer, connectionMode]);

  // Video controller handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || isLoading) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
        setErrorMsg(null);
      }).catch((err) => {
        console.error("Autoplay/Play blocked:", err);
      });
    }
    resetControlsTimeout();
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (showControls) {
      setShowControls(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      resetControlsTimeout();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMute = !isMuted;
    video.muted = nextMute;
    setIsMuted(nextMute);
    if (!nextMute && volume === 0) {
      updateVolume(0.5);
    }
    resetControlsTimeout();
  };

  const updateVolume = (val: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = val;
    setVolume(val);
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
    }
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(err => {
          console.warn("Container fullscreen failed, falling back to video element:", err);
          if (video && (video as any).webkitEnterFullscreen) {
            (video as any).webkitEnterFullscreen();
          } else if (video && video.requestFullscreen) {
            video.requestFullscreen();
          }
        });
      } else if (video && (video as any).webkitEnterFullscreen) {
        try {
          (video as any).webkitEnterFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.error("webkitEnterFullscreen error:", err);
        }
      } else if (video && video.requestFullscreen) {
        video.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(err => {
          console.error("Video fullscreen error:", err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      }
    }
    resetControlsTimeout();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);

      const orientation = screen.orientation as any;
      if (isCurrentlyFullscreen) {
        // Attempt to automatically rotate to landscape orientation on mobile devices
        if (orientation && typeof orientation.lock === "function") {
          orientation.lock("landscape").catch((err: any) => {
            console.warn("Orientation lock failed/unsupported on this device/browser:", err);
          });
        } else if ((screen as any).mozLockOrientation) {
          (screen as any).mozLockOrientation("landscape");
        } else if ((screen as any).msLockOrientation) {
          (screen as any).msLockOrientation("landscape");
        }
      } else {
        // Unlock orientation back to user defaults when exiting fullscreen
        if (orientation && typeof orientation.unlock === "function") {
          try {
            orientation.unlock();
          } catch (err) {
            console.warn("Orientation unlock failed:", err);
          }
        } else if ((screen as any).mozUnlockOrientation) {
          (screen as any).mozUnlockOrientation();
        } else if ((screen as any).msUnlockOrientation) {
          (screen as any).msUnlockOrientation();
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    const video = videoRef.current;
    const handleWebKitBegin = () => {
      setIsFullscreen(true);
      // For legacy iOS WebKit presentation/entering fullscreen
      const orientation = screen.orientation as any;
      if (orientation && typeof orientation.lock === "function") {
        orientation.lock("landscape").catch(() => {});
      }
    };
    const handleWebKitEnd = () => {
      setIsFullscreen(false);
      const orientation = screen.orientation as any;
      if (orientation && typeof orientation.unlock === "function") {
        try {
          orientation.unlock();
        } catch (_) {}
      }
    };

    if (video) {
      video.addEventListener("webkitbeginfullscreen", handleWebKitBegin);
      video.addEventListener("webkitendfullscreen", handleWebKitEnd);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      if (video) {
        video.removeEventListener("webkitbeginfullscreen", handleWebKitBegin);
        video.removeEventListener("webkitendfullscreen", handleWebKitEnd);
      }
    };
  }, []);

  const handleRefresh = () => {
    setRetryCount(prev => prev + 1);
    resetControlsTimeout();
  };

  const handleQualityChange = (levelIdx: number) => {
    setCurrentLevelIndex(levelIdx);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIdx;
    }
    setShowQualityMenu(false);
    resetControlsTimeout();
  };

  const activeLevelHeight = levels.length > 0 && levels[activeLevelIndex] 
    ? `${levels[activeLevelIndex].height}p` 
    : "Auto";

  return (
    <div 
      id="video-player-root"
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-900 shadow-2xl group select-none"
    >
      {/* Actual Video Tag */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-auto cursor-pointer"
        onClick={handleVideoClick}
        playsInline
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-4 z-20">
          <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
          <p className="font-sans text-slate-300 text-sm animate-pulse">
            Loading stream, please wait...
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {errorMsg && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center gap-3 md:gap-4 z-20">
          <AlertTriangle className="w-12 h-12 md:w-16 md:h-16 text-rose-500 animate-bounce cursor-pointer shrink-0" />
          <h3 className="font-sans font-bold text-base md:text-lg text-rose-450 uppercase tracking-tight">Stream Connection Failed</h3>
          <p className="font-sans text-slate-300 text-xs md:text-sm max-w-md line-clamp-2 md:line-clamp-none">
            {errorMsg}
          </p>
          {isStaticMode && (
            <div className="text-amber-400 text-[10px] md:text-xs max-w-sm bg-[#1c1912] p-2 md:p-3 rounded-lg border border-amber-900/40 font-medium leading-relaxed leading-medium select-text shrink-0">
              ⚠️ Cloudflare Pages-এ ব্যাকএ্যান্ড সার্ভার না থাকায় প্লে করতে ব্রাউজারে "Allow CORS" এক্সটেনশন ব্রাউজ করতে পারেন, অথবা নিচে "Direct" মোড দিন। ১০০% সচল রাখতে Render-এ Express সহ ব্যাকএন্ড ডিপ্লয় করুন।
            </div>
          )}
          <div className="flex gap-2.5 md:gap-3 mt-1.5 md:mt-2 flex-wrap justify-center shrink-0">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-[#E50914] hover:bg-red-700 text-white font-sans text-xs md:text-sm font-semibold rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-red-900/30"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try Again
            </button>
            <button
              onClick={() => {
                cycleConnectionMode();
                resetControlsTimeout();
              }}
              className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans text-xs md:text-sm font-semibold rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer border border-slate-700 shadow-lg"
            >
              🔄 Mode: {connectionMode === "auto" ? `Auto (${useProxy ? "Proxy" : "Direct"})` : connectionMode === "proxy" ? "Proxy" : "Direct"}
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!channel && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center p-6 gap-4 z-10">
          <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-full text-[#E50914] animate-pulse">
            <Tv className="w-16 h-16" />
          </div>
          <h2 className="font-sans font-bold text-2xl text-slate-100">
            Welcome to IreenTV PRO
          </h2>
          <p className="font-sans text-slate-400 text-sm max-w-sm">
            Select your favorite live channel from the highlights list below to enjoy high-quality streaming instantly.
          </p>
        </div>
      )}

      {/* Custom Control Bar & Overlays */}
      <AnimatePresence>
        {channel && showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 flex flex-col justify-between p-4 z-30 pointer-events-none"
          >
            {/* Top Indicator info */}
            <div className="flex justify-between items-center w-full pointer-events-auto px-1">
              <div className="flex items-center gap-1.5 sm:gap-3">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[10px] sm:text-xs font-sans tracking-wide text-red-500 uppercase font-bold">
                  LIVE
                </span>
                <span className="text-xs sm:text-sm font-sans tracking-tight text-white font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs">
                  | {channel.name}
                </span>
              </div>

              {/* Status Indicator & Close Button */}
              <div className="flex items-center gap-2">
                <div className="text-[9px] font-sans font-medium text-zinc-400 bg-zinc-950/80 backdrop-blur-sm px-2 py-0.5 rounded border border-zinc-900/80">
                  {connectionMode === "auto" ? `Auto (${useProxy ? "Proxy" : "Direct"})` : useProxy ? "Proxy" : "Direct"}
                </div>
                {onClose && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Exit full screen before calling onClose callback
                      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
                        if (document.exitFullscreen) {
                          document.exitFullscreen().catch(() => {});
                        } else if ((document as any).webkitExitFullscreen) {
                          try {
                            (document as any).webkitExitFullscreen();
                          } catch (err) {}
                        }
                      }
                      onClose();
                    }}
                    className="p-1 sm:p-1.5 rounded-lg bg-[#E50914] text-white hover:bg-red-700 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md shadow-red-900/20"
                    title="Close Player এবং ফিরে যান"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Middle Action Ring for Play/Pause visual click */}
            <div className="flex items-center justify-center self-center pointer-events-auto">
              <button 
                onClick={togglePlay} 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-600/10 hover:bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 duration-200 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-1" />}
              </button>
            </div>

            {/* Bottom Controls Panel */}
            <div className="flex flex-col gap-2 w-full pointer-events-auto">
              <div className="flex items-center justify-between bg-zinc-950/95 backdrop-blur-md border border-zinc-900 rounded-xl px-2 py-1.5 sm:px-4 sm:py-2 gap-2">
                <div className="flex items-center gap-1.5 sm:gap-4">
                  {/* Play Button */}
                  <button
                    onClick={togglePlay}
                    className="p-1 sm:p-1.5 rounded-lg text-zinc-350 hover:text-[#E50914] hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4.5 h-4.5 sm:w-5 h-5" /> : <Play className="w-4.5 h-4.5 sm:w-5 h-5" />}
                  </button>

                  {/* Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    title="Reload Stream"
                    className="p-1 sm:p-1.5 rounded-lg text-zinc-350 hover:text-[#E50914] hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4.5 h-4.5 sm:w-5 h-5" />
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-1 sm:gap-2 group/volume">
                    <button
                      onClick={toggleMute}
                      className="p-1 sm:p-1.5 rounded-lg text-zinc-350 hover:text-[#E50914] hover:bg-zinc-900 transition-colors cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4.5 h-4.5 sm:w-5 h-5 text-rose-500" /> : <Volume2 className="w-4.5 h-4.5 sm:w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => updateVolume(parseFloat(e.target.value))}
                      className="hidden sm:block w-16 md:w-20 accent-[#E50914] h-1 bg-zinc-800 rounded-lg cursor-pointer transition-all focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1.5 sm:gap-3">
                  {/* Quality Settings Selection */}
                  {levels.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQualityMenu(!showQualityMenu);
                          resetControlsTimeout();
                        }}
                        className={`p-1 sm:p-1.5 rounded-lg text-zinc-350 hover:text-[#E50914] hover:bg-zinc-900 transition-colors flex items-center gap-1 cursor-pointer text-[10px] sm:text-xs font-sans ${
                          currentLevelIndex !== -1 ? "text-[#E50914] font-semibold" : ""
                        }`}
                        title="Change Video Resolution"
                      >
                        <Settings className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showQualityMenu ? "animate-spin" : ""}`} />
                        <span>
                          {currentLevelIndex === -1 
                            ? `Auto` 
                            : `${levels.find(l => l.index === currentLevelIndex)?.height || "Auto"}p`
                          }
                        </span>
                      </button>

                      <AnimatePresence>
                        {showQualityMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-12 right-0 bg-zinc-950/95 backdrop-blur-md border border-zinc-900 rounded-xl shadow-2xl p-2 min-w-[124px] flex flex-col gap-1 z-40 font-sans pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-2.5 py-1 text-slate-400 text-[10px] uppercase tracking-wider font-semibold border-b border-zinc-900 mb-1">
                              Quality
                            </div>
                            
                            {/* Auto level option */}
                            <button
                              onClick={() => handleQualityChange(-1)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                currentLevelIndex === -1
                                  ? "bg-[#E50914]/20 text-[#E50914]"
                                  : "text-zinc-300 hover:bg-zinc-900"
                              }`}
                            >
                              <span>Auto</span>
                              {currentLevelIndex === -1 && <CheckCircle className="w-3.5 h-3.5 text-[#E50914]" />}
                            </button>

                            {/* Specific heights option */}
                            {levels.map((lvl) => (
                              <button
                                key={lvl.index}
                                onClick={() => handleQualityChange(lvl.index)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                  currentLevelIndex === lvl.index
                                    ? "bg-[#E50914]/20 text-[#E50914]"
                                    : "text-zinc-300 hover:bg-zinc-900"
                                }`}
                              >
                                <span>{lvl.height}p</span>
                                {currentLevelIndex === lvl.index && <CheckCircle className="w-3.5 h-3.5 text-[#E50914]" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                   {/* Server Selection Toggle */}
                   {getAvailableServers(channel).length > 1 && (
                     <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shrink-0">
                       {getAvailableServers(channel).map((srvNum) => (
                         <button
                           key={srvNum}
                           onClick={() => {
                             setSelectedServer(srvNum);
                             resetControlsTimeout();
                           }}
                           className={`px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-sans font-semibold transition-all cursor-pointer ${
                             selectedServer === srvNum
                               ? "bg-[#E50914] text-white font-bold"
                               : "text-zinc-400 hover:text-white"
                           }`}
                           title={`Switch to Server ${srvNum}`}
                         >
                           Sv {srvNum}
                         </button>
                       ))}
                     </div>
                   )}

                  {/* Connection Mode Toggle */}
                  <button
                    onClick={() => {
                      cycleConnectionMode();
                      resetControlsTimeout();
                    }}
                    className={`px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-sans font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                      connectionMode === "auto"
                        ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-550/20"
                        : connectionMode === "proxy"
                        ? "bg-amber-600/10 border-amber-500/30 text-amber-400 hover:bg-amber-550/20"
                        : "bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-550/20"
                    }`}
                    title="Toggle Connection"
                  >
                    <span>{connectionMode === "auto" ? "Auto" : connectionMode === "proxy" ? "Proxy" : "Direct"}</span>
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg text-zinc-350 hover:text-[#E50914] hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    {isFullscreen ? <Minimize className="w-4.5 h-4.5 sm:w-5 h-5" /> : <Maximize className="w-4.5 h-4.5 sm:w-5 h-5 animate-pulse" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
