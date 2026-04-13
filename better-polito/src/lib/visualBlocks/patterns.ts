
import { normalizeLatex, normalizePVnRT } from './normalizer';

// PV = nRT
const PV_NRT_FORMS = new Set([
  'PV=NRT', 'P=NRT/V', 'V=NRT/P', 'N=PV/RT', 'T=PV/NR', 'R=PV/NT'
]);

export function isPVnRT(latex: string): boolean {
  const normalized = normalizePVnRT(latex);
  return PV_NRT_FORMS.has(normalized);
}

// Pythagorean Theorem
const PYTHAGOREAN_REGEX = [
  /^a\^2\+b\^2=c\^2$/,
  /^c\^2=a\^2\+b\^2$/,
  /^c=sqrt\(?a\^2\+b\^2\)?$/,
];

export function isPythagorean(latex: string): boolean {
  const normalized = normalizeLatex(latex)
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)');
  return PYTHAGOREAN_REGEX.some(re => re.test(normalized));
}

// Quadratic Formula
export function isQuadratic(latex: string): boolean {
  const normalized = normalizeLatex(latex)
    .replace(/\\pm/g, '±');
  return /^x=\(-?b±sqrt\(b\^2-4ac\)\)\/\(2a\)$/.test(normalized) ||
         /^ax\^2[+-]bx[+-]c=0$/.test(normalized);
}

// Circle Area
export function isCircleArea(latex: string): boolean {
  return /^a=pir\^2$/.test(normalizeLatex(latex));
}

// Cylinder Volume
export function isCylinderVolume(latex: string): boolean {
  const normalized = normalizeLatex(latex);
  return /^v=pi(?:r\^2h|hr\^2)$/.test(normalized) ||
         /^(?:pir\^2h|pihr\^2)=v$/.test(normalized);
}

// Integral
export function isIntegral(latex: string): boolean {
  return /\\int(?![a-zA-Z])/.test(latex);
}

// Trig Ratio
export function isTrigRatio(latex: string): boolean {
  return /\\(?:sin|cos|tan|cot|sec|csc)\s*\(/.test(latex);
}

// Slope Equation
export function isSlopeEquation(latex: string): boolean {
  const normalized = normalizeLatex(latex);
  return /^y-y_?1=m\(x-x_?1\)$/.test(normalized) ||
         /^y=mx\+b$/.test(normalized);
}

// Exclusion patterns (don't convert these)
export function shouldExclude(latex: string): boolean {
  return /\\(?:text|begin|end|Rightarrow|to|big|Big|bigg|Bigg)\b/.test(latex) ||
         /[a-wyzA-WYZ]\s*\^\s*\{\s*-1\s*\}\s*\(/.test(latex) || // Inverse functions
         latex.includes('&') || // Matrices/alignment
         /\\(?:iint|iiint|oint)/.test(latex); // Multiple integrals
}
