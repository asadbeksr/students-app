
import { useMemo } from 'react';

export type GasVariable = 'P' | 'V' | 'n' | 'T';

interface GasLawVars {
  P: number;
  V: number;
  n: number;
  T: number;
}

const CONSTANTS = {
  R: 0.082057,
  LIMITS: {
    P: { min: 0.2, max: 5 },
    V: { min: 1, max: 50 },
    n: { min: 0.1, max: 5 },
    T: { min: 200, max: 600 },
  }
};

export function useGasLaw(solveFor: GasVariable, vars: GasLawVars) {
  const calculatedValue = useMemo(() => {
    const { P, V, n, T } = vars;
    const R = CONSTANTS.R;

    try {
      let result = 0;
      switch (solveFor) {
        case 'P': result = (n * R * T) / V; break;
        case 'V': result = (n * R * T) / P; break;
        case 'n': result = (P * V) / (R * T); break;
        case 'T': result = (P * V) / (n * R); break;
      }
      return Number(result.toFixed(2));
    } catch {
      return 0;
    }
  }, [solveFor, vars]);

  const ratios = useMemo(() => {
    // Normalize values to 0-1 range for visualization based on their limits
    const getRatio = (val: number, key: GasVariable) => {
      const min = CONSTANTS.LIMITS[key].min;
      const max = CONSTANTS.LIMITS[key].max;
      return Math.max(0, Math.min(1, (val - min) / (max - min)));
    };
    
    // For calculated value, we need to use the calculated result
    const currentValues = { ...vars, [solveFor]: calculatedValue };

    return {
      pressure: getRatio(currentValues.P, 'P'),
      volume: getRatio(currentValues.V, 'V'),
      amount: getRatio(currentValues.n, 'n'),
      temperature: getRatio(currentValues.T, 'T'),
    };
  }, [vars, solveFor, calculatedValue]);

  const isValid = useMemo(() => {
    return !isNaN(calculatedValue) && isFinite(calculatedValue) && calculatedValue > 0;
  }, [calculatedValue]);

  return { calculatedValue, isValid, ratios };
}
