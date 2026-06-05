import React from 'react';
import { Heart, Play } from 'lucide-react';
import { Channel } from '../types';

interface ChannelCardProps {
  channel: Channel;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onPlay: () => void;
  isActive: boolean;
}

export function ChannelCard({ channel, isFavorite, onPlay, isActive }: ChannelCardProps) {
  return (
    <div 
      onClick={onPlay}
      className="flex flex-col items-center gap-2 group cursor-pointer"
    >
      {/* Circular Channel Logo Container */}
      <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white flex items-center justify-center p-3 border-4 transition-all duration-300 ${
        isActive ? 'border-rose-500 scale-105 shadow-lg' : 'border-slate-800/20 hover:border-rose-500/50 group-hover:scale-105'
      }`}>
        {channel.logo ? (
          <img 
            src={channel.logo} 
            alt={channel.name} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain filter drop-shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) {
                const fallback = parent.querySelector('.fallback-plate');
                if (fallback) fallback.classList.remove('hidden');
              }
            }}
          />
        ) : null}
        
        {/* Elegant Fallback Plate */}
        <div className={`fallback-plate ${channel.logo ? 'hidden' : ''} absolute inset-0 flex items-center justify-center text-slate-400 font-bold bg-slate-50 rounded-full`}>
          {channel.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Action Badge - Active indicator */}
        {isActive && (
          <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full p-1 shadow-md border-2 border-white">
            <Play className="fill-white" size={10} />
          </div>
        )}
      </div>

      {/* Channel Label with pill background */}
      <div className={`px-2 py-1 rounded-full text-center transition-colors shadow-sm w-full max-w-[85px] sm:max-w-[100px] ${
        isActive ? 'bg-slate-900 text-white' : 'bg-slate-900/90 group-hover:bg-slate-900 text-white'
      }`}>
        <p className="font-bold text-[9px] sm:text-[10px] tracking-tight truncate uppercase">
          {channel.name}
        </p>
      </div>
    </div>
  );
}

