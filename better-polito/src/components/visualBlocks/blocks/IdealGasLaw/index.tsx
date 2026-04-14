
import { useState, useMemo } from 'react';
import { GasCylinder } from './GasCylinder';
import { GasSliders } from './GasSliders';
import { useGasLaw, GasVariable } from './useGasLaw';

interface IdealGasLawProps {
  latex: string;
  fallback: React.ReactNode;
}

const VARIABLE_CONFIG = {
  P: { min: 0.2, max: 5, step: 0.01, default: 1.02, unit: 'atm' },
  V: { min: 1, max: 50, step: 0.5, default: 24, unit: 'L' },
  n: { min: 0.1, max: 5, step: 0.05, default: 1, unit: 'mol' },
  T: { min: 200, max: 600, step: 1, default: 298, unit: 'K' },
};

export function IdealGasLaw({ latex: _latex, fallback }: IdealGasLawProps) {
  const [solveFor, setSolveFor] = useState<GasVariable>('P');
  const [variables, setVariables] = useState({
    P: VARIABLE_CONFIG.P.default,
    V: VARIABLE_CONFIG.V.default,
    n: VARIABLE_CONFIG.n.default,
    T: VARIABLE_CONFIG.T.default,
  });

  const { calculatedValue, isValid, ratios } = useGasLaw(solveFor, variables);

  const displayValues = useMemo(() => ({
    ...variables,
    [solveFor]: calculatedValue,
  }), [variables, solveFor, calculatedValue]);

  const handleVariableChange = (variable: GasVariable, value: number) => {
    if (variable !== solveFor) {
      setVariables(prev => ({ ...prev, [variable]: value }));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-stretch">
      {/* Left side: Equation + Sliders */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Main equation display */}
        <div className="flex items-center justify-center p-6 bg-muted/40 rounded-xl border border-border/50 shadow-sm min-h-[100px]">
          {fallback}
        </div>

        {/* Variable sliders */}
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-6 items-center bg-card p-6 rounded-xl border shadow-sm">
          {(['P', 'V', 'n', 'T'] as GasVariable[]).map((variable) => (
            <GasSliders
              key={variable}
              variable={variable}
              value={displayValues[variable]}
              config={VARIABLE_CONFIG[variable]}
              isSolveFor={variable === solveFor}
              isValid={isValid}
              onSolveForChange={() => setSolveFor(variable)}
              onChange={(value) => handleVariableChange(variable, value)}
            />
          ))}
        </div>
      </div>

      {/* Right side: Visualization */}
      <div className="flex-1 lg:max-w-[320px] flex items-center justify-center p-8 bg-gradient-to-br from-muted/50 to-muted/10 rounded-xl shadow-inner border border-border/50">
        <GasCylinder
          volumeRatio={ratios.volume}
          pressureRatio={ratios.pressure}
          amountRatio={ratios.amount}
          temperatureRatio={ratios.temperature}
          isValid={isValid}
        />
      </div>
    </div>
  );
}
