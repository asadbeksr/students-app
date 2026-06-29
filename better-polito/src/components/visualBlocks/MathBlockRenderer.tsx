
import { useMemo } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { detectMathBlockType, MathBlockType } from '@/lib/visualBlocks/detector';
import { MathBlockContainer } from './MathBlockContainer';
import { IdealGasLaw } from './blocks/IdealGasLaw';
import { PythagoreanTheorem } from './blocks/PythagoreanTheorem';
import { QuadraticFormula } from './blocks/QuadraticFormula';
import { CircleArea } from './blocks/CircleArea';
import { CylinderVolume } from './blocks/CylinderVolume';
import { Integral } from './blocks/Integral';

interface MathBlockRendererProps {
  latex: string;
  fallback: React.ReactNode;  // KaTeX fallback
  messageId?: string;
}

type BlockProps = {
  latex: string;
  fallback: React.ReactNode;
  initialVariables?: Record<string, number>;
};

export function MathBlockRenderer({
  latex,
  fallback,
  messageId
}: MathBlockRendererProps) {
  const { settings } = useSettingsStore();
  const visualModeEnabled = settings?.visualMode?.enabled ?? true;

  const detection = useMemo(() => {
    if (!visualModeEnabled) return null;
    const result = detectMathBlockType(latex);
    // Debug logging in development
    if (process.env.NODE_ENV === 'development' && result.type) {
      console.log('[MathBlockRenderer] Detected block type:', result.type, 'for LaTeX:', latex);
    } else if (process.env.NODE_ENV === 'development' && !result.type && latex) {
      console.log('[MathBlockRenderer] No block type detected for LaTeX:', latex, 'normalized:', result.normalizedLatex);
    }
    return result;
  }, [latex, visualModeEnabled]);

  // If visual mode disabled or no match, render fallback
  if (!visualModeEnabled || !detection?.type) {
    return <>{fallback}</>;
  }

  const BlockComponent = getBlockComponent(detection.type);

  if (!BlockComponent) {
    return <>{fallback}</>;
  }

  return (
    <MathBlockContainer
      type={detection.type}
      latex={latex}
      messageId={messageId}
    >
      <BlockComponent
        latex={latex}
        fallback={fallback}
        initialVariables={detection.extractedVariables}
      />
    </MathBlockContainer>
  );
}

function getBlockComponent(type: MathBlockType) {
  const components: Record<MathBlockType, React.ComponentType<BlockProps>> = {
    [MathBlockType.PV_NRT_EQUATION]: IdealGasLaw,
    [MathBlockType.PYTHAGOREAN_THEOREM]: PythagoreanTheorem,
    [MathBlockType.QUADRATIC_FORMULA]: QuadraticFormula,
    [MathBlockType.CIRCLE_AREA]: CircleArea,
    [MathBlockType.CYLINDER_VOLUME]: CylinderVolume,
    [MathBlockType.INTEGRAL]: Integral,
    [MathBlockType.TRIG_RATIO]: () => null, // Placeholder
    [MathBlockType.SLOPE_EQUATION]: () => null, // Placeholder
    [MathBlockType.GRAPHABLE_FUNCTION]: () => null, // Placeholder
    [MathBlockType.EXPONENTIAL]: () => null, // Placeholder
    [MathBlockType.MOLARITY]: () => null, // Placeholder
    [MathBlockType.PH_SCALE]: () => null, // Placeholder
  };

  return components[type] || null;
}
