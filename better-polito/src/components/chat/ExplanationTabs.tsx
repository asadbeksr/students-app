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
import { parseStreamingSegments, hasVisualizations } from '@/lib/parseMessageContent';
import { VisualizationFrame, VisualizationSkeleton } from '@/components/chat/VisualizationFrame';
import { ManimFrame, ManimSkeleton } from '@/components/chat/ManimFrame';

// Custom rehype plugin to preserve original LaTeX in data attributes
function rehypePreserveLatex(): any {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName === 'span' || node.tagName === 'div') {
        const className = (node.properties?.className as string[]) || [];
        if (className.includes('math') || className.includes('math-display') || className.includes('katex-display')) {
          const annotation = node.children?.find(
            (child: any) => child.type === 'element' && child.tagName === 'annotation'
          ) as any;

          if (annotation) {
            const latex = annotation.children?.find((c: any) => c.type === 'text')?.value;
            if (latex) {
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
      if (node.tagName === 'div') {
        const className = (node.properties?.className as string[]) || [];
        const classNameStr = Array.isArray(className) ? className.join(' ') : (className || '');

        if (classNameStr && (classNameStr.includes('math-display') || classNameStr.includes('katex-display'))) {
          if (!node.properties) node.properties = {};
          (node.properties as any)['data-math-block'] = 'true';
        }
      }
    });
  };
}

// Component to render text with LaTeX math support
function MathText({ children, isStreaming = false, usedLatexTracker }: {
  children: string;
  isStreaming?: boolean;
  messageId?: string;
  usedLatexTracker?: Set<string>;
}) {
  if (!children) return null;
  const { settings } = useSettingsStore();
  const visualModeEnabled = settings?.visualMode?.enabled ?? true;

  // During streaming: Always show KaTeX fallback (no visual blocks)
  const shouldRenderVisualBlocks = visualModeEnabled && !isStreaming;

  // Extract LaTeX from $$...$$ blocks before processing for fallback matching
  const latexBlocks = useMemo(() => {
    const blocks: Array<{ original: string; latex: string }> = [];
    if (shouldRenderVisualBlocks) {
      const matches = Array.from(children.matchAll(/\$\$([^$]+)\$\$/g));
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        blocks.push({ original: match[0], latex: match[1].trim() });
      }
    }
    return blocks;
  }, [children, shouldRenderVisualBlocks]);

  const localTrackerRef = useRef<Set<string>>(new Set());
  const tracker = usedLatexTracker || localTrackerRef.current;

  const markdownProps: any = {
    remarkPlugins: [remarkMath, remarkGfm],
    rehypePlugins: [rehypeKatex, rehypePreserveLatex, rehypeReplaceMathBlocks],
    components: {
        div: ({ node, className, children: divChildren, ...props }: any) => {
          const classNameStr = Array.isArray(className) ? className.join(' ') : (className || '');

          const isDisplayMathDiv = classNameStr && (
            classNameStr.includes('math-display') ||
            classNameStr.includes('katex-display') ||
            (classNameStr.includes('katex') && !classNameStr.includes('katex-html'))
          );

          const hasMathChildren = node?.children?.some((child: any) => {
            const childClassName = child.properties?.className;
            const childClassNameStr = Array.isArray(childClassName) ? childClassName.join(' ') : (childClassName || '');
            return childClassNameStr && (childClassNameStr.includes('katex') || childClassNameStr.includes('math'));
          });

          const hasMathBlockMarker = (node?.properties as any)?.['data-math-block'] === 'true';

          if ((hasMathBlockMarker || isDisplayMathDiv || hasMathChildren) && shouldRenderVisualBlocks) {
            let latex = extractLatexFromNode(node, latexBlocks);

            let latexToUse: string | null = null;

            if (latex) {
              if (!tracker.has(latex)) {
                latexToUse = latex;
              } else {
                const normalizedLatex = latex.replace(/\s+/g, '').trim();
                const block = latexBlocks.find(b => b.latex === latex || b.latex.replace(/\s+/g, '').trim() === normalizedLatex);
                if (block && !tracker.has(block.latex)) {
                  latexToUse = block.latex;
                }
              }
            }

            if (!latexToUse && latexBlocks.length > 0) {
              const unusedBlock = latexBlocks.find(b => !tracker.has(b.latex));
              if (unusedBlock) {
                latexToUse = unusedBlock.latex;
              }
            }

            if (latexToUse) {
              tracker.add(latexToUse);
              return (
                <MathBlockRenderer
                  latex={latexToUse}
                  fallback={<div className={className} {...props}>{divChildren}</div>}
                />
              );
            }
          }
          return <div className={className} {...props}>{divChildren}</div>;
        },
        span: ({ className, children: spanChildren, ...props }: any) => {
          return <span className={className} {...props}>{spanChildren}</span>;
        },
        p: ({ node, children, ...props }: any) => {
          if (shouldRenderVisualBlocks && latexBlocks.length > 0) {
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
        code: ({ children, className }: any) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">{children}</code>
          ) : (
            <code className="block bg-muted p-4 rounded text-sm font-mono overflow-x-auto leading-relaxed">{children}</code>
          );
        },
        ul: ({ children }: any) => <ul className="space-y-2 mb-4">{children}</ul>,
        ol: ({ children }: any) => <ol className="space-y-2 mb-4">{children}</ol>,
        li: ({ children }: any) => <li className="leading-[1.7]">{children}</li>,
        a: ({ node, href, children, ...props }: any) => {
          if (href?.startsWith('#pdf-')) {
            return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('pdf-navigate', { detail: href.replace('#pdf-', '') }));
                }}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded text-sm font-medium transition-colors"
              >
                {children}
              </button>
            );
          }
          return <a href={href} {...props} className="text-primary hover:underline" target={href?.startsWith('http') ? '_blank' : undefined}>{children}</a>
        }
    }
  };

  if (hasVisualizations(children)) {
    return (
      <div className="relative">
        {parseStreamingSegments(children).map((seg, i) => {
          if (seg.type === 'text') {
            return (
              <ReactMarkdown key={i} {...markdownProps as any}>
                {seg.content}
              </ReactMarkdown>
            );
          } else if (seg.type === 'visualization') {
            return <VisualizationFrame key={i} html={seg.html} title={seg.title} />;
          } else if (seg.type === 'visualization_loading') {
            return <VisualizationSkeleton key={i} title={seg.title} />;
          } else if (seg.type === 'manim') {
            return <ManimFrame key={i} script={seg.script} title={seg.title} />;
          } else if (seg.type === 'manim_loading') {
            return <ManimSkeleton key={i} title={seg.title} />;
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <ReactMarkdown {...markdownProps as any}>
      {children}
    </ReactMarkdown>
  );
}

// Helper to extract LaTeX from rendered KaTeX node
function extractLatexFromNode(node: any, latexBlocks?: Array<{ original: string; latex: string }>): string | null {
  try {
    if (node?.properties) {
      const dataLatex = (node.properties as any)?.['data-latex'] ||
                       (node.properties as any)?.['data-original-latex'];
      if (dataLatex) {
        const latex = typeof dataLatex === 'string' ? dataLatex : dataLatex.value;
        if (latex) return latex;
      }
    }

    const queue = [node];
    while (queue.length > 0) {
      const current = queue.shift();

      if (current?.tagName === 'annotation') {
        if (current.children && Array.isArray(current.children)) {
          const textNode = current.children.find((c: any) => c.type === 'text');
          if (textNode?.value) {
            return textNode.value;
          }
          if (current.children[0]?.value) {
            return current.children[0].value;
          }
        }
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

    if (latexBlocks && latexBlocks.length > 0) {
      const textContent = extractTextFromNode(node);
      if (textContent) {
        for (const block of latexBlocks) {
          const normalizedBlock = block.latex.replace(/\s+/g, '').toUpperCase();
          if (normalizedBlock.includes('PV') && normalizedBlock.includes('NRT')) {
            return block.latex;
          }
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
  if (message.explanationModes?.intuitive) {
    try {
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

  const content = message.content?.trim() || '';

  if (content.startsWith('{') || content.includes('"intuitive"')) {
    try {
      let jsonStr = content;

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
const messageLatexTracker = new Map<string, Set<string>>();

export default function ExplanationTabs({ message, isStreaming = false }: ExplanationTabsProps) {
  const explanationData = getExplanationData(message);

  const messageTrackerRef = useRef<{ messageId: string; tracker: Set<string> } | null>(null);

  if (!messageLatexTracker.has(message.id)) {
    messageLatexTracker.set(message.id, new Set<string>());
  }

  const messageTracker = messageLatexTracker.get(message.id)!;

  if (messageTracker.size > 0) {
    messageTracker.clear();
  }

  messageTrackerRef.current = {
    messageId: message.id,
    tracker: messageTracker
  };

  // No structured data - show as plain text/markdown
  if (!explanationData) {
    return (
      <div className="text-base text-foreground leading-[1.7]">
        <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{message.content}</MathText>
      </div>
    );
  }

  const { intuitive, structured, formal, keyTakeaway, practiceQuestion, suggestedFollowUp } = explanationData;

  const isSimpleMessage =
    intuitive.plainExplanation &&
    !intuitive.analogy &&
    !intuitive.visualDescription &&
    !intuitive.scientificTerm &&
    (!structured.steps || structured.steps.length === 0) &&
    (!formal.definition || formal.definition === '');

  if (isSimpleMessage) {
    return (
      <div className="text-base text-foreground leading-[1.7]">
        <MathText isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker}>{intuitive.plainExplanation}</MathText>
      </div>
    );
  }


  return (
    <div className="space-y-6">
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
          <TabsTrigger value="intuitive">Intuitive</TabsTrigger>
          <TabsTrigger value="structured">Structured</TabsTrigger>
          <TabsTrigger value="formal">Formal</TabsTrigger>
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

      {practiceQuestion && <PracticeQuestionCard question={practiceQuestion} isStreaming={isStreaming} messageId={message.id} usedLatexTracker={messageTracker} />}

      {suggestedFollowUp && suggestedFollowUp.length > 0 && (
        <div className="pt-4 mt-6 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Try Asking</p>
          <div className="flex flex-wrap gap-2">
            {suggestedFollowUp.map((question: string, i: number) => (
              <button
                key={i}
                className="text-sm bg-muted hover:bg-muted/80 px-3 py-2 rounded-lg text-left transition-colors flex items-center gap-2 group"
                onClick={() => {}}
              >
                <span>{question}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

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
