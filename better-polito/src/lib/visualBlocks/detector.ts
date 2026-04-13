
import { normalizeLatex } from './normalizer';
import {
  isPVnRT,
  isPythagorean,
  isQuadratic,
  isCircleArea,
  isCylinderVolume,
  isIntegral,
  isTrigRatio,
  isSlopeEquation
} from './patterns';

export enum MathBlockType {
  PV_NRT_EQUATION = 'PV_NRT_EQUATION',
  PYTHAGOREAN_THEOREM = 'PYTHAGOREAN_THEOREM',
  QUADRATIC_FORMULA = 'QUADRATIC_FORMULA',
  CIRCLE_AREA = 'CIRCLE_AREA',
  CYLINDER_VOLUME = 'CYLINDER_VOLUME',
  INTEGRAL = 'INTEGRAL',
  TRIG_RATIO = 'TRIG_RATIO',
  SLOPE_EQUATION = 'SLOPE_EQUATION',
  GRAPHABLE_FUNCTION = 'GRAPHABLE_FUNCTION',
  // Phase 2+
  EXPONENTIAL = 'EXPONENTIAL',
  MOLARITY = 'MOLARITY',
  PH_SCALE = 'PH_SCALE',
}

export interface DetectionResult {
  type: MathBlockType | null;
  originalLatex: string;
  normalizedLatex: string;
  confidence: number;
  extractedVariables?: Record<string, number>;
}

export function detectMathBlockType(latex: string): DetectionResult {
  const normalized = normalizeLatex(latex);

  // Check each pattern in priority order
  if (isPVnRT(normalized)) return { type: MathBlockType.PV_NRT_EQUATION, originalLatex: latex, normalizedLatex: normalized, confidence: 1 };
  if (isPythagorean(normalized)) return { type: MathBlockType.PYTHAGOREAN_THEOREM, originalLatex: latex, normalizedLatex: normalized, confidence: 1 };
  if (isQuadratic(normalized)) return { type: MathBlockType.QUADRATIC_FORMULA, originalLatex: latex, normalizedLatex: normalized, confidence: 1 };
  if (isCircleArea(normalized)) return { type: MathBlockType.CIRCLE_AREA, originalLatex: latex, normalizedLatex: normalized, confidence: 1 };
  if (isCylinderVolume(normalized)) return { type: MathBlockType.CYLINDER_VOLUME, originalLatex: latex, normalizedLatex: normalized, confidence: 1 };
  if (isIntegral(normalized)) return { type: MathBlockType.INTEGRAL, originalLatex: latex, normalizedLatex: normalized, confidence: 1 };
  if (isTrigRatio(normalized)) return { type: MathBlockType.TRIG_RATIO, originalLatex: latex, normalizedLatex: normalized, confidence: 1 };
  if (isSlopeEquation(normalized)) return { type: MathBlockType.SLOPE_EQUATION, originalLatex: latex, normalizedLatex: normalized, confidence: 1 };

  return { type: null, originalLatex: latex, normalizedLatex: normalized, confidence: 0 };
}
