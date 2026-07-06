import { useState, useRef, useEffect } from 'react';
import { Channel } from '../types';

interface ChannelCardProps {
  channel: Channel;
  onClick: () => void;
  isFocused: boolean;
}

export default function ChannelCard({ channel, onClick, isFocused }: ChannelCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [logoSrc, setLogoSrc] = useState(channel.logo);
  const FALLBACK_LOGO = 'https://via.placeholder.com/400x120/111111/00ffcc.png?text=TV';

  // Synchronize internal logo status if the channel object changes
  useEffect(() => {
    setLogoSrc(channel.logo);
  }, [channel.logo]);

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.focus({ preventScroll: true });
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isFocused]);

  const handleImageError = () => {
    if (logoSrc !== FALLBACK_LOGO) {
      setLogoSrc(FALLBACK_LOGO);
    }
  };

  const serverCount = channel.urls.length;

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="channel-card group bg-black rounded-[6px] text-left cursor-pointer border border-[#1f1f1f] outline-none flex flex-col overflow-hidden relative select-none
        hover:scale-105 hover:z-10 hover:border-white hover:shadow-[0_10px_30px_rgba(0,0,0,0.9)]
        focus:scale-105 focus:z-10 focus:border-white focus:shadow-[0_10px_30px_rgba(0,0,0,0.9)]"
    >
      <div className="w-full h-[135px] bg-[#050505] flex justify-center items-center p-[10px] box-border border-b border-[#111] overflow-hidden">
        <img
          src={logoSrc}
          alt={channel.name}
          onError={handleImageError}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 group-focus:scale-110"
        />
      </div>

      <div className="p-3 bg-black flex items-center justify-between transition-colors duration-300 group-hover:bg-[#00ffcc] group-focus:bg-[#00ffcc]">
        <div className="text-[14px] font-medium text-white truncate flex-grow group-hover:text-black group-hover:font-bold group-focus:text-black group-focus:font-bold" title={channel.name}>
          {channel.name}
        </div>
        {serverCount > 1 && (
          <span className="text-[10px] text-[#888] ml-2 bg-[#1a1a1a] px-1.5 py-0.5 rounded-sm whitespace-nowrap transition-colors duration-300 group-hover:text-black group-hover:bg-black/15 group-hover:font-bold group-focus:text-black group-focus:bg-black/15 group-focus:font-bold">
            {serverCount} Srv
          </span>
        )}
      </div>
    </div>
  );
}
