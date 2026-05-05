import { useState, useRef } from 'react';
import { Download, Maximize2, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GeneratedVideoData } from '@/types';

interface GeneratedVideoDisplayProps {
  videos: GeneratedVideoData[];
}

export default function GeneratedVideoDisplay({ videos }: GeneratedVideoDisplayProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lightboxVideoRef = useRef<HTMLVideoElement>(null);

  const getVideoSrc = (video: GeneratedVideoData) => {
    if (video.data) {
      return `data:${video.mimeType};base64,${video.data}`;
    }
    return video.uri || '';
  };

  const handleDownload = (video: GeneratedVideoData, index: number) => {
    const src = getVideoSrc(video);
    const link = document.createElement('a');
    link.href = src;
    link.download = `generated-video-${index + 1}.mp4`;
    link.click();
  };

  if (!videos || videos.length === 0) return null;

  return (
    <>
      <div className="space-y-3 my-3">
        {videos.map((video, index) => (
          <div
            key={index}
            className="group relative rounded-xl overflow-hidden border border-border/50 bg-black/5 dark:bg-white/5 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <video
              ref={index === 0 ? videoRef : undefined}
              src={getVideoSrc(video)}
              controls
              muted={isMuted}
              playsInline
              preload="metadata"
              className="w-full max-h-[500px] object-contain rounded-xl"
              style={{ background: '#000' }}
            />

            {/* Overlay controls (visible on hover) */}
            <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="flex justify-between items-start pointer-events-auto">
                {/* Veo badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-medium text-white/90">
                  🎬 Veo 3.1 Fast
                </span>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMuted(!isMuted)}
                    className="h-7 w-7 p-0 text-white hover:bg-white/20 hover:text-white"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLightboxIndex(index)}
                    className="h-7 w-7 p-0 text-white hover:bg-white/20 hover:text-white"
                    title="Fullscreen"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(video, index)}
                    className="h-7 w-7 p-0 text-white hover:bg-white/20 hover:text-white"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <video
              ref={lightboxVideoRef}
              src={getVideoSrc(videos[lightboxIndex])}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
              style={{ background: '#000' }}
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(videos[lightboxIndex], lightboxIndex)}
                className="h-8 w-8 p-0 text-white bg-black/40 hover:bg-black/60 hover:text-white rounded-full backdrop-blur-sm"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLightboxIndex(null)}
                className="h-8 w-8 p-0 text-white bg-black/40 hover:bg-black/60 hover:text-white rounded-full backdrop-blur-sm"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
