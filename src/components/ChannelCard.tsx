import React from 'react';
import { Heart, Play } from 'lucide-react';
import { Channel } from '../types';

interface ChannelCardProps {
  key?: string;
  channel: Channel;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

export default function ChannelCard({ 
  channel, 
  isActive, 
  isFavorite, 
  onSelect, 
  onToggleFavorite 
}: ChannelCardProps) {
  return (
    <div 
      id={`channel-card-${channel.id}`}
      onClick={onSelect}
      className={`group relative flex flex-col bg-zinc-950 border rounded-lg overflow-hidden cursor-pointer select-none transition-all duration-300 hover:scale-[1.03] ${
        isActive 
          ? 'border-red-600 bg-zinc-900 shadow-lg shadow-red-950/20 ring-1 ring-red-600' 
          : 'border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/60'
      }`}
    >
      {/* Thumbnail Container: aspect-[2.2/1], exactly like standard media cards but more compact vertically */}
      <div className="relative w-full aspect-[2.2/1] bg-black flex items-center justify-center p-1 border-b border-zinc-900 group-hover:border-zinc-800 transition-colors">
        {channel.logo ? (
          <img 
            src={channel.logo} 
            alt={channel.name} 
            className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = 'text-red-500 font-black text-2xl';
                fallback.innerText = channel.name.charAt(0);
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div className="text-red-500 font-black text-2xl">{channel.name.charAt(0)}</div>
        )}

        {/* Favorite toggle floating inside */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-md bg-black/70 border border-zinc-800 transition-all opacity-0 group-hover:opacity-100 ${
            isFavorite ? 'text-red-500 opacity-100 border-red-950/50' : 'text-zinc-500 hover:text-red-400'
          }`}
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Play Icon Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="p-2 rounded-full bg-red-600 text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info Row: Name & Optional Servers Badge */}
      <div className="py-0.5 px-2 flex items-center justify-between gap-2 bg-black">
        <h4 className={`text-[11px] font-medium leading-relaxed truncate px-1 transition-colors duration-200 ${
          isActive ? 'text-red-500 font-bold' : 'text-zinc-300 group-hover:text-zinc-100'
        }`} title={channel.name}>
          {channel.name}
        </h4>

        {channel.urls && channel.urls.length > 1 && (
          <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded font-mono">
            {channel.urls.length} Srv
          </span>
        )}
      </div>
    </div>
  );
}
