import { useState, useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { motion } from 'framer-motion';

interface PythagoreanTheoremProps {
  latex: string;
  fallback: React.ReactNode;
  initialVariables?: Record<string, number>;
}

const DEFAULT_A = 3;
const DEFAULT_B = 4;
const MIN = 1;
const MAX = 20;
const STEP = 0.1;

export function PythagoreanTheorem({ latex: _latex, fallback, initialVariables }: PythagoreanTheoremProps) {
  const [a, setA] = useState(initialVariables?.a ?? DEFAULT_A);
  const [b, setB] = useState(initialVariables?.b ?? DEFAULT_B);

  const c = useMemo(() => {
    return Math.sqrt(a * a + b * b);
  }, [a, b]);

  const areaA = useMemo(() => a * a, [a]);
  const areaB = useMemo(() => b * b, [b]);
  const areaC = useMemo(() => c * c, [c]);

  // Scale for visualization
  const maxSide = Math.max(a, b, c);
  const scale = 150 / maxSide;
  const scaledA = a * scale;
  const scaledB = b * scale;

  // Triangle coordinates (right angle at origin)
  const trianglePoints = {
    rightAngle: { x: 0, y: 0 },
    top: { x: 0, y: -scaledA },
    right: { x: scaledB, y: 0 },
  };

  // Square sizes
  const squareSize = 30;

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
          {/* Side a slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <span className="font-serif italic font-bold">a</span>
                <span className="text-muted-foreground">(side a)</span>
              </label>
              <div className="text-right font-mono text-sm tabular-nums">
                <span className="font-bold">{a.toFixed(2)}</span>
                <span className="text-muted-foreground text-xs ml-1">units</span>
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
                aria-label="Side a"
              />
            </Slider.Root>
          </div>

          {/* Side b slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <span className="font-serif italic font-bold">b</span>
                <span className="text-muted-foreground">(side b)</span>
              </label>
              <div className="text-right font-mono text-sm tabular-nums">
                <span className="font-bold">{b.toFixed(2)}</span>
                <span className="text-muted-foreground text-xs ml-1">units</span>
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
                aria-label="Side b"
              />
            </Slider.Root>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-500/10 border-blue-500/30 p-4 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">a²</div>
            <div className="text-lg font-mono tabular-nums">
              <span className="font-bold text-blue-600 dark:text-blue-400">{areaA.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-green-500/10 border-green-500/30 p-4 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">b²</div>
            <div className="text-lg font-mono tabular-nums">
              <span className="font-bold text-green-600 dark:text-green-400">{areaB.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-orange-500/10 border-orange-500/30 p-4 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">c²</div>
            <div className="text-lg font-mono tabular-nums">
              <span className="font-bold text-orange-600 dark:text-orange-400">{areaC.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="bg-muted/40 p-4 rounded-lg border">
          <div className="text-xs text-muted-foreground mb-1">Hypotenuse (c)</div>
          <div className="text-lg font-mono tabular-nums">
            <span className="font-bold">{c.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground ml-1">units</span>
          </div>
        </div>
      </div>

      {/* Right side: Visualization */}
      <div className="flex-1 lg:max-w-[500px] flex items-center justify-center p-8 bg-gradient-to-br from-muted/50 to-muted/10 rounded-xl shadow-inner border border-border/50">
        <div className="relative" style={{ width: '400px', height: '400px' }}>
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="-50 -50 300 300"
            style={{ overflow: 'visible' }}
          >
            {/* Square on side a (vertical, left side) */}
            <motion.rect
              x={trianglePoints.top.x - squareSize}
              y={trianglePoints.top.y}
              width={squareSize}
              height={squareSize}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              className="dark:fill-blue-500/20 dark:stroke-blue-400"
              animate={{
                x: trianglePoints.top.x - squareSize,
                y: trianglePoints.top.y,
                height: squareSize,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <motion.text
              x={trianglePoints.top.x - squareSize / 2}
              y={trianglePoints.top.y + squareSize / 2}
              className="text-sm fill-blue-600 dark:fill-blue-400 font-bold"
              textAnchor="middle"
              dominantBaseline="middle"
              animate={{
                x: trianglePoints.top.x - squareSize / 2,
                y: trianglePoints.top.y + squareSize / 2,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              a²
            </motion.text>

            {/* Square on side b (horizontal, bottom) */}
            <motion.rect
              x={trianglePoints.right.x}
              y={trianglePoints.right.y}
              width={squareSize}
              height={squareSize}
              fill="rgba(34, 197, 94, 0.2)"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              className="dark:fill-green-500/20 dark:stroke-green-400"
              animate={{
                x: trianglePoints.right.x,
                y: trianglePoints.right.y,
                width: squareSize,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <motion.text
              x={trianglePoints.right.x + squareSize / 2}
              y={trianglePoints.right.y + squareSize / 2}
              className="text-sm fill-green-600 dark:fill-green-400 font-bold"
              textAnchor="middle"
              dominantBaseline="middle"
              animate={{
                x: trianglePoints.right.x + squareSize / 2,
                y: trianglePoints.right.y + squareSize / 2,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              b²
            </motion.text>

            {/* Square on hypotenuse c (diagonal) */}
            <motion.g
              transform={`rotate(${Math.atan2(-scaledA, scaledB) * (180 / Math.PI)} ${trianglePoints.top.x} ${trianglePoints.right.y})`}
              animate={{
                transform: `rotate(${Math.atan2(-scaledA, scaledB) * (180 / Math.PI)} ${trianglePoints.top.x} ${trianglePoints.right.y})`,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <motion.rect
                x={trianglePoints.top.x}
                y={trianglePoints.right.y}
                width={squareSize}
                height={squareSize}
                fill="rgba(249, 115, 22, 0.2)"
                stroke="rgb(249, 115, 22)"
                strokeWidth="2"
                className="dark:fill-orange-500/20 dark:stroke-orange-400"
                animate={{
                  width: squareSize,
                  height: squareSize,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
              <motion.text
                x={trianglePoints.top.x + squareSize / 2}
                y={trianglePoints.right.y + squareSize / 2}
                className="text-sm fill-orange-600 dark:fill-orange-400 font-bold"
                textAnchor="middle"
                dominantBaseline="middle"
                animate={{
                  x: trianglePoints.top.x + squareSize / 2,
                  y: trianglePoints.right.y + squareSize / 2,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                c²
              </motion.text>
            </motion.g>

            {/* Triangle */}
            <motion.polygon
              points={`${trianglePoints.rightAngle.x},${trianglePoints.rightAngle.y} ${trianglePoints.top.x},${trianglePoints.top.y} ${trianglePoints.right.x},${trianglePoints.right.y}`}
              fill="rgba(0, 0, 0, 0.05)"
              stroke="currentColor"
              strokeWidth="3"
              className="text-foreground"
              animate={{
                points: `${trianglePoints.rightAngle.x},${trianglePoints.rightAngle.y} ${trianglePoints.top.x},${trianglePoints.top.y} ${trianglePoints.right.x},${trianglePoints.right.y}`,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Right angle marker */}
            <circle
              cx={trianglePoints.rightAngle.x}
              cy={trianglePoints.rightAngle.y}
              r="4"
              fill="currentColor"
              className="text-foreground"
            />

            {/* Labels */}
            <motion.text
              x={trianglePoints.top.x - 15}
              y={trianglePoints.top.y / 2}
              className="text-sm fill-foreground font-serif italic font-bold"
              textAnchor="middle"
              animate={{
                x: trianglePoints.top.x - 15,
                y: trianglePoints.top.y / 2,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              a
            </motion.text>
            <motion.text
              x={trianglePoints.right.x / 2}
              y={trianglePoints.right.y + 20}
              className="text-sm fill-foreground font-serif italic font-bold"
              textAnchor="middle"
              animate={{
                x: trianglePoints.right.x / 2,
                y: trianglePoints.right.y + 20,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              b
            </motion.text>
            <motion.text
              x={trianglePoints.top.x + (trianglePoints.right.x - trianglePoints.top.x) / 2 + 10}
              y={trianglePoints.right.y + (trianglePoints.top.y - trianglePoints.right.y) / 2}
              className="text-sm fill-foreground font-serif italic font-bold"
              animate={{
                x: trianglePoints.top.x + (trianglePoints.right.x - trianglePoints.top.x) / 2 + 10,
                y: trianglePoints.right.y + (trianglePoints.top.y - trianglePoints.right.y) / 2,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              c
            </motion.text>
          </svg>
        </div>
      </div>
    </div>
  );
}
