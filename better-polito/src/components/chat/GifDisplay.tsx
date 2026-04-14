import { useState, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface GifDisplayProps {
  gifUrl: string;
  previewUrl?: string; // Optional, not used but kept for API compatibility
  mood: string;
  loading?: boolean;
  className?: string;
}

/**
 * GIF Display Component
 * Shows auto-playing GIFs with smooth loading transitions
 * - Matches chat message styling
 */
export function GifDisplay({
  gifUrl,
  previewUrl: _previewUrl, // Kept for API compatibility but not used
  mood,
  loading = false,
  className,
}: GifDisplayProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  if (loading) {
    return (
      <div className={cn('mb-2', className)}>
        <div className="w-48 md:w-64 h-32 md:h-40 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn('relative mb-2 inline-block max-w-full', className)}>
      <div className="relative rounded-lg overflow-hidden shadow-sm">
        <img
          ref={imgRef}
          src={gifUrl}
          alt={`${mood} GIF`}
          className={cn(
            'max-w-full h-auto max-h-36 md:max-h-48 rounded-lg transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />

        {/* Loading skeleton */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
        )}
      </div>
    </div>
  );
}
