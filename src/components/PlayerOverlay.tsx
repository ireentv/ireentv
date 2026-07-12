import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X, Tv } from 'lucide-react';
import { Channel } from '../types';

interface PlayerOverlayProps {
  channel: Channel | null;
  onClose: () => void;
}

export default function PlayerOverlay({ channel, onClose }: PlayerOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const uiTimeoutRef = useRef<number | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);
  const watchdogTimeoutRef = useRef<number | null>(null);
  const attemptedIndicesRef = useRef<Set<number>>(new Set());

  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [reloadToggle, setReloadToggle] = useState(false);

  // Reset current URL index when the channel changes
  useEffect(() => {
    setCurrentUrlIndex(0);
    setPlaybackError(null);
    attemptedIndicesRef.current = new Set([0]);
    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (watchdogTimeoutRef.current) {
      window.clearTimeout(watchdogTimeoutRef.current);
      watchdogTimeoutRef.current = null;
    }
  }, [channel]);

  const handleServerSelect = (idx: number) => {
    if (idx === currentUrlIndex) return;
    setPlaybackError(null);
    setIsLoading(true);
    attemptedIndicesRef.current = new Set([idx]);
    setCurrentUrlIndex(idx);
  };

  // Request fullscreen and setup back/popstate history handle
  useEffect(() => {
    if (channel) {
      // Add a history state to handle physical TV back buttons or browser Back
      window.history.pushState({ isPlayerOpen: true }, '');

      const handlePopState = () => {
        onClose();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch((err) => console.warn('Exit fullscreen failed:', err));
        }
      };
    }
  }, [channel, onClose]);

  // Handle HLS stream playing
  useEffect(() => {
    if (!channel || !videoRef.current) return;

    const videoElement = videoRef.current;
    const rawUrl = channel.urls[currentUrlIndex];
    
    // Check if it is a decorated Toffee JSON stream (they have a "cookie" query parameter in App.tsx)
    let isDecoratedToffee = false;
    try {
      const urlObj = new URL(rawUrl);
      isDecoratedToffee = urlObj.searchParams.has('cookie');
    } catch (e) {
      isDecoratedToffee = false;
    }
    
    // For Toffee channels decorated with dynamic query params, proxy them normally.
    // For other clean streams, play them directly unless we are on an HTTPS page and the stream is HTTP (to prevent Mixed Content blocks).
    let url = rawUrl;
    if (isDecoratedToffee) {
      url = `/api/proxy?url=${encodeURIComponent(rawUrl)}`;
    } else {
      const isHttpsPage = window.location.protocol === 'https:';
      const isHttpStream = rawUrl.startsWith('http://');
      if (isHttpsPage && isHttpStream) {
        url = `/api/proxy?url=${encodeURIComponent(rawUrl)}&clean=true`;
      } else {
        url = rawUrl;
      }
    }

    setIsLoading(true);

    const removeEventListeners = () => {
      videoElement.removeEventListener('playing', handlePlaying);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('loadstart', handleLoadStart);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('error', handleNativeError);
    };

    const triggerFailover = (errorMessage: string) => {
      stopWatchdog();
      removeEventListeners();
      const nextIndex = (currentUrlIndex + 1) % channel.urls.length;
      if (channel.urls.length > 1 && !attemptedIndicesRef.current.has(nextIndex)) {
        attemptedIndicesRef.current.add(nextIndex);
        console.log(`Fallback: Trying next server: Server ${nextIndex + 1}`);
        setCurrentUrlIndex(nextIndex);
        setPlaybackError(`সার্ভার সংযোগে সমস্যা। সার্ভার ${nextIndex + 1} চেষ্টা করা হচ্ছে...`);
        if (errorTimeoutRef.current) {
          window.clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = window.setTimeout(() => setPlaybackError(null), 3000);
      } else {
        // All backup servers failed, or the single server failed. Let's auto-retry in 3 seconds to avoid permanent black screen freeze!
        setPlaybackError('সার্ভার সংযোগে ত্রুটি। ৩ সেকেন্ড পর পুনরায় সংযোগের চেষ্টা করা হচ্ছে...');
        setIsLoading(true);

        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        try {
          videoElement.pause();
          videoElement.removeAttribute('src');
          videoElement.load();
        } catch (e) {
          console.warn('Video element cleanup error on failover:', e);
        }

        if (errorTimeoutRef.current) {
          window.clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = window.setTimeout(() => {
          setPlaybackError(null);
          attemptedIndicesRef.current = new Set([0]);
          setCurrentUrlIndex(0);
          setReloadToggle((prev) => !prev);
        }, 3000);
      }
    };

    const startWatchdog = () => {
      if (watchdogTimeoutRef.current) {
        window.clearTimeout(watchdogTimeoutRef.current);
      }
      watchdogTimeoutRef.current = window.setTimeout(() => {
        console.warn('Watchdog timeout: Stream load taking too long. Failing over...');
        triggerFailover('সার্ভার থেকে কোনো রেসপন্স পাওয়া যাচ্ছে না। অন্য সার্ভার চেষ্টা করা হচ্ছে...');
      }, 10000); // 10 seconds loading watchdog
    };

    const stopWatchdog = () => {
      if (watchdogTimeoutRef.current) {
        window.clearTimeout(watchdogTimeoutRef.current);
        watchdogTimeoutRef.current = null;
      }
    };

    // Start watchdog right away when stream is initialized
    startWatchdog();

    const handlePlaying = () => {
      setIsLoading(false);
      stopWatchdog();
    };
    const handleWaiting = () => {
      setIsLoading(true);
    };
    const handleLoadStart = () => {
      setIsLoading(true);
      startWatchdog();
    };
    const handleCanPlay = () => {
      setIsLoading(false);
      stopWatchdog();
    };

    const handleNativeError = () => {
      console.error('Native video playback error');
      triggerFailover('সার্ভার সংযোগ বিচ্ছিন্ন হয়েছে। অন্য সার্ভার চেষ্টা করা হচ্ছে...');
    };

    videoElement.addEventListener('playing', handlePlaying);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('loadstart', handleLoadStart);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('error', handleNativeError);

    // Setup HLS
    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hlsConfig = {
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: -1,
        abrEwmaDefaultEstimate: 300000,
        capLevelToPlayerSize: true,
        maxBufferLength: 8,
        maxMaxBufferLength: 20,
        maxBufferSize: 10 * 1000 * 1000,
        liveSyncDurationCount: 4,
        liveMaxLatencyDurationCount: 15,
        manifestLoadingMaxRetry: 5,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 5,
        levelLoadingRetryDelay: 1000,
        fragLoadingMaxRetry: 5,
        fragLoadingRetryDelay: 1000,
      };

      const hlsInstance = new Hls(hlsConfig);
      hlsRef.current = hlsInstance;
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(videoElement);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play().catch((e) => console.log('Autoplay play failed:', e));
      });

      // Frag changed indicates progress in downloading and showing content
      hlsInstance.on(Hls.Events.FRAG_CHANGED, () => {
        stopWatchdog();
      });

      let networkRetryCount = 0;
      let mediaRetryCount = 0;
      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Hls network error, trying to recover...');
              if (networkRetryCount < 3) {
                networkRetryCount++;
                hlsInstance.startLoad();
              } else {
                triggerFailover('সার্ভার সংযোগ বিচ্ছিন্ন হয়েছে। অন্য সার্ভার চেষ্টা করা হচ্ছে...');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Hls media error, trying to recover...');
              if (mediaRetryCount < 3) {
                mediaRetryCount++;
                hlsInstance.recoverMediaError();
              } else {
                triggerFailover('মিডিয়া ডিকোডিংয়ে সমস্যা হচ্ছে। অন্য সার্ভার চেষ্টা করা হচ্ছে...');
              }
              break;
            default:
              console.error('Hls unrecoverable error');
              triggerFailover('সার্ভার সংযোগে ত্রুটি ঘটেছে। অন্য সার্ভার চেষ্টা করা হচ্ছে...');
              break;
          }
        }
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = url;
      const onMetadataLoaded = () => {
        videoElement.play().catch((e) => console.log('Safari playback play failed:', e));
        stopWatchdog();
      };
      videoElement.addEventListener('loadedmetadata', onMetadataLoaded);

      return () => {
        videoElement.removeEventListener('loadedmetadata', onMetadataLoaded);
        stopWatchdog();
      };
    }

    return () => {
      stopWatchdog();
      videoElement.removeEventListener('playing', handlePlaying);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('loadstart', handleLoadStart);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('error', handleNativeError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }

      try {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
      } catch (e) {
        console.warn('Video element cleanup error:', e);
      }
    };
  }, [channel, currentUrlIndex, reloadToggle]);

  // UI Auto-Fade Interaction logic
  const triggerUIReset = () => {
    if (!showUI) {
      setShowUI(true);
    }
    if (uiTimeoutRef.current) {
      window.clearTimeout(uiTimeoutRef.current);
    }
    uiTimeoutRef.current = window.setTimeout(() => {
      setShowUI(false);
    }, 5000);
  };

  useEffect(() => {
    triggerUIReset();
    return () => {
      if (uiTimeoutRef.current) window.clearTimeout(uiTimeoutRef.current);
    };
  }, [channel]);

  // Handle remote controls and back action
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!channel) return;

      triggerUIReset();

      // Escape or Backspace closes player
      if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 10009 || e.keyCode === 461) {
        e.preventDefault();
        onClose();
        return;
      }

      // TV remote navigation helper
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const activeEl = document.activeElement;
        const navItems = Array.from(overlayRef.current?.querySelectorAll('.nav-item') || []) as HTMLElement[];
        let idx = navItems.indexOf(activeEl as HTMLElement);

        if (idx === -1) {
          if (navItems.length > 0) {
            navItems[0].focus();
          }
          return;
        }

        if (e.key === 'ArrowRight' && idx < navItems.length - 1) {
          navItems[idx + 1].focus();
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          navItems[idx - 1].focus();
        } else if (e.key === 'ArrowUp') {
          // Focus the close button (index 0)
          navItems[0].focus();
        } else if (e.key === 'ArrowDown') {
          // Focus the first server button (index 1) if it exists
          if (navItems.length > 1) {
            navItems[1].focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [channel, onClose]);

  if (!channel) return null;

  return (
    <div
      ref={overlayRef}
      onMouseMove={triggerUIReset}
      onTouchStart={triggerUIReset}
      onClick={triggerUIReset}
      className="relative w-full aspect-video bg-black flex flex-col justify-center items-center overflow-hidden rounded-2xl border border-[#222] shadow-2xl animate-fade-in cursor-pointer"
    >
      {/* Custom Video Loader */}
      {(isLoading || playbackError) && (
        <div id="video-loader" className="absolute inset-0 bg-black z-[9] flex flex-col justify-center items-center p-4">
          <div className="relative w-[50px] h-[50px] rounded-full border-3 border-[rgba(0,255,204,0.1)] flex justify-center items-center mb-[15px] after:content-[''] after:absolute after:-inset-[3px] after:rounded-full after:border-3 after:border-transparent after:border-r-[#00ffcc] spin-animation filter drop-shadow-[0_0_8px_#00ffcc]">
            <div className="w-[10px] h-[10px] bg-[#00ffcc] rounded-full shadow-[0_0_12px_#00ffcc]" />
          </div>
          <div className="text-white text-[16px] font-bold mb-[3px] tracking-[0.5px] text-center select-none">
            <span className="text-[#00ffcc] drop-shadow-[0_0_10px_rgba(0,255,204,0.4)] mr-1">IreenTV</span>
            {playbackError ? 'is Reconnecting' : 'is Loading'}
          </div>
          {playbackError && (
            <div className="text-[#00ffcc] text-xs font-bold text-center px-4 py-2 bg-red-600/10 border border-red-500/20 rounded-lg max-w-[85%] mt-1 mb-2 animate-pulse select-none">
              {playbackError}
            </div>
          )}
          <div className="text-[#00ffcc] text-[20px] leading-[10px] mb-3 blink-animation select-none">...</div>
          <div className="w-[150px] h-1 bg-[#1a1a1a] rounded-sm overflow-hidden relative">
            <div className="splash-loading-fill w-[30%] h-full bg-[#00ffcc] shadow-[0_0_10px_#00ffcc] rounded-sm absolute" />
          </div>
        </div>
      )}

      {/* Close Channel Button (Top Right) */}
      <button
        id="close-btn"
        tabIndex={1}
        onClick={onClose}
        title="Close Channel"
        className={`nav-item absolute top-[15px] right-[15px] bg-[rgba(220,38,38,0.8)] text-white border border-transparent rounded-full w-[40px] h-[40px] text-[18px] cursor-pointer flex justify-center items-center outline-none transition-all duration-300 z-[12] select-none
          hover:bg-red-600 hover:scale-110 hover:shadow-[0_0_12px_rgba(220,38,38,0.6)] hover:border-white
          focus:bg-red-600 focus:scale-110 focus:shadow-[0_0_12px_rgba(220,38,38,0.6)] focus:border-white
          ${(showUI || isLoading || playbackError) ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'}
        `}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Video Stream Player */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        className="w-full h-full outline-none bg-black translate-z-0 will-change-transform pointer-events-auto"
      />

      {/* Backup Servers Selector List */}
      {channel.urls.length > 0 && (
        <div
          id="server-list"
          className={`absolute bottom-[70px] left-1/2 -translate-x-1/2 flex gap-[8px] bg-black/85 px-[15px] py-[10px] rounded-[10px] border border-[#222] flex-wrap justify-center max-w-[90%] max-h-[80px] overflow-y-auto transition-all duration-500 z-[13]
            ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}
          `}
        >
          {channel.urls.map((url, idx) => {
            const isActive = idx === currentUrlIndex;
            return (
              <button
                key={url}
                tabIndex={1}
                onClick={() => handleServerSelect(idx)}
                className={`nav-item server-btn bg-[#222] text-white border border-transparent px-[12px] py-[6px] rounded-[6px] text-xs font-bold cursor-pointer outline-none select-none
                  hover:bg-[#00ffcc] hover:text-black hover:border-white hover:scale-105 hover:shadow-[0_0_10px_#00ffcc]
                  focus:bg-[#00ffcc] focus:text-black focus:border-white focus:scale-105 focus:shadow-[0_0_10px_#00ffcc]
                  ${isActive ? 'bg-[#00ffcc]! text-black!' : ''}
                `}
              >
                Server {idx + 1}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
