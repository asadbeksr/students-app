
import * as Slider from '@radix-ui/react-slider';
import { GasVariable } from './useGasLaw';

interface GasSlidersProps {
  variable: GasVariable;
  value: number;
  config: { min: number; max: number; step: number; unit?: string };
  isSolveFor: boolean;
  isValid: boolean;
  onSolveForChange: () => void;
  onChange: (value: number) => void;
}

export function GasSliders({
  variable,
  value,
  config,
  isSolveFor,
  isValid: _isValid,
  onSolveForChange,
  onChange
}: GasSlidersProps) {
  return (
    <>
      {/* Label and Radio */}
      <div className="flex items-center gap-2">
        <div
          onClick={onSolveForChange}
          className={`
            w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer transition-colors
            ${isSolveFor ? 'border-primary bg-primary' : 'border-muted-foreground hover:border-primary'}
          `}
        >
          {isSolveFor && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
        </div>
        <span
          onClick={onSolveForChange}
          className={`cursor-pointer font-serif font-bold italic ${isSolveFor ? 'text-primary' : 'text-foreground'}`}
        >
          {variable}
        </span>
      </div>

      {/* Slider (only if not solving for) */}
      <div className="flex items-center h-6 px-2">
        {!isSolveFor ? (
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5 min-w-[100px]"
            value={[value]}
            max={config.max}
            min={config.min}
            step={config.step}
            onValueChange={(vals) => onChange(vals[0])}
          >
            <Slider.Track className="bg-secondary relative grow rounded-full h-[3px]">
              <Slider.Range className="absolute bg-primary rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb
              className="block w-4 h-4 bg-background border-2 border-primary shadow-sm rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label={variable}
            />
          </Slider.Root>
        ) : (
          <div className="w-full h-[1px] bg-border border-t border-dashed" />
        )}
      </div>

      {/* Value Display */}
      <div className="text-right font-mono text-sm tabular-nums">
        <span className={isSolveFor ? "text-primary font-bold" : ""}>
          {value.toFixed(2)}
        </span>
        <span className="text-muted-foreground text-xs ml-1 w-8 inline-block text-left">{config.unit}</span>
      </div>
    </>
  );
}
