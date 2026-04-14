
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

export function MathBlockRenderer({
  latex,
  fallback,
  messageId
}: MathBlockRendererProps) {
  const { settings } = useSettingsStore();
  const visualModeEnabled = settings?.visualMode?.enabled ?? true;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MathBlockRenderer.tsx:19',message:'MathBlockRenderer RENDERED',data:{latex,visualModeEnabled,hasSettings:!!settings,stackTrace:new Error().stack?.split('\n').slice(0,5).join('|')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  
  // CRITICAL TEST: If this component is being rendered, we should see this log
  if (process.env.NODE_ENV === 'development') {
    console.log('[MathBlockRenderer] COMPONENT IS RENDERING! LaTeX:', latex);
  }

  const detection = useMemo(() => {
    if (!visualModeEnabled) return null;
    const result = detectMathBlockType(latex);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MathBlockRenderer.tsx:27',message:'Detection result',data:{latex,detectedType:result.type,normalizedLatex:result.normalizedLatex,hasExtractedVariables:!!result.extractedVariables},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MathBlockRenderer.tsx:40',message:'Rendering fallback',data:{latex,visualModeEnabled,hasDetection:!!detection,detectionType:detection?.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    return <>{fallback}</>;
  }

  const BlockComponent = getBlockComponent(detection.type);

  if (!BlockComponent) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MathBlockRenderer.tsx:46',message:'No BlockComponent found',data:{latex,detectionType:detection.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    return <>{fallback}</>;
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MathBlockRenderer.tsx:50',message:'Rendering visual block',data:{latex,detectionType:detection.type,hasBlockComponent:!!BlockComponent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion

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
  const components: Record<MathBlockType, React.ComponentType<any>> = {
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
