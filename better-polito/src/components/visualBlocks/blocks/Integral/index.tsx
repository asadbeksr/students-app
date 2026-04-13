import { useState, useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { motion } from 'framer-motion';

interface IntegralProps {
  latex: string;
  fallback: React.ReactNode;
  initialVariables?: Record<string, number>;
}

const DEFAULT_LOWER = 0;
const DEFAULT_UPPER = 1;
const MIN = -10;
const MAX = 10;
const STEP = 0.1;

// Default function: f(x) = x²
function evaluateFunction(x: number): number {
  return x * x;
}

export function Integral({ latex: _latex, fallback, initialVariables }: IntegralProps) {
  const [lowerBound, setLowerBound] = useState(initialVariables?.lowerBound ?? DEFAULT_LOWER);
  const [upperBound, setUpperBound] = useState(initialVariables?.upperBound ?? DEFAULT_UPPER);

  // Ensure lower < upper
  const actualLower = Math.min(lowerBound, upperBound);
  const actualUpper = Math.max(lowerBound, upperBound);

  // Calculate integral using numerical approximation (Simpson's rule)
  const integralValue = useMemo(() => {
    const n = 100; // Number of intervals
    const h = (actualUpper - actualLower) / n;
    let sum = evaluateFunction(actualLower) + evaluateFunction(actualUpper);
    
    for (let i = 1; i < n; i++) {
      const x = actualLower + i * h;
      const coefficient = i % 2 === 0 ? 2 : 4;
      sum += coefficient * evaluateFunction(x);
    }
    
    return (h / 3) * sum;
  }, [actualLower, actualUpper]);

  // Graph dimensions
  const graphWidth = 400;
  const graphHeight = 300;
  const xMin = -3;
  const xMax = 3;
  const xRange = xMax - xMin;
  
  // Calculate y range
  const yValues: number[] = [];
  for (let x = xMin; x <= xMax; x += 0.1) {
    yValues.push(evaluateFunction(x));
  }
  const yMin = 0;
  const yMax = Math.max(...yValues, 5);
  const yRange = yMax - yMin;
  
  // Scale factors
  const scaleX = graphWidth / xRange;
  const scaleY = graphHeight / yRange;
  const originX = -xMin * scaleX;
  const originY = graphHeight; // Bottom of graph

  // Generate function curve points
  const curvePoints = useMemo(() => {
    const points: string[] = [];
    for (let x = xMin; x <= xMax; x += 0.05) {
      const y = evaluateFunction(x);
      const px = originX + x * scaleX;
      const py = originY - y * scaleY;
      points.push(`${px},${py}`);
    }
    return points.join(' ');
  }, [originX, originY, scaleX, scaleY]);

  // Generate shaded area points (between bounds)
  const shadedAreaPoints = useMemo(() => {
    if (actualLower >= xMax || actualUpper <= xMin) return '';
    
    const startX = Math.max(actualLower, xMin);
    const endX = Math.min(actualUpper, xMax);
    const points: string[] = [];
    
    // Start at lower bound on x-axis
    points.push(`${originX + startX * scaleX},${originY}`);
    
    // Follow curve
    for (let x = startX; x <= endX; x += 0.05) {
      const y = evaluateFunction(x);
      const px = originX + x * scaleX;
      const py = originY - y * scaleY;
      points.push(`${px},${py}`);
    }
    
    // End at upper bound on x-axis
    points.push(`${originX + endX * scaleX},${originY}`);
    
    return points.join(' ');
  }, [actualLower, actualUpper, originX, originY, scaleX, scaleY, xMin, xMax]);

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
          {/* Lower bound slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <span className="font-serif italic font-bold">a</span>
                <span className="text-muted-foreground">(lower bound)</span>
              </label>
              <div className="text-right font-mono text-sm tabular-nums">
                <span className="font-bold">{lowerBound.toFixed(2)}</span>
              </div>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[lowerBound]}
              min={MIN}
              max={MAX}
              step={STEP}
              onValueChange={(vals) => setLowerBound(vals[0])}
            >
              <Slider.Track className="bg-secondary relative grow rounded-full h-[3px]">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-background border-2 border-primary shadow-sm rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Lower bound"
              />
            </Slider.Root>
          </div>

          {/* Upper bound slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <span className="font-serif italic font-bold">b</span>
                <span className="text-muted-foreground">(upper bound)</span>
              </label>
              <div className="text-right font-mono text-sm tabular-nums">
                <span className="font-bold">{upperBound.toFixed(2)}</span>
              </div>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[upperBound]}
              min={MIN}
              max={MAX}
              step={STEP}
              onValueChange={(vals) => setUpperBound(vals[0])}
            >
              <Slider.Track className="bg-secondary relative grow rounded-full h-[3px]">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-background border-2 border-primary shadow-sm rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Upper bound"
              />
            </Slider.Root>
          </div>
        </div>

        {/* Results */}
        <div className="bg-muted/40 p-4 rounded-lg border">
          <div className="text-xs text-muted-foreground mb-1">Approximate Integral Value</div>
          <div className="text-lg font-mono tabular-nums">
            <span className="font-bold">{integralValue.toFixed(4)}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            ∫ from {actualLower.toFixed(2)} to {actualUpper.toFixed(2)} of f(x) = x²
          </div>
        </div>
      </div>

      {/* Right side: Visualization */}
      <div className="flex-1 lg:max-w-[500px] flex items-center justify-center p-8 bg-gradient-to-br from-muted/50 to-muted/10 rounded-xl shadow-inner border border-border/50">
        <div className="relative w-full" style={{ height: `${graphHeight}px` }}>
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            style={{ overflow: 'visible' }}
          >
            {/* Grid lines */}
            <defs>
              <pattern id="integral-grid" width="40" height="30" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/30" />
              </pattern>
            </defs>
            <rect width={graphWidth} height={graphHeight} fill="url(#integral-grid)" />

            {/* Axes */}
            <line
              x1="0"
              y1={originY}
              x2={graphWidth}
              y2={originY}
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
            />
            <line
              x1={originX}
              y1="0"
              x2={originX}
              y2={graphHeight}
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
            />

            {/* Axis labels */}
            {[-2, -1, 1, 2].map((x) => (
              <g key={x}>
                <line
                  x1={originX + x * scaleX}
                  y1={originY - 5}
                  x2={originX + x * scaleX}
                  y2={originY + 5}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-foreground"
                />
                <text
                  x={originX + x * scaleX}
                  y={originY + 20}
                  className="text-xs fill-foreground"
                  textAnchor="middle"
                >
                  {x}
                </text>
              </g>
            ))}

            {/* Shaded area under curve (between bounds) */}
            {shadedAreaPoints && (
              <motion.polygon
                points={shadedAreaPoints}
                fill="rgba(59, 130, 246, 0.3)"
                stroke="rgba(59, 130, 246, 0.5)"
                strokeWidth="2"
                className="dark:fill-blue-500/30 dark:stroke-blue-400/50"
                animate={{
                  points: shadedAreaPoints,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            )}

            {/* Function curve */}
            <motion.polyline
              points={curvePoints}
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="3"
              className="dark:stroke-blue-400"
              animate={{
                points: curvePoints,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Bound markers */}
            {actualLower >= xMin && actualLower <= xMax && (
              <motion.g
                animate={{
                  transform: `translate(${originX + actualLower * scaleX}, ${originY})`,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-graphHeight"
                  stroke="rgb(34, 197, 94)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="dark:stroke-green-400"
                />
                <circle r="5" fill="rgb(34, 197, 94)" className="dark:fill-green-400" />
                <text
                  x="0"
                  y="-15"
                  className="text-xs fill-green-600 dark:fill-green-400 font-mono font-bold"
                  textAnchor="middle"
                >
                  a = {actualLower.toFixed(1)}
                </text>
              </motion.g>
            )}
            {actualUpper >= xMin && actualUpper <= xMax && (
              <motion.g
                animate={{
                  transform: `translate(${originX + actualUpper * scaleX}, ${originY})`,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-graphHeight"
                  stroke="rgb(34, 197, 94)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="dark:stroke-green-400"
                />
                <circle r="5" fill="rgb(34, 197, 94)" className="dark:fill-green-400" />
                <text
                  x="0"
                  y="-15"
                  className="text-xs fill-green-600 dark:fill-green-400 font-mono font-bold"
                  textAnchor="middle"
                >
                  b = {actualUpper.toFixed(1)}
                </text>
              </motion.g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
