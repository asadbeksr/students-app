
/**
 * Normalize LaTeX for consistent pattern matching
 */
export function normalizeLatex(latex: string): string {
  return latex
    .trim()
    .replace(/\s+/g, '')                          // Remove whitespace
    .replace(/\\(?:cdot|times)/g, '')             // Remove multiplication symbols
    .replace(/\*/g, '')                           // Remove asterisks
    .replace(/\^\{2\}/g, '^2')                    // Normalize exponents
    .replace(/\^\{([^{}])\}/g, '^$1')             // Simplify single-char exponents
    .replace(/\\(?:dfrac|tfrac|frac)\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)') // Convert fractions
    .replace(/[{}]/g, '')                         // Remove remaining braces
    .replace(/\\pi/g, 'pi')                       // Normalize pi
    .replace(/π/g, 'pi')
    .toLowerCase();
}

/**
 * Normalize specifically for PV=nRT detection
 */
export function normalizePVnRT(latex: string): string {
  return normalizeLatex(latex)
    .replace(/\((PV|nRT|RT|nR|nT|P|V|n|R|T)\)/g, '$1')
    .toUpperCase();
}
