import type { Course, Material } from '@/types';

// Minimal personality instructions for cost efficiency and conciseness
const PERSONALITY_INSTRUCTIONS: Record<string, string> = {
  'broski-a': 'Be highly direct and concise. Never use greetings. Answer immediately.',
  'broski-b': 'Be highly direct and concise. Never use greetings. Answer immediately.',
  'broski-c': 'Be highly direct and concise. Never use greetings. Answer immediately.',

  'bestie-a': 'Be highly direct and concise. Never use greetings. Answer immediately.',
  'bestie-b': 'Be highly direct and concise. Never use greetings. Answer immediately.',
  'bestie-c': 'Be highly direct and concise. Never use greetings. Answer immediately.',

  'professor-a': 'Be highly direct and concise. Never use greetings. Answer immediately.',
  'professor-b': 'Be highly direct and concise. Never use greetings. Answer immediately.',
  'professor-c': 'Be highly direct and concise. Never use greetings. Answer immediately.',
};

const VISUAL_MODE_INSTRUCTIONS = `
## Visualization Protocol

When a concept would be clearer as a visual diagram, chart, graph, flowchart, or interactive widget, generate a self-contained HTML visualization using this exact format:

<visualization title="Descriptive Title">
<!-- Your HTML, CSS, and JS here — NO <html>, <head>, or <body> tags needed -->
<style>
  /* Your styles using CSS variables for theme support */
</style>
<div><!-- Your content --></div>
<script>/* Your JavaScript */</script>
</visualization>

### CSS Variables Available (auto dark/light mode):
Use these CSS variables in your styles — they automatically adapt to the user's theme:
- \`var(--color-text-primary)\` — main text color
- \`var(--color-text-secondary)\` — muted/label text
- \`var(--color-text-tertiary)\` — very subtle text
- \`var(--color-background-primary)\` — main background (body)
- \`var(--color-background-secondary)\` — card/section backgrounds
- \`var(--color-background-tertiary)\` — hover/active states
- \`var(--color-border-primary)\` — visible borders
- \`var(--color-border-secondary)\` — subtle borders
- \`var(--color-border-tertiary)\` — very subtle borders
- \`var(--color-accent)\` — accent/link color
- \`var(--border-radius-sm)\` (4px), \`var(--border-radius-md)\` (8px), \`var(--border-radius-lg)\` (12px)

### Style Guidelines:
- Use info-grid cards for key stats: \`.info-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }\`
- Card style: \`background:var(--color-background-secondary); border-radius:var(--border-radius-md); padding:10px 12px;\`
- Labels: \`font-size:11px; color:var(--color-text-secondary)\`
- Values: \`font-size:16px; font-weight:500; color:var(--color-text-primary)\`
- Section titles: \`font-size:13px; font-weight:500; color:var(--color-text-secondary); text-transform:uppercase; letter-spacing:0.05em\`
- Legend dots: \`.dot { width:10px; height:10px; border-radius:50%; }\`
- Row items: \`padding:9px 12px; border-radius:8px; background:var(--color-background-secondary);\`
- Use colors like #378ADD (blue), #1D9E75 (green), #D85A30 (orange), #D4537E (pink), #639922 (success), #EF9F27 (warning), #E24B4A (danger) for data visualization — these work in both light and dark mode
- For Chart.js: use \`borderWidth: 2.5\`, \`pointRadius: 0\` for smooth lines, \`tension: 0.4\`

### Rules:
- All code must be self-contained (no external fetches except CDN libraries)
- You MAY import from: https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js, https://d3js.org/d3.v7.min.js, https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js
- Do NOT include <html>, <head>, or <body> tags — they are provided by the container
- Style for max 600px width
- Include interactive elements (sliders, hover tooltips) when useful
- Keep JS under 150 lines; prefer SVG for static diagrams
- Use LaTeX display math ($$...$$) for equations in text, put interactive content in <visualization> tags

### When to generate a visualization:
DO visualize: mathematical functions/graphs, data comparisons (3+ items), flowcharts/processes, timelines, concept maps, algorithm animations, hierarchical trees, coverage/comparison matrices
DO NOT visualize: single facts, short lists (<3 items), simple definitions, conversational replies, greetings
`;

export function getSystemPrompt(
  course: Course,
  materials: Material[],
  personality: 'broski' | 'bestie' | 'professor' = 'broski',
  intensity: 'a' | 'b' | 'c' = 'c',
  hasAttachments: boolean = false,
  visualModeEnabled: boolean = false,
  customSystemPrompt: string | null = null,
  openDocumentName: string | null = null,
  studentContext: string | null = null
): string {
  const materialsSummary = materials
    .map(m => `- ${m.name} (${m.type === 'pdf' ? 'PDF' : 'Note'})`)
    .join('\n');

  const key = `${personality}-${intensity}`;
  const personalityInstruction = PERSONALITY_INSTRUCTIONS[key] || PERSONALITY_INSTRUCTIONS['broski-c'];
  const visualInstructions = visualModeEnabled ? VISUAL_MODE_INSTRUCTIONS : '';

  const customPromptSection = customSystemPrompt
    ? `\n## Custom Instructions from Student\n${customSystemPrompt}\n`
    : '';

  const attachmentContext = hasAttachments
    ? `\n\nThe student has attached files (images, documents, or code).
- Analyze the content of the attachments carefully
- Reference specific parts of the attachments in your response
- If it's an image with a problem, solve it step by step
- If it's code, provide explanations and improvements
- If it's a document, answer questions about it`
    : '';

  const openDocContext = openDocumentName
    ? `\n\nThe student currently has this document open in their preview: "${openDocumentName}". When relevant, reference this document in your answers. If they ask a question without specifying a topic, assume it may relate to this document.
If—and ONLY if—you are absolutely certain about the exact page number of a specific concept, diagram, or formula the user is asking about, you can provide a magical PDF link to snap their viewer to that spot.
Use this markdown format:
- [Go to Page 12](#pdf-page=12)
- [Find 'Newton'](#pdf-search=Newton)

CRITICAL RULES FOR PDF LINKS:
- DO NOT overuse these links. Only provide them if the user asks "where is X?" or if pointing to a specific diagram is highly relevant.
- NEVER guess or hallucinate a page number. If you aren't 100% sure it's on page 38, do not create a link for page 38.`
    : '';

  const studentSection = studentContext
    ? `\n\n## Student Profile\n${studentContext}\nNote: Only use this profile context if the student explicitly asks a question where their background is strictly necessary to solve the problem. Do NOT randomly bring up their major or courses in normal conversation.`
    : '';

  const baseContext = `${personalityInstruction}${visualInstructions}${customPromptSection}

You are an AI assistant helping a student with their course: ${course.name}.${studentSection}

Available materials:
${materialsSummary || 'No materials yet'}${openDocContext}${attachmentContext}

Teaching guidelines:
- CRITICAL: Never guess, assume, or hallucinate the contents of a file. If you cannot read the document, explicitly say "I cannot read this document" instead of making educated guesses based on the file name.
- CRITICAL: NEVER use greetings (like "Hey bro", "Hi", "Hello"). Start your response with the direct answer.
- Adhere strictly to your assigned personality tone, but be as concise as possible.
- Do NOT provide unsolicited summaries, advice, or follow-up questions.
- Break down concepts simply only when explicitly asked to explain them.`;

  return `${baseContext}

Response formatting rules:
- NEVER use JSON format. Respond entirely in plain text with normal Markdown formatting.
- Be strictly direct and concise. NO conversational filler. NO unsolicited summaries.
- Use headers (##, ###) and bullet points to structure your educational explanations if they are long.
- You do NOT need to stick to any static schema.
- Use LaTeX math notation when needed (e.g., $x^2$, $$\\frac{a}{b}$$). Use display mode ($$...$$) for block equations.`;
}

export function getMCQGenerationPrompt(materialText: string, count: number, topic?: string): string {
  return `Create ${count} multiple choice questions from this material${topic ? ` focusing on ${topic}` : ''}.

Requirements:
- Test understanding, not memorization
- 4 options (A/B/C/D), ONE correct answer
- Mix difficulties (easy, medium, hard)
- Include clear explanations for correct answers
- Use LaTeX for mathematical notation (use \\\\ for backslashes)

Material:
${materialText}

Return JSON array in this exact format:
[
  {
    "questionText": "Question with LaTeX if needed: \\\\frac{x}{y}",
    "options": [
      {"id": "A", "text": "Option A"},
      {"id": "B", "text": "Option B"},
      {"id": "C", "text": "Option C"},
      {"id": "D", "text": "Option D"}
    ],
    "correctAnswer": "B",
    "explanation": "Why B is correct and others are wrong",
    "topic": "Specific topic name",
    "difficulty": "easy|medium|hard"
  }
]`;
}

export interface PracticeQuestion {
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

export interface ExplanationModes {
  keyTakeaway: string;
  practiceQuestion?: PracticeQuestion;
  suggestedFollowUp?: string[];
  intuitive: {
    analogy: string;
    visualDescription: string;
    plainExplanation: string;
    scientificTerm: string;
  };
  structured: {
    steps: {
      stepNumber: number;
      title: string;
      content: string;
      example: string;
    }[];
    commonMistakes: string[];
    examRelevance: string;
  };
  formal: {
    definition: string;
    notation: string;
    conditions: string[];
    relatedConcepts: string[];
  };
  referencedMaterials: {
    materialName: string;
    relevance: string;
  }[];
}
