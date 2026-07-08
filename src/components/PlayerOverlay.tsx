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

  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [useProxy, setUseProxy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Reset current URL index when the channel changes
  useEffect(() => {
    setCurrentUrlIndex(0);
    setUseProxy(false);
    setPlaybackError(null);
  }, [channel]);

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

    const isHttpsPage = window.location.protocol === 'https:';
    const isHttpStream = rawUrl.startsWith('http://');

    // Retrieve any custom headers parsed from the M3U for this active stream URL
    const channelHeaders = channel.headers?.[rawUrl] || {};
    const hasCustomHeaders = Object.keys(channelHeaders).length > 0;

    // Detect custom ports (non-standard ports like 8097, 8080, etc.)
    let hasCustomPort = false;
    try {
      const parsedUrl = new URL(rawUrl);
      if (parsedUrl.port && parsedUrl.port !== '80' && parsedUrl.port !== '443') {
        hasCustomPort = true;
      }
    } catch (e) {
      // ignore
    }

    // If the browser page is HTTPS and the stream is HTTP, or if it requires custom headers, or has custom ports, we must force the proxy
    const shouldForceProxy = (isHttpsPage && isHttpStream) || hasCustomHeaders || hasCustomPort;
    const activeUseProxy = useProxy || shouldForceProxy;

    let url = rawUrl;
    if (activeUseProxy) {
      let proxyQuery = `url=${encodeURIComponent(rawUrl)}`;
      if (channelHeaders['Referer']) {
        proxyQuery += `&referer=${encodeURIComponent(channelHeaders['Referer'])}`;
      }
      if (channelHeaders['User-Agent']) {
        proxyQuery += `&userAgent=${encodeURIComponent(channelHeaders['User-Agent'])}`;
      }
      if (channelHeaders['Cookie']) {
        proxyQuery += `&cookie=${encodeURIComponent(channelHeaders['Cookie'])}`;
      }
      const proxyPath = `/api/proxy?${proxyQuery}`;
      
      const savedProxyBase = localStorage.getItem('custom_proxy_base');
      let customProxyBase = savedProxyBase || '';
      
      if (!customProxyBase) {
        const hostname = window.location.hostname;
        const isCloudflarePages = hostname.includes('.pages.dev') || 
          (!hostname.includes('run.app') && !hostname.includes('localhost') && !hostname.includes('127.0.0.1'));
        
        if (isCloudflarePages && hasCustomPort) {
          customProxyBase = 'https://ais-pre-lba6jarckqdljkk2qw6the-361905524472.asia-southeast1.run.app';
        }
      }
      
      url = customProxyBase ? `${customProxyBase}${proxyPath}` : proxyPath;
    }

    setIsLoading(true);

    const handlePlaying = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    videoElement.addEventListener('playing', handlePlaying);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('loadstart', handleLoadStart);
    videoElement.addEventListener('canplay', handleCanPlay);

    // Setup HLS
    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hlsConfig = {
        enableWorker: true,
        lowLatencyMode: false,
        // Start playing instantly at the lowest level (lowest bandwidth and file size), then upscale automatically if connection allows
        startLevel: 0,
        // Set initial estimate to a low bandwidth (50 kbps) so the player requests lightweight chunks at startup
        abrEwmaDefaultEstimate: 50000,
        capLevelToPlayerSize: true,
        // Increase buffer length from 8s to 45s to survive low-speed internet fluctuations and dips without stalling
        maxBufferLength: 45,
        maxMaxBufferLength: 90,
        maxBufferSize: 30 * 1024 * 1024,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        // Increase retry counts and reduce delays for faster recovery on low-quality networks
        manifestLoadingMaxRetry: 15,
        manifestLoadingRetryDelay: 500,
        levelLoadingMaxRetry: 15,
        levelLoadingRetryDelay: 500,
        fragLoadingMaxRetry: 15,
        fragLoadingRetryDelay: 500,
      };

      const hlsInstance = new Hls(hlsConfig);
      hlsRef.current = hlsInstance;
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(videoElement);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play().catch((e) => console.log('Autoplay play failed:', e));
      });

      let networkRetryCount = 0;
      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Hls network error, trying to recover...');
              if (networkRetryCount < 3) {
                networkRetryCount++;
                hlsInstance.startLoad();
              } else {
                // If direct play failed, fall back to proxy play first before changing servers
                if (!activeUseProxy) {
                  console.log('Direct playback failed. Retrying through secure Proxy server...');
                  setUseProxy(true);
                } else if (channel.urls.length > 1) {
                  const nextIndex = (currentUrlIndex + 1) % channel.urls.length;
                  console.log(`Fallback: Trying next server: Server ${nextIndex + 1}`);
                  setCurrentUrlIndex(nextIndex);
                  setUseProxy(false);
                  setPlaybackError(`সার্ভার সংযোগে সমস্যা। সার্ভার ${nextIndex + 1} চেষ্টা করা হচ্ছে...`);
                  setTimeout(() => setPlaybackError(null), 3000);
                } else {
                  if (isHttpsPage && isHttpStream) {
                    setPlaybackError('MIXED_CONTENT_ERROR');
                  } else {
                    setPlaybackError('সার্ভার সংযোগ বিচ্ছিন্ন হয়েছে। দয়া করে অন্য কোনো চ্যানেল অথবা সার্ভার চেষ্টা করুন।');
                  }
                  setIsLoading(false);
                }
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Hls media error, trying to recover...');
              hlsInstance.recoverMediaError();
              break;
            default:
              console.error('Hls unrecoverable error');
              if (!activeUseProxy) {
                console.log('Direct playback failed with fatal error. Retrying through secure Proxy server...');
                setUseProxy(true);
              } else if (channel.urls.length > 1) {
                const nextIndex = (currentUrlIndex + 1) % channel.urls.length;
                console.log(`Fallback: Trying next server: Server ${nextIndex + 1}`);
                setCurrentUrlIndex(nextIndex);
                setUseProxy(false);
                setPlaybackError(`সংযোগ বিচ্ছিন্ন। সার্ভার ${nextIndex + 1} চেষ্টা করা হচ্ছে...`);
                setTimeout(() => setPlaybackError(null), 3000);
              } else {
                if (isHttpsPage && isHttpStream) {
                  setPlaybackError('MIXED_CONTENT_ERROR');
                } else {
                  setPlaybackError('এই চ্যানেলটি এখন সম্প্রচার করা যাচ্ছে না।');
                }
                setIsLoading(false);
                hlsInstance.destroy();
              }
              break;
          }
        }
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = url;
      const onMetadataLoaded = () => {
        videoElement.play().catch((e) => console.log('Safari playback play failed:', e));
      };

      const onNativeError = () => {
        console.error('Native playback error');
        if (!activeUseProxy) {
          console.log('Native direct playback failed. Retrying through secure Proxy server...');
          setUseProxy(true);
        } else if (channel.urls.length > 1) {
          const nextIndex = (currentUrlIndex + 1) % channel.urls.length;
          setCurrentUrlIndex(nextIndex);
          setUseProxy(false);
        } else {
          setPlaybackError('এই চ্যানেলটি এখন সম্প্রচার করা যাচ্ছে না।');
        }
      };

      videoElement.addEventListener('loadedmetadata', onMetadataLoaded);
      videoElement.addEventListener('error', onNativeError);

      return () => {
        videoElement.removeEventListener('loadedmetadata', onMetadataLoaded);
        videoElement.removeEventListener('error', onNativeError);
      };
    }

    return () => {
      videoElement.removeEventListener('playing', handlePlaying);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('loadstart', handleLoadStart);
      videoElement.removeEventListener('canplay', handleCanPlay);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      videoElement.pause();
      videoElement.src = '';
    };
  }, [channel, currentUrlIndex, useProxy]);

  // UI Auto-Fade Interaction logic
  const triggerUIReset = () => {
    setShowUI(true);
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
      className="relative w-full aspect-video bg-black flex flex-col justify-center items-center overflow-hidden rounded-2xl border border-[#222] shadow-2xl animate-fade-in"
    >
      {/* Custom Video Loader */}
      {isLoading && (
        <div id="video-loader" className="absolute inset-0 bg-black z-[9] flex flex-col justify-center items-center">
          <div className="relative w-[50px] h-[50px] rounded-full border-3 border-[rgba(0,255,204,0.1)] flex justify-center items-center mb-[15px] after:content-[''] after:absolute after:-inset-[3px] after:rounded-full after:border-3 after:border-transparent after:border-r-[#00ffcc] spin-animation filter drop-shadow-[0_0_8px_#00ffcc]">
            <div className="w-[10px] h-[10px] bg-[#00ffcc] rounded-full shadow-[0_0_12px_#00ffcc]" />
          </div>
          <div className="text-white text-[16px] font-bold mb-[3px] tracking-[0.5px] text-center select-none">
            <span className="text-[#00ffcc] drop-shadow-[0_0_10px_rgba(0,255,204,0.4)] mr-1">IreenTV</span>
            is Loading
          </div>
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
          ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'}
        `}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Video Stream Player */}
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        className="w-full h-full outline-none bg-black translate-z-0 will-change-transform"
      />

      {/* Playback Error Overlay Banner */}
      {playbackError && (
        <div className="absolute inset-0 bg-black/95 z-[14] flex flex-col justify-center items-center p-4 text-center select-none overflow-y-auto">
          {playbackError === 'MIXED_CONTENT_ERROR' ? (
            <div className="max-w-2xl bg-[#0a0a0a] border border-red-500/30 rounded-xl p-5 md:p-6 text-left shadow-2xl">
              <h3 className="text-lg md:text-xl font-black text-red-500 mb-3 flex items-center gap-2 border-b border-[#1f1f1f] pb-2">
                ⚠️ নিরাপত্তা সতর্কতা (Mixed Content Block)
              </h3>
              <p className="text-gray-300 text-xs md:text-sm mb-4 leading-relaxed">
                আপনার ব্রাউজারটি <strong className="text-[#00ffcc]">HTTPS (Secure)</strong> মুডে চলছে, কিন্তু এই চ্যানেলটির লাইভ স্ট্রিম লিংকটি <strong className="text-red-400">HTTP (Insecure)</strong> সার্ভার থেকে সম্প্রচার করা হচ্ছে। ব্রাউজারের সিকিউরিটি পলিসির কারণে এটি ব্লক হয়েছে।
              </p>
              
              <div className="bg-black/55 p-3 rounded-lg border border-[#1a1a1a] mb-4">
                <h4 className="text-[#00ffcc] font-bold text-xs md:text-sm mb-2">🛠️ কিভাবে সমাধান করবেন (How to Allow HTTP Streams):</h4>
                <ol className="list-decimal list-inside text-gray-400 text-[11px] md:text-xs space-y-2 leading-relaxed">
                  <li>ব্রাউজারের অ্যাড্রেস বারের বাম পাশে থাকা <strong className="text-white">প্যাডলক (তালা/সেটিংস)</strong> আইকনে ক্লিক করুন।</li>
                  <li><strong className="text-white">Site Settings (সাইট সেটিংস)</strong> অপশনে যান।</li>
                  <li>সেখান থেকে <strong className="text-white">Insecure Content (অসুরক্ষিত কন্টেন্ট)</strong> খুঁজে বের করুন।</li>
                  <li>সেটিকে পরিবর্তন করে <strong className="text-green-400">Allow (অনুমতি দিন)</strong> হিসেবে সিলেক্ট করুন।</li>
                  <li>পেজটি <strong className="text-[#00ffcc]">রিলোড (Reload)</strong> করুন এবং আবার প্লে করুন!</li>
                </ol>
              </div>

              <div className="flex gap-3 flex-wrap justify-end">
                <button
                  onClick={() => {
                    setPlaybackError(null);
                    // Reset/Force-trigger reload on the same URL index
                    setCurrentUrlIndex((prev) => prev);
                  }}
                  className="px-4 py-2 bg-[#00ffcc] text-black font-black text-xs md:text-sm rounded-lg shadow-[0_0_10px_#00ffcc] hover:scale-105 active:scale-95 transition-transform cursor-pointer outline-none focus:ring-2 focus:ring-white select-none"
                >
                  আবার চেষ্টা করুন (Retry)
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-red-600 text-white font-black text-xs md:text-sm rounded-lg shadow-[0_0_10px_rgba(220,38,38,0.5)] hover:bg-red-700 hover:scale-105 active:scale-95 transition-transform cursor-pointer outline-none focus:ring-2 focus:ring-white select-none"
                >
                  বন্ধ করুন (Close)
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-red-500 font-bold text-lg md:text-xl mb-4 max-w-lg px-4 leading-relaxed">
                {playbackError}
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  onClick={() => {
                    setPlaybackError(null);
                    // Reset/Force-trigger reload on the same URL index
                    setCurrentUrlIndex((prev) => prev);
                  }}
                  className="px-4 py-2 bg-[#00ffcc] text-black font-black text-xs md:text-sm rounded-lg shadow-[0_0_10px_#00ffcc] hover:scale-105 active:scale-95 transition-transform cursor-pointer outline-none focus:ring-2 focus:ring-white select-none"
                >
                  আবার চেষ্টা করুন (Retry)
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-red-600 text-white font-black text-xs md:text-sm rounded-lg shadow-[0_0_10px_rgba(220,38,38,0.5)] hover:bg-red-700 hover:scale-105 active:scale-95 transition-transform cursor-pointer outline-none focus:ring-2 focus:ring-white select-none"
                >
                  বন্ধ করুন (Close)
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Backup Servers Selector List */}
      {channel.urls.length > 0 && (
        <div
          id="server-list"
          className={`absolute bottom-[15px] left-1/2 -translate-x-1/2 flex gap-[8px] bg-black/85 px-[15px] py-[10px] rounded-[10px] border border-[#222] flex-wrap justify-center max-w-[90%] max-h-[80px] overflow-y-auto transition-all duration-500 z-[13]
            ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}
          `}
        >
          {channel.urls.map((url, idx) => {
            const isActive = idx === currentUrlIndex;
            return (
              <button
                key={url}
                tabIndex={1}
                onClick={() => setCurrentUrlIndex(idx)}
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
