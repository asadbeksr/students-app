import { useState, useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { motion } from 'framer-motion';

interface CylinderVolumeProps {
  latex: string;
  fallback: React.ReactNode;
  initialVariables?: Record<string, number>;
}

const DEFAULT_RADIUS = 3;
const DEFAULT_HEIGHT = 5;
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 10;
const MIN_HEIGHT = 1;
const MAX_HEIGHT = 15;
const STEP = 0.1;

export function CylinderVolume({ latex: _latex, fallback, initialVariables }: CylinderVolumeProps) {
  const [radius, setRadius] = useState(initialVariables?.radius ?? DEFAULT_RADIUS);
  const [height, setHeight] = useState(initialVariables?.height ?? DEFAULT_HEIGHT);

  const volume = useMemo(() => {
    return Math.PI * radius * radius * height;
  }, [radius, height]);

  const baseArea = useMemo(() => {
    return Math.PI * radius * radius;
  }, [radius]);

  // Scale for visualization
  const maxDimension = Math.max(MAX_RADIUS, MAX_HEIGHT);
  const scale = 80 / maxDimension;
  const cylinderRadius = radius * scale;
  const cylinderHeight = height * scale;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-stretch">
      {/* Left side: Equation + Controls */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Main equation display */}
        <div className="flex items-center justify-center p-6 bg-muted/40 rounded-xl border border-border/50 shadow-sm min-h-[100px]">
          {fallback}
        </div>

        {/* Sliders */}
        <div className="bg-card p-6 rounded-xl border shadow-sm space-y-6">
          {/* Radius slider */}
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

          {/* Height slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <span className="font-serif italic font-bold">h</span>
                <span className="text-muted-foreground">(height)</span>
              </label>
              <div className="text-right font-mono text-sm tabular-nums">
                <span className="font-bold">{height.toFixed(2)}</span>
                <span className="text-muted-foreground text-xs ml-1">units</span>
              </div>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[height]}
              min={MIN_HEIGHT}
              max={MAX_HEIGHT}
              step={STEP}
              onValueChange={(vals) => setHeight(vals[0])}
            >
              <Slider.Track className="bg-secondary relative grow rounded-full h-[3px]">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-background border-2 border-primary shadow-sm rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Height"
              />
            </Slider.Root>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/40 p-4 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Volume</div>
            <div className="text-lg font-mono tabular-nums">
              <span className="font-bold">{volume.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground ml-1">π units³</span>
            </div>
          </div>
          <div className="bg-muted/40 p-4 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Base Area</div>
            <div className="text-lg font-mono tabular-nums">
              <span className="font-bold">{baseArea.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground ml-1">π units²</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Visualization */}
      <div className="flex-1 lg:max-w-[400px] flex items-center justify-center p-8 bg-gradient-to-br from-muted/50 to-muted/10 rounded-xl shadow-inner border border-border/50">
        <div className="relative" style={{ width: '200px', height: '300px' }}>
          {/* 3D Cylinder visualization */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 200 300"
            style={{ overflow: 'visible' }}
          >
            {/* Cylinder body (ellipse + rectangle) */}
            <defs>
              <linearGradient id="cylinder-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0,0,0,0.1)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
              </linearGradient>
            </defs>

            {/* Top ellipse */}
            <motion.ellipse
              cx="100"
              cy={50}
              rx={cylinderRadius}
              ry={cylinderRadius * 0.3}
              fill="url(#cylinder-gradient)"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
              animate={{
                rx: cylinderRadius,
                ry: cylinderRadius * 0.3,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Cylinder sides */}
            <motion.rect
              x={100 - cylinderRadius}
              y={50}
              width={cylinderRadius * 2}
              height={cylinderHeight}
              fill="url(#cylinder-gradient)"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
              animate={{
                x: 100 - cylinderRadius,
                width: cylinderRadius * 2,
                height: cylinderHeight,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Bottom ellipse */}
            <motion.ellipse
              cx="100"
              cy={50 + cylinderHeight}
              rx={cylinderRadius}
              ry={cylinderRadius * 0.3}
              fill="rgba(0,0,0,0.05)"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
              animate={{
                rx: cylinderRadius,
                ry: cylinderRadius * 0.3,
                cy: 50 + cylinderHeight,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Height indicator */}
            <motion.line
              x1={100 + cylinderRadius + 10}
              y1={50}
              x2={100 + cylinderRadius + 10}
              y2={50 + cylinderHeight}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="text-muted-foreground"
              animate={{
                y2: 50 + cylinderHeight,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <motion.text
              x={100 + cylinderRadius + 15}
              y={(50 + (50 + cylinderHeight)) / 2}
              className="text-xs fill-foreground font-mono"
              dominantBaseline="middle"
              animate={{
                y: (50 + (50 + cylinderHeight)) / 2,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              h = {height.toFixed(1)}
            </motion.text>

            {/* Radius indicator */}
            <motion.line
              x1="100"
              y1={50 + cylinderHeight + 20}
              x2={100 + cylinderRadius}
              y2={50 + cylinderHeight + 20}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="text-muted-foreground"
              animate={{
                x2: 100 + cylinderRadius,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <motion.text
              x={100 + cylinderRadius / 2}
              y={50 + cylinderHeight + 35}
              className="text-xs fill-foreground font-mono"
              textAnchor="middle"
              animate={{
                x: 100 + cylinderRadius / 2,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              r = {radius.toFixed(1)}
            </motion.text>
          </svg>
        </div>
      </div>
    </div>
  );
}
