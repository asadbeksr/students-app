import type { ChatMessage } from '@/types';
import { ExplanationModes } from './prompts';

/**
 * Convert AI response to markdown format with LaTeX preserved
 */
export function messageToMarkdown(message: ChatMessage, explanationMode: 'quick' | 'deep' = 'deep'): string {
  if (!message.explanationModes) {
    return message.content;
  }

  try {
    const intuitive = JSON.parse(message.explanationModes.intuitive);
    const structured = JSON.parse(message.explanationModes.structured);
    const formal = JSON.parse(message.explanationModes.formal);

    if (explanationMode === 'quick') {
      return formatQuickMode(intuitive, structured, formal);
    } else {
      return formatDeepMode(intuitive, structured, formal);
    }
  } catch {
    return message.content;
  }
}

function formatQuickMode(
  intuitive: ExplanationModes['intuitive'],
  _structured: ExplanationModes['structured'],
  formal: ExplanationModes['formal']
): string {
  let markdown = '';

  // Title with scientific term if available
  if (intuitive.scientificTerm) {
    markdown += `# ${intuitive.scientificTerm}\n\n`;
  }

  // Main explanation
  if (intuitive.plainExplanation) {
    markdown += `${intuitive.plainExplanation}\n\n`;
  }

  // Analogy if available
  if (intuitive.analogy) {
    markdown += `**Analogy:** ${intuitive.analogy}\n\n`;
  }

  // Key formula if available
  if (formal.notation) {
    markdown += `**Formula:**\n\n$$${formal.notation}$$\n\n`;
  }

  // Important conditions if any
  if (formal.conditions && formal.conditions.length > 0) {
    markdown += `**Key Points:**\n\n`;
    formal.conditions.forEach(condition => {
      markdown += `- ${condition}\n`;
    });
    markdown += '\n';
  }

  return markdown;
}

function formatDeepMode(
  intuitive: ExplanationModes['intuitive'],
  structured: ExplanationModes['structured'],
  formal: ExplanationModes['formal']
): string {
  let markdown = '';

  // Title
  if (intuitive.scientificTerm) {
    markdown += `# ${intuitive.scientificTerm}\n\n`;
  }

  // Intuitive Section
  markdown += `## Intuitive Understanding\n\n`;

  if (intuitive.analogy) {
    markdown += `### Analogy\n\n${intuitive.analogy}\n\n`;
  }

  if (intuitive.plainExplanation) {
    markdown += `### Explanation\n\n${intuitive.plainExplanation}\n\n`;
  }

  if (intuitive.visualDescription) {
    markdown += `### Visual Description\n\n${intuitive.visualDescription}\n\n`;
  }

  // Structured Section
  if (structured.steps && structured.steps.length > 0) {
    markdown += `## Step-by-Step Guide\n\n`;
    structured.steps.forEach((step) => {
      markdown += `### ${step.stepNumber}. ${step.title}\n\n`;
      markdown += `${step.content}\n\n`;
      if (step.example) {
        markdown += `**Example:** ${step.example}\n\n`;
      }
    });
  }

  if (structured.commonMistakes && structured.commonMistakes.length > 0) {
    markdown += `### Common Mistakes\n\n`;
    structured.commonMistakes.forEach(mistake => {
      markdown += `- ${mistake}\n`;
    });
    markdown += '\n';
  }

  if (structured.examRelevance) {
    markdown += `### Exam Relevance\n\n${structured.examRelevance}\n\n`;
  }

  // Formal Section
  markdown += `## Formal Definition\n\n`;

  if (formal.definition) {
    markdown += `${formal.definition}\n\n`;
  }

  if (formal.notation) {
    markdown += `### Mathematical Notation\n\n$$${formal.notation}$$\n\n`;
  }

  if (formal.conditions && formal.conditions.length > 0) {
    markdown += `### Conditions\n\n`;
    formal.conditions.forEach(condition => {
      markdown += `- ${condition}\n`;
    });
    markdown += '\n';
  }

  if (formal.relatedConcepts && formal.relatedConcepts.length > 0) {
    markdown += `### Related Concepts\n\n`;
    formal.relatedConcepts.forEach(concept => {
      markdown += `- ${concept}\n`;
    });
    markdown += '\n';
  }

  return markdown;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Download markdown as a file
 */
export function downloadMarkdown(markdown: string, filename: string = 'studybuddy-export.md'): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename from message content
 */
export function generateFilename(message: ChatMessage): string {
  try {
    const intuitive = JSON.parse(message.explanationModes?.intuitive || '{}');
    if (intuitive.scientificTerm) {
      const sanitized = intuitive.scientificTerm
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return `${sanitized}.md`;
    }
  } catch {
    // Fall through
  }

  // Fallback to timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  return `studybuddy-${timestamp}.md`;
}

/**
 * Add footer to markdown export
 */
export function addExportFooter(markdown: string): string {
  return markdown + '\n---\n\n*Exported from StudyBuddy*\n';
}
