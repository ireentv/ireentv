export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  category: string;
  urls?: string[];
}

export interface PlaybackState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0 to 1
  isFullscreen: boolean;
  theaterMode: boolean;
  buffering: boolean;
  error: string | null;
  aspectRatio: '16:9' | '4:3' | 'fit';
}
