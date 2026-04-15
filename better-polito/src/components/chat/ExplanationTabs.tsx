import { useState, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '@/types';
import { useSettingsStore } from '@/stores/settingsStore';
import { Lightbulb, CheckCircle2, XCircle, ArrowRight, HelpCircle } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { visit } from 'unist-util-visit';
import type { Root } from 'hast';

interface ExplanationTabsProps {
  message: ChatMessage;
  onRetry?: () => void;
  isStreaming?: boolean;
}

import { MathBlockRenderer } from '@/components/visualBlocks';

// Custom rehype plugin to preserve original LaTeX in data attributes
function rehypePreserveLatex(): any {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      // Find math nodes (created by remark-math)
      if (node.tagName === 'span' || node.tagName === 'div') {
        const className = (node.properties?.className as string[]) || [];
        if (className.includes('math') || className.includes('math-display') || className.includes('katex-display')) {
          // Look for annotation tag with original LaTeX
          const annotation = node.children?.find(
            (child: any) => child.type === 'element' && child.tagName === 'annotation'
          ) as any;
          
          if (annotation) {
            const latex = annotation.children?.find((c: any) => c.type === 'text')?.value;
            if (latex) {
              // Store original LaTeX in data attribute
              if (!node.properties) node.properties = {};
              (node.properties as any)['data-latex'] = latex;
            }
          }
        }
      }
    });
  };
}

// Custom rehype plugin to replace math display divs with custom component markers
function rehypeReplaceMathBlocks(): any {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      // Find div elements with math-display or katex-display class
      if (node.tagName === 'div') {
        const className = (node.properties?.className as string[]) || [];
        const classNameStr = Array.isArray(className) ? className.join(' ') : (className || '');
        
        if (classNameStr && (classNameStr.includes('math-display') || classNameStr.includes('katex-display'))) {
          // Mark this div for replacement
          if (!node.properties) node.properties = {};
          (node.properties as any)['data-math-block'] = 'true';
        }
      }
    });
  };
}

// Component to render text with LaTeX math support
function MathText({ children, isStreaming = false, messageId, usedLatexTracker }: { 
  children: string; 
  isStreaming?: boolean;
  messageId?: string;
  usedLatexTracker?: Set<string>;
}) {
  if (!children) return null;
  const { settings } = useSettingsStore();
  const visualModeEnabled = settings?.visualMode?.enabled ?? true;
  
  // During streaming: Always show KaTeX fallback (no visual blocks)
  // This prevents janky partial renders and ensures complete equation detection
  const shouldRenderVisualBlocks = visualModeEnabled && !isStreaming;
  
  // Extract LaTeX from $$...$$ blocks before processing for fallback matching
  const latexBlocks = useMemo(() => {
    const blocks: Array<{ original: string; latex: string }> = [];
    if (shouldRenderVisualBlocks) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:84',message:'MathText: Content analysis',data:{contentLength:children.length,contentPreview:children.substring(0,200),hasDoubleDollar:children.includes('$$'),hasSingleDollar:children.includes('$'),matchCount:Array.from(children.matchAll(/\$\$([^$]+)\$\$/g)).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
      const matches = Array.from(children.matchAll(/\$\$([^$]+)\$\$/g));
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        blocks.push({ original: match[0], latex: match[1].trim() });
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:84',message:'MathText: LaTeX blocks extracted',data:{blocksCount:blocks.length,blocks:blocks.map(b => b.latex),contentLength:children.length,shouldRenderVisualBlocks},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      // Debug: log extracted blocks
      if (process.env.NODE_ENV === 'development' && blocks.length > 0) {
        console.log('[MathText] Extracted LaTeX blocks:', blocks.map(b => b.latex), 'from content length:', children.length);
      }
    }
    return blocks;
  }, [children, shouldRenderVisualBlocks]);
  
  // Use provided tracker or create a new one for this component instance
  // Use a ref to persist the tracker across renders within this component
  const localTrackerRef = useRef<Set<string>>(new Set());
  const tracker = usedLatexTracker || localTrackerRef.current;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:81',message:'MathText component render',data:{hasUsedTracker:!!usedLatexTracker,trackerSize:tracker.size,trackerContents:Array.from(tracker),shouldRenderVisualBlocks,latexBlocksCount:latexBlocks.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  
  // Track which LaTeX blocks have been used to prevent duplicates
  // IMPORTANT: We only mark as used when we actually return a value to render
  const useLatexBlock = (preferredLatex?: string): string | null => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useLatexBlock] Called with:', { preferredLatex, latexBlocksCount: latexBlocks.length, trackerSize: tracker.size, trackerContents: Array.from(tracker) });
    }
    
    // First try to find exact match if preferred
    if (preferredLatex) {
      // Try exact match first
      let block = latexBlocks.find(b => b.latex === preferredLatex);
      if (!block) {
        // Try normalized match (for cases where extraction normalizes the LaTeX)
        const normalizedPreferred = preferredLatex.replace(/\s+/g, '').trim();
        block = latexBlocks.find(b => b.latex.replace(/\s+/g, '').trim() === normalizedPreferred);
      }
      if (block) {
        // Check if this specific LaTeX (from latexBlocks) has been used
        if (!tracker.has(block.latex)) {
          // Mark as used BEFORE returning (we're about to use it)
          tracker.add(block.latex);
          if (process.env.NODE_ENV === 'development') {
            console.log('[useLatexBlock] ✓ Marking and returning LaTeX block:', block.latex, 'for preferred:', preferredLatex);
          }
          return block.latex;
        } else {
          // Already used, return null to skip
          if (process.env.NODE_ENV === 'development') {
            console.log('[useLatexBlock] ✗ LaTeX already in tracker, skipping:', block.latex, 'tracker:', Array.from(tracker));
          }
          return null;
        }
      }
      // No matching block found, but we have a preferred LaTeX - use it if not already tracked
      // This handles cases where extraction gets LaTeX that wasn't in the original blocks
      if (!tracker.has(preferredLatex)) {
        tracker.add(preferredLatex);
        if (process.env.NODE_ENV === 'development') {
          console.log('[useLatexBlock] ✓ Marking and returning extracted LaTeX directly:', preferredLatex);
        }
        return preferredLatex;
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[useLatexBlock] ✗ Extracted LaTeX already in tracker:', preferredLatex, 'tracker:', Array.from(tracker));
      }
      return null;
    }
    // Otherwise use first unused block
    const unusedBlock = latexBlocks.find(b => !tracker.has(b.latex));
    if (unusedBlock) {
      tracker.add(unusedBlock.latex);
      if (process.env.NODE_ENV === 'development') {
        console.log('[useLatexBlock] ✓ Marking and returning first unused block:', unusedBlock.latex);
      }
      return unusedBlock.latex;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[useLatexBlock] ✗ No unused blocks available, all in tracker:', Array.from(tracker));
    }
    return null;
  };
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex, rehypePreserveLatex, rehypeReplaceMathBlocks]}
      components={{
        // Intercept KaTeX display math blocks at DIV level (most reliable)
        div: ({ node, className, children: divChildren, ...props }) => {
          const classNameStr = Array.isArray(className) ? className.join(' ') : (className || '');
          
          // #region agent log
          // Log ALL divs to see what ReactMarkdown is actually creating
          if (shouldRenderVisualBlocks && latexBlocks.length > 0) {
            // Use console.log as primary since HTTP logging may not be working
            if (process.env.NODE_ENV === 'development') {
              console.log('[DIV HANDLER] Processing div:', {
                className: classNameStr,
                hasKatex: classNameStr.includes('katex'),
                hasMath: classNameStr.includes('math'),
                latexBlocksCount: latexBlocks.length,
                nodeTagName: node?.tagName
              });
            }
            fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:183',message:'DIV HANDLER: ALL DIVS',data:{className:classNameStr,nodeTagName:node?.tagName,nodeType:node?.type,hasChildren:!!node?.children,childrenCount:node?.children?.length || 0,latexBlocksCount:latexBlocks.length,hasKatexClass:classNameStr.includes('katex'),hasMathClass:classNameStr.includes('math')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
          }
          // #endregion
          
          // Check for math-display or katex-display classes (most reliable indicator)
          // rehype-katex uses 'katex-display' for display math blocks
          // Also check for any katex class as fallback
          const isDisplayMathDiv = classNameStr && (
            classNameStr.includes('math-display') || 
            classNameStr.includes('katex-display') ||
            (classNameStr.includes('katex') && !classNameStr.includes('katex-html')) // katex class but not inline
          );
          
          // Also check if node has math-related children (for nested structures)
          const hasMathChildren = node?.children?.some((child: any) => {
            const childClassName = child.properties?.className;
            const childClassNameStr = Array.isArray(childClassName) ? childClassName.join(' ') : (childClassName || '');
            return childClassNameStr && (childClassNameStr.includes('katex') || childClassNameStr.includes('math'));
          });
          
          // Check for our custom marker from rehype plugin
          const hasMathBlockMarker = (node?.properties as any)?.['data-math-block'] === 'true';
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:195',message:'DIV HANDLER: Detection results',data:{classNameStr,isDisplayMathDiv,hasMathChildren,hasMathBlockMarker,shouldRenderVisualBlocks,willEnterBlock:!!((hasMathBlockMarker || isDisplayMathDiv || hasMathChildren) && shouldRenderVisualBlocks)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion
          
          if ((hasMathBlockMarker || isDisplayMathDiv || hasMathChildren) && shouldRenderVisualBlocks) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[MathBlock] Detected math display div:', { className: classNameStr, isDisplayMathDiv, hasMathChildren, latexBlocksCount: latexBlocks.length, trackerSize: tracker.size, trackerContents: Array.from(tracker) });
            }
            
            let latex = extractLatexFromNode(node, latexBlocks);
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:200',message:'DIV HANDLER: LaTeX extraction result',data:{extractedLatex:latex,latexBlocksAvailable:latexBlocks.map(b => b.latex)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
            
            if (process.env.NODE_ENV === 'development') {
              console.log('[MathBlock] Extracted LaTeX:', latex, 'from node');
            }
            
            // Get LaTeX to use (but don't mark as used yet - we'll mark it after successful render)
            let latexToUse: string | null = null;
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:207',message:'DIV HANDLER: Tracker check before',data:{extractedLatex:latex,latexInTracker:latex ? tracker.has(latex) : null,trackerSize:tracker.size,trackerContents:Array.from(tracker),latexBlocksAvailable:latexBlocks.map(b => ({latex:b.latex,inTracker:tracker.has(b.latex)}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
            // #endregion
            
            if (latex) {
              // Check if we can use this LaTeX (not already used)
              if (!tracker.has(latex)) {
                latexToUse = latex;
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:214',message:'DIV HANDLER: Using extracted LaTeX',data:{latexToUse},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
                // #endregion
              } else {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:217',message:'DIV HANDLER: Extracted LaTeX already in tracker',data:{latex,trackerContents:Array.from(tracker)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
                // #endregion
                // Try to find matching block
                const normalizedLatex = latex.replace(/\s+/g, '').trim();
                const block = latexBlocks.find(b => b.latex === latex || b.latex.replace(/\s+/g, '').trim() === normalizedLatex);
                if (block && !tracker.has(block.latex)) {
                  latexToUse = block.latex;
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:222',message:'DIV HANDLER: Using matching block LaTeX',data:{latexToUse,originalLatex:latex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
                  // #endregion
                }
              }
            }
            
            // Fallback: If we don't have LaTeX yet, try to get an unused one
            if (!latexToUse && latexBlocks.length > 0) {
              const unusedBlock = latexBlocks.find(b => !tracker.has(b.latex));
              if (unusedBlock) {
                latexToUse = unusedBlock.latex;
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:230',message:'DIV HANDLER: Using fallback LaTeX',data:{latexToUse},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
                // #endregion
                if (process.env.NODE_ENV === 'development') {
                  console.log('[MathBlock] Using fallback LaTeX from latexBlocks:', latexToUse);
                }
              }
            }
            
            if (latexToUse) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:207',message:'DIV: About to add to tracker and render',data:{latexToUse,trackerSizeBefore:tracker.size,trackerContentsBefore:Array.from(tracker),hasLatex:!!latex,extractedLatex:latex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
              // #endregion
              
              // Mark as used NOW (before rendering) to prevent other components from using it
              tracker.add(latexToUse);
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:213',message:'DIV: Added to tracker, rendering',data:{latexToUse,trackerSizeAfter:tracker.size,trackerContentsAfter:Array.from(tracker)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
              // #endregion
              
              // Debug logging
              if (process.env.NODE_ENV === 'development') {
                console.log('[MathBlock] ✓ Rendering visual block with LaTeX:', latexToUse, 'tracker size after add:', tracker.size);
              }
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:216',message:'DIV: Returning MathBlockRenderer',data:{latexToUse,hasDivChildren:!!divChildren,divChildrenType:typeof divChildren},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
              // #endregion
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:227',message:'DIV: Creating MathBlockRenderer',data:{latexToUse,className,hasDivChildren:!!divChildren,nodeTagName:node?.tagName,nodeType:node?.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
              // #endregion
              
              // Return MathBlockRenderer directly - ReactMarkdown should support this
              const blockRenderer = (
                <MathBlockRenderer 
                  latex={latexToUse}
                  fallback={<div className={className} {...props}>{divChildren}</div>}
                />
              );
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:237',message:'DIV: About to return MathBlockRenderer',data:{latexToUse,blockRendererType:typeof blockRenderer,isReactElement:blockRenderer && typeof blockRenderer === 'object' && '$$typeof' in blockRenderer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
              // #endregion
              
              return blockRenderer;
            } else {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:223',message:'DIV: Skipping render',data:{latex,latexBlocks:latexBlocks.map(b => b.latex),trackerSize:tracker.size,trackerContents:Array.from(tracker),hasLatex:!!latex,latexInTracker:latex ? tracker.has(latex) : null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
              // #endregion
              
              if (process.env.NODE_ENV === 'development') {
                console.log('[MathBlock] ✗ Skipping - LaTeX already used or not available. latex:', latex, 'latexBlocks:', latexBlocks.map(b => b.latex), 'tracker:', Array.from(tracker));
              }
            }
          }
          return <div className={className} {...props}>{divChildren}</div>;
        },
        // Skip span detection - ReactMarkdown doesn't reliably render components from span handlers
        // We'll catch display math blocks at the div level instead
        span: ({ node, className, children: spanChildren, ...props }) => {
          return <span className={className} {...props}>{spanChildren}</span>;
        },
        // Style paragraphs with better spacing
        // Also intercept paragraphs that might contain display math
        p: ({ node, children, ...props }) => {
          // Check if paragraph contains math display (KaTeX sometimes wraps display math in p tags)
          if (shouldRenderVisualBlocks && latexBlocks.length > 0) {
            // Check if this paragraph contains a math display element
            const hasMathDisplay = node?.children?.some((child: any) => {
              const className = child.properties?.className;
              const classNameStr = Array.isArray(className) ? className.join(' ') : (className || '');
              return classNameStr && (
                classNameStr.includes('katex-display') || 
                classNameStr.includes('math-display') ||
                (classNameStr.includes('katex') && !classNameStr.includes('katex-html'))
              );
            });
            
            if (hasMathDisplay) {
              // Find the math div child
              const mathChild = node?.children?.find((child: any) => {
                const className = child.properties?.className;
                const classNameStr = Array.isArray(className) ? className.join(' ') : (className || '');
                return classNameStr && (
                  classNameStr.includes('katex-display') || 
                  classNameStr.includes('math-display') ||
                  classNameStr.includes('katex')
                );
              });
              
              if (mathChild) {
                const latex = extractLatexFromNode(mathChild, latexBlocks);
                if (latex && !tracker.has(latex)) {
                  tracker.add(latex);
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[MathBlock] Detected math in paragraph, rendering visual block:', latex);
                  }
                  return (
                    <span className="block mb-4 leading-[1.7]">
                      <MathBlockRenderer 
                        latex={latex}
                        fallback={<span className="block mb-4 leading-[1.7]">{children}</span>}
                      />
                    </span>
                  );
                }
              }
            }
          }
          return <span className="block mb-4 leading-[1.7]">{children}</span>;
        },
        // Style code blocks
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">{children}</code>
          ) : (
            <code className="block bg-muted p-4 rounded text-sm font-mono overflow-x-auto leading-relaxed">{children}</code>
          );
        },
        // Style lists
        ul: ({ children }) => <ul className="space-y-2 mb-4">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-2 mb-4">{children}</ol>,
        li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

// Helper to extract LaTeX from rendered KaTeX node
function extractLatexFromNode(node: any, latexBlocks?: Array<{ original: string; latex: string }>): string | null {
  try {
    // Method 1: Check data attributes (set by our custom plugin)
    if (node?.properties) {
      const dataLatex = (node.properties as any)?.['data-latex'] || 
                       (node.properties as any)?.['data-original-latex'];
      if (dataLatex) {
        const latex = typeof dataLatex === 'string' ? dataLatex : dataLatex.value;
        if (latex) return latex;
      }
    }
    
    // Method 2: DFS to find annotation tag
    const queue = [node];
    while (queue.length > 0) {
      const current = queue.shift();
      
      if (current?.tagName === 'annotation') {
        // Found annotation, return its content
        if (current.children && Array.isArray(current.children)) {
          const textNode = current.children.find((c: any) => c.type === 'text');
          if (textNode?.value) {
            return textNode.value;
          }
          // Fallback: first child value
          if (current.children[0]?.value) {
            return current.children[0].value;
          }
        }
        // Also check properties
        if (current.properties && (current.properties as any).encoding === 'application/x-tex') {
          const textNode = current.children?.find((c: any) => c.type === 'text');
          if (textNode?.value) {
            return textNode.value;
          }
        }
      }
      
      if (current?.children && Array.isArray(current.children)) {
        queue.push(...current.children);
      }
    }
    
    // Method 3: Try to match against known LaTeX blocks from markdown
    if (latexBlocks && latexBlocks.length > 0) {
      const textContent = extractTextFromNode(node);
      if (textContent) {
        // For PV=nRT, look for specific patterns
        for (const block of latexBlocks) {
          const normalizedBlock = block.latex.replace(/\s+/g, '').toUpperCase();
          // Check if this looks like PV=nRT
          if (normalizedBlock.includes('PV') && normalizedBlock.includes('NRT')) {
            return block.latex;
          }
          // For other equations, try matching key parts
          const keyParts = block.latex.split(/\s*[=+\-*/]\s*/).filter(p => p.length > 1);
          if (keyParts.length > 0 && keyParts.some(part => {
            const cleanPart = part.replace(/[\\{}]/g, '');
            return textContent.includes(cleanPart) || textContent.includes(part);
          })) {
            return block.latex;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Error extracting LaTeX from node:', error);
    return null;
  }
}

// Helper to extract text content from a node
function extractTextFromNode(node: any): string {
  if (!node) return '';
  if (node.type === 'text' && node.value) {
    return node.value;
  }
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(extractTextFromNode).join('');
  }
  return '';
}

// Try to extract explanation modes from message
function getExplanationData(message: ChatMessage) {
  // If explanationModes exists and is properly set, use it
  if (message.explanationModes?.intuitive) {
    try {
      // Check if message.explanationModes has the new fields directly
      // Note: This fallback relies on the backend/parser populating the object correctly
      // Since we updated the prompt, we mainly rely on parsing 'content' below, 
      // but if the extraction logic elsewhere updates explanationModes, we should be safe.
      return {
        keyTakeaway: (message.explanationModes as any).keyTakeaway,
        practiceQuestion: (message.explanationModes as any).practiceQuestion,
        suggestedFollowUp: (message.explanationModes as any).suggestedFollowUp,
        intuitive: JSON.parse(message.explanationModes.intuitive),
        structured: JSON.parse(message.explanationModes.structured),
        formal: JSON.parse(message.explanationModes.formal),
      };
    } catch {
      // Fall through to try parsing content
    }
  }
  
  // Try to parse content as JSON (handles legacy messages or edge cases)
  const content = message.content?.trim() || '';
  
  // Check if content looks like JSON (starts with { or contains JSON structure)
  if (content.startsWith('{') || content.includes('"intuitive"')) {
    try {
      // Try to extract JSON from content (might be wrapped in markdown code blocks)
      let jsonStr = content;
      
      // Handle ```json ... ``` blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      if (parsed.intuitive && parsed.structured && parsed.formal) {
        return {
          keyTakeaway: parsed.keyTakeaway,
          practiceQuestion: parsed.practiceQuestion,
          suggestedFollowUp: parsed.suggestedFollowUp,
          intuitive: parsed.intuitive,
          structured: parsed.structured,
          formal: parsed.formal,
        };
      }
    } catch {
      // Not valid JSON, return null
    }
  }
  
  return null;
}

function PracticeQuestionCard({ question, isStreaming, messageId, usedLatexTracker }: { 
  question: any; 
  isStreaming?: boolean;
  messageId?: string;
  usedLatexTracker?: Set<string>;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [issubmitted, setIsSubmitted] = useState(false);

  if (!question) return null;

  const handleSelect = (id: string) => {
    if (issubmitted) return;
    setSelectedOption(id);
  };

  const handleSubmit = () => {
    if (selectedOption) setIsSubmitted(true);
  };

  const isCorrect = selectedOption === question.correctAnswer;

  return (
    <div className="mt-8 border rounded-lg overflow-hidden bg-card">
      <div className="bg-muted/50 p-4 border-b">
        <h4 className="font-semibold flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          Quick Check
        </h4>
      </div>
      <div className="p-4 space-y-4">
        <div className="text-foreground font-medium">
          <MathText isStreaming={isStreaming} messageId={messageId} usedLatexTracker={usedLatexTracker}>{question.question}</MathText>
        </div>
        
        <div className="space-y-2">
          {question.options.map((opt: any) => {
            let itemClass = "w-full text-left p-3 rounded border transition-colors flex items-start gap-3 ";
            
            if (issubmitted) {
              if (opt.id === question.correctAnswer) {
                itemClass += "bg-green-500/10 border-green-500 text-green-700 dark:text-green-300";
              } else if (opt.id === selectedOption) {
                itemClass += "bg-red-500/10 border-red-500 text-red-700 dark:text-red-300";
              } else {
                itemClass += "opacity-50";
              }
            } else {
              itemClass += selectedOption === opt.id 
                ? "bg-primary/10 border-primary" 
                : "hover:bg-muted border-transparent bg-muted/30";
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                disabled={issubmitted}
                className={itemClass}
              >
                <div className={`
                  w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5
                  ${issubmitted && opt.id === question.correctAnswer ? 'bg-green-500 border-green-500 text-white' : ''}
                  ${issubmitted && opt.id === selectedOption && opt.id !== question.correctAnswer ? 'bg-red-500 border-red-500 text-white' : ''}
                  ${!issubmitted && selectedOption === opt.id ? 'border-primary' : 'border-muted-foreground'}
                `}>
                  {issubmitted && opt.id === question.correctAnswer && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {issubmitted && opt.id === selectedOption && opt.id !== question.correctAnswer && <XCircle className="w-3.5 h-3.5" />}
                  {!issubmitted && selectedOption === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="text-sm"><MathText isStreaming={isStreaming} messageId={messageId} usedLatexTracker={usedLatexTracker}>{opt.text}</MathText></span>
              </button>
            );
          })}
        </div>

        {issubmitted && (
          <div className="mt-4 p-3 bg-muted rounded text-sm animate-in fade-in slide-in-from-top-2">
            <p className="font-semibold mb-1">
              {isCorrect ? 'Correct!' : 'Not quite right.'}
            </p>
            <div className="text-muted-foreground">
              <MathText isStreaming={isStreaming} messageId={messageId} usedLatexTracker={usedLatexTracker}>{question.explanation}</MathText>
            </div>
          </div>
        )}

        {!issubmitted && (
          <button
            onClick={handleSubmit}
            disabled={!selectedOption}
            className="w-full mt-2 py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            Check Answer
          </button>
        )}
      </div>
    </div>
  );
}

// Track used LaTeX blocks per message to prevent duplicates across tabs
// Use WeakMap to allow garbage collection when messages are removed
const messageLatexTracker = new Map<string, Set<string>>();

export default function ExplanationTabs({ message, isStreaming = false }: ExplanationTabsProps) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:613',message:'ExplanationTabs: Message content analysis',data:{messageId:message.id,hasContent:!!message.content,contentLength:message.content?.length || 0,contentPreview:message.content?.substring(0,300) || '',hasExplanationModes:!!message.explanationModes,hasIntuitive:!!message.explanationModes?.intuitive,contentHasDoubleDollar:message.content?.includes('$$') || false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  
  const explanationData = getExplanationData(message);
  const { settings } = useSettingsStore();
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:616',message:'ExplanationTabs: Explanation data analysis',data:{hasExplanationData:!!explanationData,hasIntuitive:!!explanationData?.intuitive,hasStructured:!!explanationData?.structured,hasFormal:!!explanationData?.formal,intuitiveOverview:explanationData?.intuitive?.overview?.substring(0,200) || '',intuitiveOverviewHasDoubleDollar:explanationData?.intuitive?.overview?.includes('$$') || false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  
  // Get or create tracker for this message
  // Use useRef to ensure we get the same tracker instance across renders
  // This prevents the tracker from being reset on re-renders
  // BUT: Clear it if the message ID changes (new message)
  const messageTrackerRef = useRef<{ messageId: string; tracker: Set<string> } | null>(null);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:597',message:'Tracker initialization check',data:{messageId:message.id,hasRef:!!messageTrackerRef.current,refMessageId:messageTrackerRef.current?.messageId,mapHasMessage:messageLatexTracker.has(message.id),mapSize:messageLatexTracker.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  
  // Always get/create tracker from Map (don't rely on ref persistence)
  if (!messageLatexTracker.has(message.id)) {
    messageLatexTracker.set(message.id, new Set<string>());
    if (process.env.NODE_ENV === 'development') {
      console.log('[ExplanationTabs] Created new tracker for message:', message.id);
    }
  }
  
  const messageTracker = messageLatexTracker.get(message.id)!;
  
  // CRITICAL FIX: Always clear tracker if it has content on component mount/render
  // The tracker should be empty at the start of each render cycle
  // If it has content, it's stale from a previous render and needs to be cleared
  if (messageTracker.size > 0) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:640',message:'FIX: Clearing tracker with stale content',data:{messageId:message.id,trackerSize:messageTracker.size,trackerContents:Array.from(messageTracker),refMessageId:messageTrackerRef.current?.messageId,refExists:!!messageTrackerRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    messageTracker.clear();
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ExplanationTabs] Cleared stale tracker for message:', message.id, 'had', messageTracker.size, 'items');
    }
  }
  
  // Update ref to point to current tracker
  messageTrackerRef.current = {
    messageId: message.id,
    tracker: messageTracker
  };
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/bd0d9cda-d397-4b39-86b6-08c2ed085f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExplanationTabs.tsx:625',message:'Final tracker state',data:{messageId:message.id,trackerSize:messageTracker.size,trackerContents:Array.from(messageTracker)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[ExplanationTabs] Using tracker for message:', message.id, 'size:', messageTracker.size, 'contents:', Array.from(messageTracker));
  }
  
  // Debug: log when we can't parse explanation data
  if (!explanationData && message.content?.includes('"intuitive"')) {
    console.warn('ExplanationTabs: Could not parse message with intuitive content', {
      hasExplanationModes: !!message.explanationModes,
      contentStart: message.content?.substring(0, 100),
    });
  }
  
  // No structured data - show as plain text/markdown
  if (!explanationData) {
    return (
      <div className="text-base text-foreground leading-[1.7]">
        <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{message.content}</MathText>
      </div>
    );
  }

  const { intuitive, structured, formal, keyTakeaway, practiceQuestion, suggestedFollowUp } = explanationData;

  // Check if this is a simple conversational message (greeting, small talk, etc.)
  // If only plainExplanation exists and others are empty, show simplified view
  const isSimpleMessage = 
    intuitive.plainExplanation &&
    !intuitive.analogy &&
    !intuitive.visualDescription &&
    !intuitive.scientificTerm &&
    (!structured.steps || structured.steps.length === 0) &&
    (!formal.definition || formal.definition === '');

  // Show simplified card for greetings and simple responses
  if (isSimpleMessage) {
    return (
      <div className="text-base text-foreground leading-[1.7]">
        <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{intuitive.plainExplanation}</MathText>
      </div>
    );
  }

  // Quick Answer Mode - Single unified view (Legacy/Simplified)
  // We can inject Key Takeaway here too if we want, but keeping it simple for now
  if (settings?.explanationMode === 'quick') {
    return (
      <div className="space-y-6">
        {/* Key Takeaway Banner */}
        {keyTakeaway && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Key Takeaway</p>
                <div className="text-base text-foreground leading-relaxed">
                  <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{keyTakeaway}</MathText>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Title with scientific term */}
        {intuitive.scientificTerm && (
          <h3 className="text-lg font-medium text-foreground">{intuitive.scientificTerm}</h3>
        )}

        {/* Main explanation */}
        {intuitive.plainExplanation && (
          <div className="text-base text-foreground leading-[1.7]">
            <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{intuitive.plainExplanation}</MathText>
          </div>
        )}

        {/* Analogy if available */}
        {intuitive.analogy && (
          <div className="pl-4 border-l-2 border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Analogy</p>
            <div className="text-base text-foreground/80 leading-[1.7]">
              <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{intuitive.analogy}</MathText>
            </div>
          </div>
        )}

        {/* Key formula */}
        {formal.notation && (
          <div className="my-6">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Formula</p>
            <div className="text-center py-4 bg-muted rounded">
              <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{formal.notation}</MathText>
            </div>
          </div>
        )}

        {/* Practice Question */}
        {practiceQuestion && <PracticeQuestionCard question={practiceQuestion} isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Takeaway Banner */}
      {keyTakeaway && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex gap-3">
            <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Key Takeaway</p>
              <div className="text-base text-foreground leading-relaxed">
                <MathText>{keyTakeaway}</MathText>
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="intuitive" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
          <TabsTrigger value="intuitive">
            Intuitive
          </TabsTrigger>
          <TabsTrigger value="structured">
            Structured
          </TabsTrigger>
          <TabsTrigger value="formal">
            Formal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intuitive" className="mt-6 space-y-6">
          {intuitive.analogy && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Analogy</h4>
              <div className="text-base text-foreground leading-[1.7]">
                <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{intuitive.analogy}</MathText>
              </div>
            </div>
          )}
          
          {intuitive.plainExplanation && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Explanation</h4>
              <div className="text-base text-foreground leading-[1.7]">
                <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{intuitive.plainExplanation}</MathText>
              </div>
            </div>
          )}
          
          {intuitive.visualDescription && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Visual Description</h4>
              <div className="text-base text-foreground leading-[1.7]">
                <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{intuitive.visualDescription}</MathText>
              </div>
            </div>
          )}
          
          {intuitive.scientificTerm && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Scientific Term</h4>
              <p className="text-base text-foreground">{intuitive.scientificTerm}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="structured" className="mt-6 space-y-6">
          {structured.steps && structured.steps.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Steps</h4>
              <div className="space-y-5">
                {structured.steps.map((step: any, i: number) => (
                  <div key={i} className="pl-4 border-l border-border">
                    <h5 className="font-medium text-foreground mb-2">
                      {step.stepNumber}. {step.title}
                    </h5>
                    <div className="text-base text-foreground/80 leading-[1.7] mb-3">
                      <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{step.content}</MathText>
                    </div>
                    {step.example && (
                      <div className="text-base text-muted-foreground leading-[1.7]">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Example: </span>
                        <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{step.example}</MathText>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {structured.commonMistakes && structured.commonMistakes.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Common Mistakes</h4>
              <ul className="space-y-2 text-base text-foreground leading-[1.7]">
                {structured.commonMistakes.map((mistake: string, i: number) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span className="flex-1"><MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{mistake}</MathText></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {structured.examRelevance && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Exam Relevance</h4>
              <div className="text-base text-foreground leading-[1.7]">
                <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{structured.examRelevance}</MathText>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="formal" className="mt-6 space-y-6">
          {formal.definition && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Definition</h4>
              <div className="text-base text-foreground leading-[1.7]">
                <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{formal.definition}</MathText>
              </div>
            </div>
          )}
          
          {formal.notation && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Mathematical Notation</h4>
              <div className="bg-muted p-4 rounded">
                <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{formal.notation}</MathText>
              </div>
            </div>
          )}
          
          {formal.conditions && formal.conditions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Conditions</h4>
              <ul className="space-y-2 text-base text-foreground leading-[1.7]">
                {formal.conditions.map((condition: string, i: number) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span className="flex-1"><MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{condition}</MathText></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {formal.relatedConcepts && formal.relatedConcepts.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Related Concepts</h4>
              <div className="flex flex-wrap gap-2">
                {formal.relatedConcepts.map((concept: string, i: number) => (
                  <span key={i} className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded">{concept}</span>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Practice Question */}
      {practiceQuestion && <PracticeQuestionCard question={practiceQuestion} isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker} />}

      {/* Suggested Follow-ups */}
      {suggestedFollowUp && suggestedFollowUp.length > 0 && (
        <div className="pt-4 mt-6 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Try Asking</p>
          <div className="flex flex-wrap gap-2">
            {suggestedFollowUp.map((question: string, i: number) => (
              <button 
                key={i} 
                className="text-sm bg-muted hover:bg-muted/80 px-3 py-2 rounded-lg text-left transition-colors flex items-center gap-2 group"
                onClick={() => {
                  // In a real implementation this would trigger the chat input
                  // For now it's just a display suggestion
                }}
              >
                <span>{question}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Referenced Materials */}
      {message.referencedMaterials && message.referencedMaterials.length > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Referenced Materials</p>
          <div className="space-y-1">
            {message.referencedMaterials.map((ref, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {ref.materialName}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
