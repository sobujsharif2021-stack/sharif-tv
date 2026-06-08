import React, { useEffect, useState, useMemo } from 'react';
import { Search, Heart, Tv, Star, Film, Sparkles, Trophy, Radio, ArrowRight, ChevronDown, Check, Columns, Minimize2, Maximize2, RotateCcw, RefreshCw, Loader2 } from 'lucide-react';
import { Channel } from './types';
import { parseM3U } from './lib/m3uParser';
import { ChannelCard } from './components/ChannelCard';
import { Player } from './components/Player';

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playingChannel, setPlayingChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply dark mode to body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Load channels and favorites on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Fetch the playlist configuration
        const configResponse = await fetch('playlists.json');
        if (!configResponse.ok) throw new Error('Failed to load playlist configuration');
        const { playlists } = await configResponse.json() as { playlists: string[] };

        // 2. Fetch all M3U files listed in the config
        const results = await Promise.allSettled(
          playlists.map(async (file) => {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`Failed to load ${file}`);
            return await response.text();
          })
        );

        let allChannels: Channel[] = [];
        const seenUrls = new Set<string>();

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const parsed = parseM3U(result.value);
            parsed.forEach(channel => {
              if (!seenUrls.has(channel.url)) {
                seenUrls.add(channel.url);
                allChannels.push(channel);
              }
            });
          }
        });

        // Sort channels alphabetically by name
        allChannels.sort((a, b) => a.name.localeCompare(b.name));

        setChannels(allChannels);
        if (allChannels.length > 0) {
          // Auto play the first channel on startup
          setPlayingChannel(allChannels[0]);
        }
      } catch (error) {
        console.error('Error loading channels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    const storedFavs = localStorage.getItem('iptv_favorites');
    if (storedFavs) {
      try {
        setFavorites(JSON.parse(storedFavs));
      } catch (e) {
        console.error('Failed to parse favorites');
      }
    }
  }, []);

  const toggleFavorite = (channelId: string) => {
    setFavorites(prev => {
      const newFavs = prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId];
      localStorage.setItem('iptv_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(channels.map(c => c.group)))
      .filter(Boolean)
      .sort();
    
    // Prioritize Sport/Sports category
    const sportCat = cats.find(c => c.toLowerCase().includes('sport'));
    const otherCats = cats.filter(c => c !== sportCat);
    
    return sportCat ? ['All', sportCat, ...otherCats] : ['All', ...cats];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      // Category filter
      if (selectedCategory === 'Favorites') {
        if (!favorites.includes(channel.id)) return false;
      } else if (selectedCategory !== 'All') {
        if (channel.group !== selectedCategory) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          channel.name.toLowerCase().includes(query) ||
          channel.group.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [channels, selectedCategory, searchQuery, favorites]);

  // Group channels by category for the sectioned view
  const groupedChannels = useMemo(() => {
    const groups: Record<string, Channel[]> = {};
    
    filteredChannels.forEach(channel => {
      const category = channel.group || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(channel);
    });

    // Special sort for each group
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const isSport = cat.toLowerCase().includes('sport');
        
        // Force T Sport to the top in Sport category
        if (isSport) {
          if (aName.startsWith('t sport') && !bName.startsWith('t sport')) return -1;
          if (!aName.startsWith('t sport') && bName.startsWith('t sport')) return 1;
        }
        
        return a.name.localeCompare(b.name);
      });
    });

    // Reorder groups to match category list
    const orderedGroups: Record<string, Channel[]> = {};
    categories.forEach(cat => {
      if (cat !== 'All' && groups[cat]) {
        orderedGroups[cat] = groups[cat];
      }
    });

    // Add any remaining groups that might have been missed (just in case)
    Object.keys(groups).forEach(cat => {
      if (!orderedGroups[cat]) orderedGroups[cat] = groups[cat];
    });
    
    return orderedGroups;
  }, [filteredChannels, categories]);

  // Helper icons for category section headers
  const getCategoryHeaderIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('news')) return '📰';
    if (lower.includes('sport')) return '🏆';
    if (lower.includes('movie') || lower.includes('film')) return '🎬';
    if (lower.includes('kids')) return '🧒';
    if (lower.includes('bangla')) return '🍿';
    if (lower.includes('weather')) return '⛅';
    return '📺';
  };

  // Helper icons for category pills to make them look high fidelity
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'All': return <Tv size={15} />;
      case 'Favorites': return <Heart size={15} className="fill-current text-rose-500" />;
      case 'Sports': return <Trophy size={15} className="text-amber-400" />;
      case 'News': return <Radio size={15} className="text-sky-400" />;
      case 'Science': return <Sparkles size={15} className="text-emerald-400" />;
      case 'Wildlife': return <Film size={15} className="text-indigo-400" />;
      default: return <Film size={15} className="text-slate-400" />;
    }
  };

  return (
    <div className={`h-screen flex flex-col font-sans select-none overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#0a0a12] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      
      {/* 1. FIXED TOP AREA (Header + Player + Search) */}
      <div className={`flex-shrink-0 z-50 border-b transition-all duration-300 ${isDarkMode ? 'bg-[#0a0a12] border-white/5' : 'bg-white border-slate-200'} shadow-sm`}>
        <div className="w-full max-w-6xl mx-auto pt-4 pb-4 space-y-3">
          
          {/* Subtle Branding */}
          <div className="flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-slate-800 to-black text-white px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
                <h1 className="text-[11px] font-black tracking-[0.25em] uppercase text-rose-500">SHARIF <span className="text-white">TV</span></h1>
              </div>
              <div className="hidden xs:flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Premium Node</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-xl transition-all border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-500' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>

          {/* Player Section (Full Width Display) */}
          <section className="relative w-full">
            {playingChannel ? (
              <div className="w-full aspect-video bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] border-y border-white/5 relative overflow-hidden group">
                {/* Premium Glass Edge Overlay */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none"></div>
                
                <Player 
                  url={playingChannel.url} 
                  channelName={playingChannel.name}
                  autoPlay 
                  onClose={() => setPlayingChannel(null)}
                />
              </div>
            ) : (
              <div className={`w-full aspect-video flex flex-col items-center justify-center border-y transition-all ${
                isDarkMode ? 'bg-[#121220] border-slate-800/50 text-slate-700' : 'bg-white border-slate-200 text-slate-300'
              }`}>
                <Tv size={48} className="opacity-20 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Display Ready</p>
              </div>
            )}
          </section>

          {/* Search Bar (Compact) */}
          <div className="px-6">
            <div className={`relative rounded-2xl border p-0.5 flex items-center shadow-inner transition-all duration-300 ${
              isDarkMode ? 'bg-black/40 border-white/5 ring-1 ring-white/5' : 'bg-slate-100 border-slate-200'
            }`}>
              <Search className="absolute left-4 text-slate-500/50" size={16} />
              <input
                type="text"
                placeholder="Search premium channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-transparent border-0 outline-none text-[11px] sm:text-xs ml-10 py-3 pr-4 font-bold ${
                  isDarkMode ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT (Discovery & Channels) */}
      <main className="flex-grow overflow-y-auto no-scrollbar scroll-smooth">
        <div className="w-full max-w-5xl mx-auto px-4 pt-4 pb-32 space-y-6">

        {/* Categories */}
        <section className="mb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-rose-500 text-white shadow-xl translate-y-[-1px]'
                    : isDarkMode 
                      ? 'bg-[#121220] text-slate-400 border border-slate-800' 
                      : 'bg-white text-slate-500 border border-slate-200/50'
                }`}
              >
                {category === 'All' ? 'Discover' : category}
              </button>
            ))}
          </div>
        </section>

        {/* Grid List */}
        <div className="space-y-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-50">Initializing Network...</p>
            </div>
          ) : Object.keys(groupedChannels).length > 0 ? (
            Object.entries(groupedChannels).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xl filter drop-shadow-sm">{getCategoryHeaderIcon(category)}</span>
                  <h2 className="text-[8px] font-black text-rose-500 uppercase tracking-widest">
                    {category} Index
                  </h2>
                </div>
                
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 px-1 scroll-smooth">
                  {items.map(channel => (
                    <div key={channel.id} className="shrink-0">
                      <ChannelCard
                        channel={channel}
                        isFavorite={favorites.includes(channel.id)}
                        onToggleFavorite={() => toggleFavorite(channel.id)}
                        onPlay={() => {
                          setPlayingChannel(channel);
                        }}
                        isActive={playingChannel?.id === channel.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className={`flex flex-col items-center justify-center py-24 text-center rounded-[2.5rem] border-2 border-dashed ${
              isDarkMode ? 'bg-[#121220] border-slate-800 text-slate-700' : 'bg-white border-slate-200 text-slate-300'
            }`}>
              <Search size={40} className="opacity-20 mb-4" />
              <h4 className="font-black text-[10px] tracking-[0.2em] uppercase">No Streams Found</h4>
            </div>
          )}
        </div>
      </div>
    </main>
    </div>
  );
}
