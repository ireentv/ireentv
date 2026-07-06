import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RotateCcw, AlertTriangle, Monitor, Tv, Info, Settings, Sparkles
} from 'lucide-react';
import { Channel } from '../types';

interface VideoPlayerProps {
  key?: string;
  channel: Channel | null;
  activeUrl?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onClose?: () => void;
}

export default function VideoPlayer({ channel, activeUrl, onPrev, onNext, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | 'fit'>('16:9');
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [streamMode, setStreamMode] = useState<'direct' | 'proxy'>('direct');
  const [playMode, setPlayMode] = useState<'auto' | 'direct' | 'proxy'>('auto');

  // Single Unified Effect for loading and playing streams
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) return;

    // Reset UI states immediately for a fresh load experience
    setIsBuffering(true);
    setError(null);
    setIsPlaying(false);

    // Clean up previous HLS instance completely
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying HLS instance on URL change:', e);
      }
      hlsRef.current = null;
    }
    
    // Completely clear out any legacy stream tracks and src to prepare for the fresh URL load
    video.pause();
    video.removeAttribute('src');
    try {
      video.load();
    } catch (e) {
      console.warn('Error reloading video element src:', e);
    }

    const streamUrl = activeUrl || channel.url;
    const directUrl = streamUrl;
    const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
    
    // Auto-detect if we must use the proxy because of HTTP under HTTPS
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHttpUrl = streamUrl.startsWith('http://');
    const mustUseProxy = isHttps && isHttpUrl;

    // Determine player URL and initial mode based on playMode
    let initialMode: 'direct' | 'proxy' = 'direct';

    if (playMode === 'proxy' || (playMode === 'auto' && mustUseProxy)) {
      initialMode = 'proxy';
    } else if (playMode === 'direct') {
      initialMode = 'direct';
    } else {
      // playMode === 'auto'
      initialMode = 'direct';
    }

    let currentMode: 'direct' | 'proxy' = initialMode;
    const attemptedModes = new Set<string>([currentMode]);
    setStreamMode(currentMode);

    let playerUrl = currentMode === 'proxy' ? proxiedUrl : directUrl;

    let networkErrorRetryCount = 0;
    let otherErrorRetryCount = 0;
    let fallbackTimeout: NodeJS.Timeout | null = null;

    const clearRecoveryTimeout = () => {
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
    };

    // Robust bidirectional dual-fallback mode switching
    const tryFallbackMode = (hlsInstance?: Hls) => {
      const alternativeMode = currentMode === 'direct' ? 'proxy' : 'direct';
      if (!attemptedModes.has(alternativeMode)) {
        console.log(`Playback failed or timed out in ${currentMode} mode. Attempting fallback to ${alternativeMode} mode...`);
        currentMode = alternativeMode;
        attemptedModes.add(alternativeMode);
        setStreamMode(alternativeMode);
        
        const targetSource = alternativeMode === 'proxy' ? proxiedUrl : directUrl;
        
        clearRecoveryTimeout();
        networkErrorRetryCount = 0;
        
        if (hlsInstance) {
          hlsInstance.loadSource(targetSource);
          hlsInstance.startLoad();
          startFallbackTimeout(hlsInstance);
        } else {
          video.src = targetSource;
          video.load();
          startFallbackTimeout();
        }
        return true; // Mode switched successfully
      }
      return false; // Already tried both modes
    };

    // Smart recovery timeout: if stream does not play within 4.5 seconds, auto-fallback
    const startFallbackTimeout = (hlsInstance?: Hls) => {
      clearRecoveryTimeout();
      fallbackTimeout = setTimeout(() => {
        if (!isPlaying) {
          console.log(`Stream loading timed out in ${currentMode} mode. Triggering automatic fallback...`);
          if (!tryFallbackMode(hlsInstance)) {
            setError('Playback timed out. The stream might be offline or blocked.');
            setIsBuffering(false);
          }
        }
      }, 4500);
    };

    // Standard video event listeners
    const handlePlay = () => {
      clearRecoveryTimeout();
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlayingEvent = () => {
      clearRecoveryTimeout();
      setIsBuffering(false);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlayingEvent);

    const handleNativeLoadedMetadata = () => {
      clearRecoveryTimeout();
      video.play().then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      }).catch((err) => {
        console.warn('Playback blocked or failed natively:', err);
        setIsPlaying(false);
        setIsBuffering(false);
      });
    };

    const handleNativeError = () => {
      if (!tryFallbackMode()) {
        setError('Unable to play this channel. It may be offline or temporarily unavailable.');
        setIsBuffering(false);
      }
    };

    // Setup HLS or Native Player
    const isM3U8Stream = streamUrl.includes('.m3u8') || streamUrl.includes('m3u8');
    
    if (Hls.isSupported() && isM3U8Stream) {
      const hls = new Hls({
        abrEwmaDefaultEstimate: 180000, 
        maxBufferLength: 8,
        maxMaxBufferLength: 15,
        backBufferLength: 5,
        maxBufferSize: 6 * 1024 * 1024,
        maxBufferHole: 2.0,
        nudgeMaxRetry: 15,
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 500,
        fragLoadingMaxRetry: 15,
        fragLoadingRetryDelay: 500,
        levelLoadingMaxRetry: 10,
        levelLoadingRetryDelay: 500,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
      });
      hlsRef.current = hls;

      hls.loadSource(playerUrl);
      hls.attachMedia(video);

      startFallbackTimeout(hls);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearRecoveryTimeout();
        video.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch((err) => {
          console.warn('Playback blocked or failed in HLS.js:', err);
          setIsPlaying(false);
          setIsBuffering(false);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn('HLS.js error encountered:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorRetryCount++;
              console.log(`Fatal network error (retry ${networkErrorRetryCount}/3)...`);
              if (networkErrorRetryCount <= 2) {
                hls.startLoad();
              } else if (tryFallbackMode(hls)) {
                // Dual-fallback active
              } else {
                setError('Unable to play this channel. The stream link might be offline or has blocked cross-origin playback.');
                setIsBuffering(false);
                hls.destroy();
                hlsRef.current = null;
              }
              break;
              
            case Hls.ErrorTypes.MEDIA_ERROR:
              otherErrorRetryCount++;
              console.log('Fatal media error, attempting recovery...');
              if (otherErrorRetryCount <= 3) {
                hls.recoverMediaError();
              } else {
                setError('Unable to play this channel. The stream format is not supported or corrupted.');
                setIsBuffering(false);
                hls.destroy();
                hlsRef.current = null;
              }
              break;
              
            default:
              if (tryFallbackMode(hls)) {
                // Dual-fallback active
              } else {
                setError('Unable to play this channel. The stream link might be offline or has blocked cross-origin playback.');
                setIsBuffering(false);
                hls.destroy();
                hlsRef.current = null;
              }
              break;
          }
        }
      });
    } else {
      // Fallback for native HLS (like Safari) or MP4 streams
      video.src = playerUrl;
      video.addEventListener('loadedmetadata', handleNativeLoadedMetadata);
      video.addEventListener('error', handleNativeError);
      startFallbackTimeout();
    }

    return () => {
      clearRecoveryTimeout();
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying HLS on cleanup:', e);
        }
        hlsRef.current = null;
      }
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlayingEvent);
      video.removeEventListener('loadedmetadata', handleNativeLoadedMetadata);
      video.removeEventListener('error', handleNativeError);
    };
  }, [channel, activeUrl, reloadToken, playMode]);

  // Volume handler
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle auto-hide controls
  const triggerShowControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    triggerShowControls();
    return () => {
      if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (value > 0) {
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleReload = () => {
    setIsBuffering(true);
    setError(null);
    setReloadToken(prev => prev + 1);
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '4:3':
        return 'aspect-[4/3] object-contain';
      case 'fit':
        return 'w-full h-full object-fill';
      case '16:9':
      default:
        return 'aspect-[16/9] object-contain';
    }
  };

  return (
    <div id="video-player-root" className="flex flex-col gap-3">
      {/* Active channel details banner */}
      {channel && (
        <div id="channel-details-header" className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-zinc-800/80 flex items-center justify-center p-1.5 border border-zinc-700/50 overflow-hidden shrink-0">
              {channel.logo ? (
                <img 
                  src={channel.logo} 
                  alt={channel.name} 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to default Lucide icon
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'text-emerald-400 font-bold text-lg';
                      fallback.innerText = channel.name.charAt(0);
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div className="text-emerald-400 font-bold text-lg">{channel.name.charAt(0)}</div>
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex flex-wrap items-center gap-2">
                {channel.name}
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  LIVE
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  লো-নেট ও অটো এইচডি
                </span>
                {streamMode === 'direct' ? (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full flex items-center gap-1.5 transition-all duration-350">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
                    ডাইরেক্ট মোড (Direct Play)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full flex items-center gap-1.5 transition-all duration-350 shadow-sm shadow-indigo-950/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping absolute shrink-0"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                    প্রক্সি মোড (Secure Proxy Play)
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Category: {channel.category || 'Others'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Aspect Ratio selector */}
            <div className="flex items-center bg-zinc-800/60 p-0.5 rounded-lg border border-zinc-700/50">
              <button 
                onClick={() => setAspectRatio('16:9')}
                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${aspectRatio === '16:9' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}
                title="16:9 Aspect Ratio"
              >
                16:9
              </button>
              <button 
                onClick={() => setAspectRatio('4:3')}
                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${aspectRatio === '4:3' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}
                title="4:3 Aspect Ratio"
              >
                4:3
              </button>
              <button 
                onClick={() => setAspectRatio('fit')}
                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${aspectRatio === 'fit' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}
                title="Stretch to Fit"
              >
                FIT
              </button>
            </div>

            <button 
              onClick={handleReload}
              className="p-2 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700/50 border border-zinc-700/50 transition-colors"
              title="Reload Stream"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main player box */}
      <div 
        ref={containerRef}
        onMouseMove={triggerShowControls}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className={`relative bg-black rounded-2xl overflow-hidden border border-zinc-800/80 group transition-all duration-300 shadow-2xl shadow-emerald-950/10 ${
          isTheater && !isFullscreen ? 'aspect-video lg:aspect-[21/9] w-full' : 'aspect-video w-full'
        }`}
      >
        {channel ? (
          <>
            {/* Top Overlay Header inside video player container */}
            <div className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/95 via-black/40 to-transparent p-4 flex items-center justify-between transition-opacity duration-300 select-none z-10 ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
              {/* Left side: Live indicator and Channel Name */}
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 bg-red-600/30 text-red-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-red-500/40 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                  LIVE
                </span>
                <span className="text-zinc-500 text-xs font-semibold">|</span>
                <span className="text-white text-xs font-bold font-display tracking-wide drop-shadow-md">
                  {channel.name}
                </span>
              </div>

              {/* Right side: Auto indicator & Close button */}
              <div className="flex items-center gap-2">
                {streamMode === 'direct' ? (
                  <span className="bg-zinc-950/80 border border-zinc-800 text-cyan-400 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
                    Auto (Direct)
                  </span>
                ) : (
                  <span className="bg-zinc-950/80 border border-zinc-800 text-indigo-400 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md relative overflow-hidden">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping absolute shrink-0"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 relative z-10"></span>
                    Auto (Proxy)
                  </span>
                )}
                {onClose && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="p-1.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-lg border border-red-700/30 transition-all shadow-md flex items-center justify-center cursor-pointer z-20"
                    title="Close Player"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <video
              ref={videoRef}
              className={`w-full h-full bg-black ${getAspectRatioClass()}`}
              playsInline
              onClick={togglePlay}
            />

            {/* Click to play/pause huge center button when controls visible */}
            {showControls && (
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 flex items-center justify-center cursor-pointer transition-opacity duration-300"
                onClick={togglePlay}
              >
                <button className="p-4 rounded-full bg-emerald-500 text-zinc-950 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg shadow-emerald-500/20">
                  {isPlaying ? <Pause className="w-6 h-6 fill-zinc-950" /> : <Play className="w-6 h-6 fill-zinc-950 ml-0.5" />}
                </button>
              </div>
            )}

            {/* Buffering Indicator */}
            {isBuffering && !error && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                  <Sparkles className="w-4 h-4 text-emerald-400 absolute animate-pulse" />
                </div>
                <p className="text-sm font-medium text-emerald-400 animate-pulse tracking-wide">Loading stream...</p>
              </div>
            )}

            {/* Error Message Panel */}
            {error && (
              <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center gap-4 text-center px-6">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 animate-bounce">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-base font-semibold text-zinc-100 mb-1">Playback Error</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={handleReload}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold text-xs flex items-center gap-2 hover:bg-red-500 transition-all shadow-lg shadow-red-500/15 active:scale-95 animate-pulse"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Try Again
                </button>
              </div>
            )}

            {/* Dynamic Controls Bar */}
            <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-4 flex flex-col gap-3 transition-opacity duration-300 select-none ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
              
              {/* Controls buttons row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button 
                    onClick={togglePlay}
                    className="p-2 text-zinc-200 hover:text-red-500 rounded-lg hover:bg-zinc-800/50 transition-all active:scale-90"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>

                  {/* Volume control block */}
                  <div className="flex items-center gap-2 group/volume">
                    <button 
                      onClick={toggleMute}
                      className="p-2 text-zinc-200 hover:text-red-500 rounded-lg hover:bg-zinc-800/50 transition-all"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 accent-red-600 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Right side controls */}
                <div className="flex items-center gap-2">
                  {/* Manual Play Mode Selector */}
                  <div className="flex items-center bg-zinc-900/90 border border-zinc-800 p-0.5 rounded-lg mr-1" title="Stream Mode Control">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayMode('auto');
                      }}
                      className={`px-2 py-1 text-[10px] font-bold rounded transition-colors duration-200 ${
                        playMode === 'auto'
                          ? 'bg-red-600 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayMode('direct');
                      }}
                      className={`px-2 py-1 text-[10px] font-bold rounded transition-colors duration-200 ${
                        playMode === 'direct'
                          ? 'bg-red-600 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Direct
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayMode('proxy');
                      }}
                      className={`px-2 py-1 text-[10px] font-bold rounded transition-colors duration-200 ${
                        playMode === 'proxy'
                          ? 'bg-red-600 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Proxy
                    </button>
                  </div>

                  {/* Aspect ratio display */}
                  <div className="text-[10px] text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 px-2 py-1 rounded font-mono">
                    {aspectRatio.toUpperCase()}
                  </div>

                  {/* Theater Mode */}
                  {!isFullscreen && (
                    <button 
                      onClick={() => setIsTheater(!isTheater)}
                      className={`p-2 rounded-lg hover:bg-zinc-800/50 transition-all ${isTheater ? 'text-red-500' : 'text-zinc-200 hover:text-red-500'}`}
                      title={isTheater ? "Normal Mode" : "Theater Mode"}
                    >
                      <Monitor className="w-5 h-5" />
                    </button>
                  )}

                  {/* Fullscreen toggle */}
                  <button 
                    onClick={toggleFullscreen}
                    className="p-2 text-zinc-200 hover:text-red-500 rounded-lg hover:bg-zinc-800/50 transition-all"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    <Minimize2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center text-center px-6">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-red-500 animate-pulse mb-3">
              <Tv className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100">Live TV Streaming</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-sm">
              Select any channel from the list to start watching live stream.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
