Now I have comprehensive research. Let me write the full technical guide.

# Building Inline AI-Powered Visualizations in a Study Chatbot

Claude's March 2026 inline visualization feature works by generating self-contained HTML/SVG code that the frontend renders **sandboxed inside the chat flow** — not as a side panel artifact, but as an ephemeral, interactive widget between chat bubbles. You can replicate this fully with the Anthropic API + React. Here's the complete technical breakdown. [mindstudio](https://www.mindstudio.ai/blog/what-is-claude-whiteboard-visualization-feature/)

***

## 1. Rendering Pipeline Architecture

The pipeline has three stages: **model output → parse → sandboxed render**. The model emits a fenced code block (or a `tool_use` call) containing HTML/SVG. The React frontend detects it, extracts the code, and injects it into an isolated renderer. Under the hood, Claude writes HTML and SVG code to render visual components on the fly — essentially a mini web app inside the chat window. [linkedin](https://www.linkedin.com/posts/eric-vyacheslav-156273169_you-can-now-make-claude-draw-charts-mid-conversation-activity-7438615227979436034-brAI)

### Approach Comparison

| Method | Isolation | Interactivity | Complexity | Best For |
|---|---|---|---|---|
| **`<iframe srcdoc>` + `sandbox`** | ★★★★★ | Full JS | Low | Production chatbots |
| **Shadow DOM** | ★★★ | CSS-isolated | Medium | Simple SVG/CSS only |
| **Direct `dangerouslySetInnerHTML`** | ★ (none) | Full JS | Very low | Never — XSS risk |
| **Blob URL iframe** | ★★★★ | Full JS | Medium | Alternative to srcdoc |

**Winner: `<iframe srcdoc>` with the `sandbox` attribute.** This is what Claude's UI, LibreChat, and Open WebUI  all use. It gives you a fully isolated browsing context where injected JS can't access the parent's DOM, cookies, or `localStorage`. [docs.openwebui](https://docs.openwebui.com/features/chat-conversations/chat-features/code-execution/)

### Secure Iframe Renderer (React)

```tsx
// VisualizationFrame.tsx
import { useRef, useEffect, useState } from 'react';

interface VisualizationFrameProps {
  html: string;
  title?: string;
}

export function VisualizationFrame({ html, title }: VisualizationFrameProps) {
  const [height, setHeight] = useState(300);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for postMessage height updates from the iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'resize' && typeof e.data.height === 'number') {
        setHeight(Math.min(e.data.height + 16, 800)); // cap at 800px
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Inject auto-resize script into the HTML
  const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; overflow: hidden; }
  </style>
</head>
<body>
  ${html}
  <script>
    // Auto-resize parent
    const observer = new ResizeObserver(() => {
      parent.postMessage({ type: 'resize', height: document.body.scrollHeight }, '*');
    });
    observer.observe(document.body);
    parent.postMessage({ type: 'resize', height: document.body.scrollHeight }, '*');
  </script>
</body>
</html>`;

  return (
    <div className="visualization-wrapper" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
      {title && <div className="viz-title">{title}</div>}
      <iframe
        ref={iframeRef}
        srcDoc={wrappedHtml}
        title={title ?? 'Visualization'}
        height={height}
        style={{ width: '100%', border: 'none', display: 'block' }}
        // KEY: sandbox flags — no parent access, no navigation, no popups
        // allow-scripts enables JS; omit allow-same-origin to block DOM parent access
        sandbox="allow-scripts"
      />
    </div>
  );
}
```

### Security Considerations

The single most critical rule is: **never combine `allow-same-origin` with `allow-scripts`** in the sandbox attribute. Together, they allow injected JS to escape the iframe and read your parent document. The safe configuration is `sandbox="allow-scripts"` only, which treats the iframe as a cross-origin document. Additional hardening: [developer.mozilla](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc)

- Add a **Content Security Policy** header: `Content-Security-Policy: frame-src 'none'; frame-ancestors 'none'` on your API server
- Use `srcdoc` (not a `src` URL) so no network request is made for the frame document
- For SVG-only outputs, render with `<img src="data:image/svg+xml,..." />` — completely blocks JS
- LibreChat uses CodeSandbox's Sandpack library as an alternative sandboxing strategy [librechat](https://www.librechat.ai/docs/features/artifacts)

***

## 2. Prompting Strategy

### System Prompt Template

The key is to define a strict **output contract** — tell the model exactly what format triggers rendering, what libraries it can use, and when to prefer visuals over prose.

```
## Visualization Protocol

You are an educational assistant. When a concept would be clearer as a visual,
generate an interactive visualization using the following format:

<visualization title="Descriptive Title">
<!DOCTYPE html>
... self-contained HTML with inline CSS and JS ...
</visualization>

### Rules for visualization content:
- All code must be self-contained in a single HTML block (no external fetches)
- You MAY import from: https://cdn.jsdelivr.net/npm/chart.js, 
  https://d3js.org/d3.v7.min.js, https://cdn.jsdelivr.net/npm/mermaid
- Use a white background; style for 600px max-width
- Include interactive elements (sliders, hover tooltips, clickable nodes) when useful
- Keep JS under 150 lines; prefer SVG over Canvas for static/semi-static diagrams

### When to generate a visualization (trigger conditions):
✅ DO visualize: mathematical functions, data comparisons (3+ items), 
   flowcharts/processes, timelines, concept maps with relationships,
   sorting/algorithm animations, geographic data, hierarchical trees
❌ DO NOT visualize: single facts, short lists (<3 items), prose explanations,
   conversational replies, simple definitions
```

### Visualization Trigger Logic

The model decides autonomously when to draw vs. explain, based on cues like:
- **Data density** — 3+ data points being compared → chart
- **Process/sequence** — "how does X work" → flowchart
- **Spatial relationships** — "show the structure of" → diagram
- **Mathematical** — equations with variables → interactive graph
- **Temporal** — events over time → timeline

You can reinforce this with a few-shot example in your system prompt showing a "bad" (text-only) response vs. a "good" (visualization) response to a data question.

***

## 3. Library Selection for Study Chatbots

All of these are CDN-importable (no bundler required in the iframe):

| Library | Best For | Bundle Size | Interactivity |
|---|---|---|---|
| **Mermaid.js** | Flowcharts, sequence, class, Gantt diagrams | ~2MB | Low (click events only) |
| **D3.js v7** | Force graphs, custom layouts, concept maps | ~270KB | High (full SVG manipulation) |
| **Chart.js** | Bar, line, pie, radar charts | ~200KB | Medium (built-in tooltips/zoom) |
| **Plotly.js** | Scientific graphs, 3D, equation plots | ~3MB | High (but heavy) |
| **Recharts** | React-native charts | ~500KB | High |

**Recommendation for a study chatbot:** Use **Mermaid.js for diagrams** (flowcharts, concept maps, timelines) and **Chart.js for data charts**. Both are lightweight enough to import inline, and Mermaid's text-based syntax is extremely reliable for LLM output. Open WebUI already ships Mermaid rendering out-of-the-box. [docs.openwebui](https://docs.openwebui.com/features/chat-conversations/chat-features/code-execution/)

***

## 4. Open-Source Implementation Patterns

**Open WebUI** is the richest reference: it renders Mermaid diagrams natively, HTML/SVG as Interactive Artifacts (sandboxed iframes), and Python plots via a base64 data-URL → file-URL pipeline. The source is in `src/lib/components/chat/Messages/CodeBlock.svelte`. [docs.openwebui](https://docs.openwebui.com/features/chat-conversations/chat-features/code-execution/python/)

**LibreChat** uses CodeSandbox's Sandpack library to render `text/html` artifacts in a secure sandbox. Their system prompt (visible in GitHub discussions) uses a custom `:::artifact{type="text/html"}` remark-directive markdown syntax to mark renderable code. [github](https://github.com/danny-avila/LibreChat/discussions/5393)

**Reddit's Open WebUI community** built an "Inline Visualizer" combining a `tool.py` (rendering handler) + `skill.md` (model instruction file) that works with any LLM, not just Claude. This is the closest open-source equivalent to Claude's March 2026 feature. [reddit](https://www.reddit.com/r/OpenWebUI/comments/1rsy61w/claude_just_got_dynamic_interactive_inline/)

### Message Parser (React)

```tsx
// parseMessageContent.ts
// Splits a raw message string into text and visualization segments

export type Segment =
  | { type: 'text'; content: string }
  | { type: 'visualization'; html: string; title: string };

const VIZ_REGEX = /<visualization title="([^"]*)">([\s\S]*?)<\/visualization>/g;

export function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of raw.matchAll(VIZ_REGEX)) {
    const [fullMatch, title, html] = match;
    const start = match.index!;
    if (start > lastIndex) {
      segments.push({ type: 'text', content: raw.slice(lastIndex, start) });
    }
    segments.push({ type: 'visualization', html: html.trim(), title });
    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: 'text', content: raw.slice(lastIndex) });
  }
  return segments;
}
```

```tsx
// MessageBubble.tsx
import ReactMarkdown from 'react-markdown';
import { parseSegments } from './parseMessageContent';
import { VisualizationFrame } from './VisualizationFrame';

export function MessageBubble({ content }: { content: string }) {
  const segments = parseSegments(content);
  return (
    <div className="message">
      {segments.map((seg, i) =>
        seg.type === 'text'
          ? <ReactMarkdown key={i}>{seg.content}</ReactMarkdown>
          : <VisualizationFrame key={i} html={seg.html} title={seg.title} />
      )}
    </div>
  );
}
```

***

## 5. Study-Specific Visualization Use Cases

For an educational chatbot, the highest-value visualization types are:

- **Concept maps** — nodes + edges showing relationships between terms (D3 force layout or Mermaid `graph TD`)
- **Flowcharts** — algorithms, decision trees, biological processes (Mermaid `flowchart`)
- **Mathematical function graphs** — interactive sliders for parameter exploration (D3 + SVG or Plotly)
- **Timelines** — historical events, project milestones (custom SVG or vis-timeline)
- **Comparison tables / radar charts** — comparing properties of multiple entities (Chart.js radar)
- **Algorithm animations** — sorting, tree traversal (custom JS with `setTimeout`)
- **Data distributions** — histogram, box plot for statistics lessons (Chart.js)

**Trigger heuristic for education:** Visualize whenever a question contains words like "compare," "explain how," "show the relationship," "over time," "steps to," "structure of," or any math with variables.

***

## 6. Anthropic `tool_use` Implementation

Using Claude's function calling is the most **reliable** way to get structured, renderable output — the model signals intent explicitly rather than hoping it formats prose correctly. [docs.aimlapi](https://docs.aimlapi.com/capabilities/anthropic)

### Tool Schema

```python
import anthropic

client = anthropic.Anthropic()

RENDER_VISUALIZATION_TOOL = {
    "name": "render_visualization",
    "description": (
        "Generate an interactive visualization (chart, diagram, graph, animation) "
        "to explain a concept visually. Call this when a visual would be clearer "
        "than text — e.g., data comparisons, processes, mathematical functions, "
        "concept maps, timelines, or algorithm animations."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Short descriptive title shown above the visualization"
            },
            "visualization_type": {
                "type": "string",
                "enum": [
                    "bar_chart", "line_chart", "pie_chart", "scatter_plot",
                    "flowchart", "concept_map", "timeline", "equation_graph",
                    "tree_diagram", "comparison_table", "custom_animation"
                ],
                "description": "The type of visualization to generate"
            },
            "html_content": {
                "type": "string",
                "description": (
                    "Complete, self-contained HTML with inline CSS and JavaScript. "
                    "Must render correctly in an isolated iframe with no external "
                    "network access except CDN imports. Max 600px wide."
                )
            },
            "explanation": {
                "type": "string",
                "description": "1-2 sentence explanation of what the visualization shows, displayed below it"
            }
        },
        "required": ["title", "visualization_type", "html_content", "explanation"]
    }
}
```

### API Call + Tool Result Handling

```python
def chat_with_visualizations(user_message: str, history: list) -> dict:
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4096,
        system=SYSTEM_PROMPT,  # your educational system prompt
        tools=[RENDER_VISUALIZATION_TOOL],
        messages=history + [{"role": "user", "content": user_message}]
    )

    result = {"text": "", "visualization": None}

    for block in response.content:
        if block.type == "text":
            result["text"] += block.text
        elif block.type == "tool_use" and block.name == "render_visualization":
            result["visualization"] = block.input  # dict with title, html_content, etc.

    # If tool was used, we must send back a tool_result to continue
    if response.stop_reason == "tool_use":
        tool_use_block = next(b for b in response.content if b.type == "tool_use")
        # Send tool result back to get final text response
        followup = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=[RENDER_VISUALIZATION_TOOL],
            messages=history + [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": response.content},
                {
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": tool_use_block.id,
                        "content": "Visualization rendered successfully."
                    }]
                }
            ]
        )
        result["text"] = followup.content[0].text if followup.content else ""

    return result
```

### React Hook Integration

```tsx
// useChatWithViz.ts
import { useState } from 'react';

export function useChatWithViz() {
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = async (text: string) => {
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: messages })
    });
    const data = await res.json();
    // data = { text: string, visualization: { title, html_content, explanation } | null }

    setMessages(prev => [...prev, {
      role: 'assistant',
      text: data.text,
      visualization: data.visualization  // null or visualization object
    }]);
  };

  return { messages, sendMessage };
}
```

***

## Recommended Tech Stack

For a React + Anthropic API study chatbot with inline visualizations:

- **Frontend:** React + TypeScript, `react-markdown` + `remark-gfm` for Markdown, `<iframe srcdoc sandbox="allow-scripts">` for visualization rendering
- **Visualization libraries (in-iframe CDN):** Mermaid.js (diagrams), Chart.js (data), D3.js (complex custom layouts)
- **Backend:** Node.js/Express or Next.js API route calling `@anthropic-ai/sdk`
- **Trigger method:** `tool_use` with `render_visualization` schema (most reliable) or regex-parsed `<visualization>` tags (simpler, good for prototyping)
- **Security baseline:** `sandbox="allow-scripts"` (no `allow-same-origin`), CSP header on your server, `srcdoc` not `src`

The `tool_use` approach gives you explicit intent signals from the model, structured metadata per visualization, and a clean separation between the rendered visual and the conversational text. The tag-parsing approach requires less roundtrip logic and is easier to stream. For a study chatbot, start with tag-parsing and migrate to `tool_use` once you want the model to control visualization type and parameters explicitly. [anthropic](https://www.anthropic.com/engineering/advanced-tool-use)