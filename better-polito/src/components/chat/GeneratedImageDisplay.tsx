import { useState } from 'react';
import { Download, ZoomIn, ZoomOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GeneratedImage } from '@/types';

interface GeneratedImageDisplayProps {
  images: GeneratedImage[];
}

export default function GeneratedImageDisplay({ images }: GeneratedImageDisplayProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleDownload = (image: GeneratedImage, index: number) => {
    const ext = image.mimeType.split('/')[1] || 'png';
    const link = document.createElement('a');
    link.href = `data:${image.mimeType};base64,${image.data}`;
    link.download = `generated-image-${index + 1}.${ext}`;
    link.click();
  };

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className={`grid gap-3 my-3 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {images.map((image, index) => (
          <div
            key={index}
            className="group relative rounded-xl overflow-hidden border border-border/50 bg-muted/30 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <img
              src={`data:${image.mimeType};base64,${image.data}`}
              alt={`Generated image ${index + 1}`}
              className="w-full h-auto max-h-[500px] object-contain cursor-pointer transition-transform duration-300"
              onClick={() => setLightboxIndex(index)}
            />
            {/* Overlay controls */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLightboxIndex(index)}
                  className="h-7 w-7 p-0 text-white hover:bg-white/20 hover:text-white"
                  title="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(image, index)}
                  className="h-7 w-7 p-0 text-white hover:bg-white/20 hover:text-white"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {/* Nano Banana 2 badge */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-medium text-white/90">
                🍌 Nano Banana 2
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={`data:${images[lightboxIndex].mimeType};base64,${images[lightboxIndex].data}`}
              alt={`Generated image ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(images[lightboxIndex], lightboxIndex)}
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
            {/* Navigation arrows for multiple images */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === lightboxIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
