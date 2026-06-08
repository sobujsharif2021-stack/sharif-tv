import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Volume2, 
  VolumeX, 
  Maximize2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  X,
  Play,
  RotateCw,
  Minimize
} from 'lucide-react';

interface PlayerProps {
  url: string;
  channelName: string;
  autoPlay?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
}

export function Player({ url, channelName, autoPlay = true, onMinimize, onClose }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [rotation, setRotation] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleMute = () => {
    if (videoRef.current) {
      const muted = !videoRef.current.muted;
      videoRef.current.muted = muted;
      setIsMuted(muted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  const handlePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn("PIP failed:", e);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    let hls: Hls | null = null;
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxMaxBufferLength: 30,
        capLevelToPlayerSize: true
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) video.play().catch(() => setIsPlaying(false));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              setError('Stream unavailable. Reconnecting...');
              setIsLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        if (autoPlay) video.play().catch(() => setIsPlaying(false));
      });
    } else {
      setError('HLS not supported in this browser');
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      if (hls) hls.destroy();
    };
  }, [url, autoPlay]);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black overflow-hidden group select-none shadow-2xl"
      onMouseMove={resetControlsTimeout}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer transition-transform duration-300"
        style={{ transform: `rotate(${rotation}deg)` }}
        playsInline
        muted={isMuted}
        onClick={togglePlay}
      />

      {/* Live Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        <span className="bg-rose-600/90 text-white font-mono text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-full uppercase shadow-md">
          LIVE
        </span>
      </div>

      {/* Loading & Error Overlays */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
          <Loader2 className="animate-spin text-white opacity-50" size={32} />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-center p-6 z-10">
          <AlertCircle className="text-rose-500 mb-2" size={32} />
          <p className="text-white text-xs font-bold uppercase tracking-widest">{error}</p>
        </div>
      )}

      {/* Control Bar */}
      <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-12 pb-4 px-6 flex items-center justify-between transition-all duration-300 z-10 ${showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        {/* Subtle Glass Edge Header for Controls */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        
        <div className="flex items-center gap-5">
          <button onClick={togglePlay} className="text-white hover:text-rose-500 transition-all transform active:scale-95 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            {isPlaying ? (
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <Play size={24} fill="currentColor" />
            )}
          </button>
          
          <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <div className="flex flex-col">
            <span className="text-[11px] font-black text-white uppercase tracking-wider truncate max-w-[150px] sm:max-w-none drop-shadow-md">
              {channelName}
            </span>
            <div className="flex items-center gap-1.5 opacity-60">
               <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></div>
               <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">Network Secure</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handlePip}
            className="text-white/60 hover:text-white transition-all p-1"
            title="Picture-in-Picture"
          >
            <Minimize size={16} />
          </button>

          <button
            onClick={handleFullscreen}
            className="text-white/60 hover:text-white transition-all p-1"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
