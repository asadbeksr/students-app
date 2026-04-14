import { useState, useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { motion } from 'framer-motion';

interface CircleAreaProps {
  latex: string;
  fallback: React.ReactNode;
  initialVariables?: Record<string, number>;
}

const DEFAULT_RADIUS = 3;
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 10;
const STEP = 0.1;

export function CircleArea({ latex: _latex, fallback, initialVariables }: CircleAreaProps) {
  const [radius, setRadius] = useState(initialVariables?.radius ?? DEFAULT_RADIUS);

  const area = useMemo(() => {
    return Math.PI * radius * radius;
  }, [radius]);

  const circumference = useMemo(() => {
    return 2 * Math.PI * radius;
  }, [radius]);

  // Scale for visualization (max radius of 100px)
  const scale = 100 / MAX_RADIUS;
  const circleSize = radius * scale;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-stretch">
      {/* Left side: Equation + Controls */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Main equation display */}
        <div className="flex items-center justify-center p-6 bg-muted/40 rounded-xl border border-border/50 shadow-sm min-h-[100px]">
          {fallback}
        </div>

        {/* Radius slider */}
        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <span className="font-serif italic font-bold">r</span>
                <span className="text-muted-foreground">(radius)</span>
              </label>
              <div className="text-right font-mono text-sm tabular-nums">
                <span className="font-bold">{radius.toFixed(2)}</span>
                <span className="text-muted-foreground text-xs ml-1">units</span>
              </div>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[radius]}
              min={MIN_RADIUS}
              max={MAX_RADIUS}
              step={STEP}
              onValueChange={(vals) => setRadius(vals[0])}
            >
              <Slider.Track className="bg-secondary relative grow rounded-full h-[3px]">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-background border-2 border-primary shadow-sm rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Radius"
              />
            </Slider.Root>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/40 p-4 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Area</div>
            <div className="text-lg font-mono tabular-nums">
              <span className="font-bold">{area.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground ml-1">π units²</span>
            </div>
          </div>
          <div className="bg-muted/40 p-4 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Circumference</div>
            <div className="text-lg font-mono tabular-nums">
              <span className="font-bold">{circumference.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground ml-1">units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Visualization */}
      <div className="flex-1 lg:max-w-[400px] flex items-center justify-center p-8 bg-gradient-to-br from-muted/50 to-muted/10 rounded-xl shadow-inner border border-border/50">
        <div className="relative" style={{ width: '200px', height: '200px' }}>
          {/* Grid background */}
          <svg
            className="absolute inset-0 w-full h-full opacity-20"
            viewBox="0 0 200 200"
          >
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="200" height="200" fill="url(#grid)" />
          </svg>

          {/* Circle */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/10"
            style={{
              width: `${circleSize}px`,
              height: `${circleSize}px`,
            }}
            animate={{
              width: `${circleSize}px`,
              height: `${circleSize}px`,
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          {/* Radius line */}
          <motion.svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ width: '200px', height: '200px' }}
            viewBox="0 0 200 200"
          >
            <motion.line
              x1="100"
              y1="100"
              x2={100 + (circleSize / 2)}
              y2="100"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 4"
              className="text-primary"
              animate={{
                x2: 100 + (circleSize / 2),
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <motion.text
              x={100 + (circleSize / 2) + 5}
              y="105"
              className="text-xs fill-foreground font-mono"
              animate={{
                x: 100 + (circleSize / 2) + 5,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              r = {radius.toFixed(1)}
            </motion.text>
          </motion.svg>

          {/* Center point */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
