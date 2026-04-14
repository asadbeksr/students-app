import { useState, useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { motion } from 'framer-motion';

interface QuadraticFormulaProps {
  latex: string;
  fallback: React.ReactNode;
  initialVariables?: Record<string, number>;
}

const DEFAULT_A = 1;
const DEFAULT_B = -5;
const DEFAULT_C = 6;
const MIN = -10;
const MAX = 10;
const STEP = 0.1;

export function QuadraticFormula({ latex: _latex, fallback, initialVariables }: QuadraticFormulaProps) {
  const [a, setA] = useState(initialVariables?.a ?? DEFAULT_A);
  const [b, setB] = useState(initialVariables?.b ?? DEFAULT_B);
  const [c, setC] = useState(initialVariables?.c ?? DEFAULT_C);

  const { roots, discriminant, vertex, hasRealRoots } = useMemo(() => {
    const disc = b * b - 4 * a * c;
    const hasReal = disc >= 0;
    
    let root1: number | null = null;
    let root2: number | null = null;
    
    if (hasReal && a !== 0) {
      root1 = (-b + Math.sqrt(disc)) / (2 * a);
      root2 = (-b - Math.sqrt(disc)) / (2 * a);
    }
    
    const vertexX = a !== 0 ? -b / (2 * a) : 0;
    const vertexY = a * vertexX * vertexX + b * vertexX + c;
    
    return {
      roots: { root1, root2 },
      discriminant: disc,
      vertex: { x: vertexX, y: vertexY },
      hasRealRoots: hasReal,
    };
  }, [a, b, c]);

  // Graph dimensions
  const graphWidth = 400;
  const graphHeight = 300;
  const xMin = -5;
  const xMax = 5;
  const xRange = xMax - xMin;
  
  // Calculate y range based on vertex and roots
  const yValues: number[] = [];
  for (let x = xMin; x <= xMax; x += 0.1) {
    yValues.push(a * x * x + b * x + c);
  }
  const yMin = Math.min(...yValues, -5);
  const yMax = Math.max(...yValues, 5);
  const yRange = yMax - yMin;
  
  // Scale factors
  const scaleX = graphWidth / xRange;
  const scaleY = graphHeight / yRange;
  const originX = -xMin * scaleX;
  const originY = yMax * scaleY;

  // Generate parabola points
  const parabolaPoints = useMemo(() => {
    const points: string[] = [];
    for (let x = xMin; x <= xMax; x += 0.1) {
      const y = a * x * x + b * x + c;
      const px = originX + x * scaleX;
      const py = originY - (y - yMin) * scaleY;
      points.push(`${px},${py}`);
    }
    return points.join(' ');
  }, [a, b, c, originX, originY, scaleX, scaleY, yMin]);

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
          {/* Coefficient a */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <span className="font-serif italic font-bold">a</span>
                <span className="text-muted-foreground">(coefficient)</span>
              </label>
              <div className="text-right font-mono text-sm tabular-nums">
                <span className="font-bold">{a.toFixed(2)}</span>
              </div>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[a]}
              min={MIN}
              max={MAX}
              step={STEP}
              onValueChange={(vals) => setA(vals[0])}
            >
              <Slider.Track className="bg-secondary relative grow rounded-full h-[3px]">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-background border-2 border-primary shadow-sm rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Coefficient a"
              />
            </Slider.Root>
          </div>

          {/* Coefficient b */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <span className="font-serif italic font-bold">b</span>
                <span className="text-muted-foreground">(coefficient)</span>
              </label>
              <div className="text-right font-mono text-sm tabular-nums">
                <span className="font-bold">{b.toFixed(2)}</span>
              </div>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[b]}
              min={MIN}
              max={MAX}
              step={STEP}
              onValueChange={(vals) => setB(vals[0])}
            >
              <Slider.Track className="bg-secondary relative grow rounded-full h-[3px]">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-background border-2 border-primary shadow-sm rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Coefficient b"
              />
            </Slider.Root>
          </div>

          {/* Coefficient c */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <span className="font-serif italic font-bold">c</span>
                <span className="text-muted-foreground">(coefficient)</span>
              </label>
              <div className="text-right font-mono text-sm tabular-nums">
                <span className="font-bold">{c.toFixed(2)}</span>
              </div>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[c]}
              min={MIN}
              max={MAX}
              step={STEP}
              onValueChange={(vals) => setC(vals[0])}
            >
              <Slider.Track className="bg-secondary relative grow rounded-full h-[3px]">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-background border-2 border-primary shadow-sm rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Coefficient c"
              />
            </Slider.Root>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-muted/40 p-4 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-2">Discriminant</div>
            <div className="text-lg font-mono tabular-nums">
              <span className="font-bold">{discriminant.toFixed(2)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {discriminant > 0 ? '2 real roots' : discriminant === 0 ? '1 real root' : 'No real roots'}
            </div>
          </div>
          
          {hasRealRoots && (
            <div className="grid grid-cols-2 gap-4">
              {roots.root1 !== null && (
                <div className="bg-primary/10 border-primary/30 p-4 rounded-lg border">
                  <div className="text-xs text-muted-foreground mb-1">Root 1</div>
                  <div className="text-lg font-mono tabular-nums">
                    <span className="font-bold text-primary">{roots.root1.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {roots.root2 !== null && roots.root2 !== roots.root1 && (
                <div className="bg-primary/10 border-primary/30 p-4 rounded-lg border">
                  <div className="text-xs text-muted-foreground mb-1">Root 2</div>
                  <div className="text-lg font-mono tabular-nums">
                    <span className="font-bold text-primary">{roots.root2.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-muted/40 p-4 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Vertex</div>
            <div className="text-sm font-mono tabular-nums">
              ({vertex.x.toFixed(2)}, {vertex.y.toFixed(2)})
            </div>
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
              <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/30" />
              </pattern>
            </defs>
            <rect width={graphWidth} height={graphHeight} fill="url(#grid)" />

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
            {[-4, -2, 2, 4].map((x) => (
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

            {/* Shaded area under curve */}
            <motion.polygon
              points={`${originX + xMin * scaleX},${originY} ${parabolaPoints} ${originX + xMax * scaleX},${originY}`}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="none"
              animate={{
                points: `${originX + xMin * scaleX},${originY} ${parabolaPoints} ${originX + xMax * scaleX},${originY}`,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Parabola curve */}
            <motion.polyline
              points={parabolaPoints}
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="3"
              className="dark:stroke-blue-400"
              animate={{
                points: parabolaPoints,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Roots markers */}
            {hasRealRoots && roots.root1 !== null && (
              <motion.g
                animate={{
                  transform: `translate(${originX + roots.root1 * scaleX}, ${originY})`,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <circle r="6" fill="rgb(34, 197, 94)" className="dark:fill-green-400" />
                <circle r="3" fill="white" />
                <text
                  x="0"
                  y="-15"
                  className="text-xs fill-green-600 dark:fill-green-400 font-mono font-bold"
                  textAnchor="middle"
                >
                  {roots.root1.toFixed(1)}
                </text>
              </motion.g>
            )}
            {hasRealRoots && roots.root2 !== null && roots.root2 !== roots.root1 && (
              <motion.g
                animate={{
                  transform: `translate(${originX + roots.root2 * scaleX}, ${originY})`,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <circle r="6" fill="rgb(34, 197, 94)" className="dark:fill-green-400" />
                <circle r="3" fill="white" />
                <text
                  x="0"
                  y="-15"
                  className="text-xs fill-green-600 dark:fill-green-400 font-mono font-bold"
                  textAnchor="middle"
                >
                  {roots.root2.toFixed(1)}
                </text>
              </motion.g>
            )}

            {/* Vertex marker */}
            <motion.g
              animate={{
                transform: `translate(${originX + vertex.x * scaleX}, ${originY - (vertex.y - yMin) * scaleY})`,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <circle r="5" fill="rgb(249, 115, 22)" className="dark:fill-orange-400" />
              <text
                x="0"
                y="-15"
                className="text-xs fill-orange-600 dark:fill-orange-400 font-mono font-bold"
                textAnchor="middle"
              >
                V
              </text>
            </motion.g>
          </svg>
        </div>
      </div>
    </div>
  );
}
