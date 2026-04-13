Here is a comprehensive `design.md` file inspired by the **Arc for Students** website design, structured specifically for AI agents to easily reference and implement.

***

# Design System Inspired by Arc for Students

## 1. Visual Theme & Atmosphere
The Arc for Students website embodies a "digital scrapbook meets modern app" aesthetic. It breaks away from traditional, sterile software marketing by embracing a playful, tactile, and highly personalized atmosphere. The design mimics the core philosophy of the Arc Browser itself: customizable, soft, friendly, and deeply organized. 

Unlike the dark, engineered precision of Linear, Arc's native medium is a warm, bright canvas filled with glassmorphic layers, expressive gradients, and a tactile "sticker-book" feel. Information is organized into heavily rounded, floating cards that resemble physical polaroids or notebook widgets. The visual tone is optimistic, energetic, and highly student-centric, using subtle grain overlays and vibrant accent colors that make the UI feel alive and physical rather than purely digital.

**Key Characteristics:**
- **Warm, tactile canvas:** Soft off-white backgrounds with subtle noise/grain textures.
- **Glassmorphism & Blur:** Translucent panels with deep background blur (`backdrop-filter`) that let underlying gradients peek through.
- **Extreme border radii:** UI elements heavily favor roundness (16px to 24px for cards) mimicking the Arc browser's own rounded viewport.
- **"Sticker" mentality:** Floating elements, rotated badges, and playful emojis that break the grid.
- **Expressive gradients:** Fluid, pastel-to-vibrant mesh gradients used behind glass panels.
- **Chunky, friendly typography:** High-contrast weight changes, using clean, geometric sans-serifs that look good large.

## 2. Color Palette & Roles

### Background Surfaces
- **Canvas White (`#FAF9F6` or `#F5F5F3`):** The primary page background. A warm, paper-like off-white that prevents the harshness of pure white.
- **Glass Surface (`rgba(255, 255, 255, 0.65)`):** Used for primary cards and floating panels. Always paired with a `backdrop-filter: blur(20px)`.
- **Elevated Surface (`#FFFFFF`):** Pure white used sparingly for the top-most elevated cards to make them pop against the off-white canvas.

### Text & Content
- **Primary Ink (`#1A1A1C`):** Near-black with a warm undertone for maximum readability on hero headlines and primary body text.
- **Secondary Ink (`#66666D`):** Medium gray for subheadings, metadata, and secondary descriptions.
- **Subtle Ink (`#9999A1`):** Lighter gray for placeholders and tertiary info.

### Brand & Accents (The "Theme" Colors)
Arc is famous for letting users theme their browser, and the website reflects this with varied, vibrant accents:
- **Arc Brand Pink (`#FF6B8B`):** Used for primary highlights and energetic calls to action.
- **Student Blue (`#424AFB`):** A deep, vibrant blue often used for trust, tech-focused elements, and links.
- **Space Purple (`#9D72FF`):** Used for creative categories or gradient meshes.
- **Success Mint (`#34C759`):** Bright, optimistic green for checkmarks and positive states.

### Borders & Dividers
- **Glass Border (`rgba(0, 0, 0, 0.04)`):** Whisper-thin borders that define glassmorphic shapes without adding visual weight.
- **Solid Outline (`#E5E5E5`):** Standard divider for list items or solid cards.
- **Focus Ring (`rgba(66, 74, 251, 0.4)`):** A soft, glowing blue ring for keyboard accessibility.

## 3. Typography Rules

### Font Family
- **Primary Sans:** A friendly geometric/humanist sans-serif (e.g., custom Arc fonts, Roobert, or a stylized system-ui stack).
- **Secondary / Display:** Often a playful serif or a chunky rounded sans for specific callouts to give it a "poster" feel.

### Hierarchy
| Role | Font Size | Weight | Line Height | Letter Spacing | Notes |
|------|-----------|--------|-------------|----------------|-------|
| Display Large | 84px (5.25rem) | 700 (Bold) | 1.05 | -0.04em | Massive hero text ("You are brilliant.") |
| Display Medium| 56px (3.50rem) | 700 (Bold) | 1.10 | -0.03em | Major section headers ("Features so good...") |
| Heading 1 | 40px (2.50rem) | 600 (Semibold)| 1.20 | -0.02em | Card titles, callouts |
| Heading 2 | 24px (1.50rem) | 600 (Semibold)| 1.30 | -0.01em | Small card headers |
| Body Large | 20px (1.25rem) | 400 (Regular)| 1.50 | normal | Intro paragraphs, subtitles |
| Body Standard | 16px (1.00rem) | 400 (Regular)| 1.60 | normal | Main reading text |
| Body Medium | 16px (1.00rem) | 500 (Medium) | 1.60 | normal | Buttons, navigation links |
| Caption | 14px (0.88rem) | 400 (Regular)| 1.50 | normal | Small metadata, tags |

### Principles
- **Chunky and Friendly:** The typography never feels aggressive. It uses tighter letter-spacing on massive display text to feel cohesive, but relies on soft curves.
- **High Contrast Weights:** Pairing a 700-weight massive headline directly above a 400-weight soft gray subtitle.

## 4. Component Stylings

### Buttons
**Primary Download/CTA Button**
- **Background:** `#1A1A1C` (Solid dark) or Vibrant Accent (`#424AFB`)
- **Text:** `#FFFFFF`
- **Padding:** 16px 32px (Generous and highly tappable)
- **Radius:** 9999px (Pill shape)
- **Hover:** Transform `scale(1.02)` and a soft drop shadow `rgba(0,0,0,0.15) 0px 8px 16px`. Arc buttons feel springy and responsive.

**Secondary/Glass Button**
- **Background:** `rgba(255, 255, 255, 0.5)`
- **Backdrop Filter:** `blur(12px)`
- **Border:** 1px solid `rgba(0, 0, 0, 0.05)`
- **Text:** `#1A1A1C`
- **Radius:** 9999px (Pill shape)
- **Hover:** Background shifts to `rgba(255, 255, 255, 0.8)`.

### Cards & Spaces (The "Browser" Look)
Arc's entire aesthetic revolves around floating cards that resemble tabs or spaces.
- **Glass Card:** - Background: `rgba(255, 255, 255, 0.65)`
  - Border: 1px solid `rgba(255, 255, 255, 0.4)` (inner glow) AND 1px solid `rgba(0, 0, 0, 0.04)` (outer definition).
  - Radius: 24px (Extremely round).
  - Shadow: `rgba(0, 0, 0, 0.06) 0px 12px 32px` (Large, soft, and diffuse).
- **Solid Feature Card:**
  - Background: `#FFFFFF`
  - Radius: 16px
  - Border: 1px solid `#E5E5E5`

### Stickers & Badges
- Used dynamically to break the grid.
- **Rotation:** Often rotated by -5deg to 5deg.
- **Shadow:** Drop-shadow `rgba(0,0,0,0.1) 0px 4px 10px` to look like a physical sticker slightly peeling off the page.

## 5. Layout Principles

### Spacing & Grid
- **Generous and Airy:** Sections have massive padding (often 120px+ vertically) to let the floating elements breathe.
- **Overlap is Encouraged:** Unlike strict corporate grids, Arc's layout often has images, stickers, or small cards slightly overlapping the boundaries of larger cards to create depth.

### Whitespace Philosophy
- Whitespace is used as a physical desk. The background is the desk, and the UI components are papers, polaroids, and stickers dropped onto it. 

### Border Radius Scale
- **Small (8px):** Inputs, small internal tags.
- **Medium (16px):** Standard internal cards, images.
- **Large (24px - 32px):** Major layout panels, mimicking the Arc browser window.
- **Pill (9999px):** All buttons and badges.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| **Base (Canvas)** | `#FAF9F6` solid with faint CSS noise overlay | The background desk |
| **Flat (Paper)** | `#FFFFFF` with 1px solid `rgba(0,0,0,0.05)`, no shadow | Secondary content cards |
| **Glass (Floating)** | `rgba(255,255,255,0.65)`, `blur(20px)`, shadow `0px 12px 32px rgba(0,0,0,0.06)` | Primary layout containers, navigation |
| **Sticker (Pop)** | Solid background, `scale(1.05)` on hover, shadow `0 8px 16px rgba(0,0,0,0.12)` | Floating interactive badges, emojis |

**Shadow Philosophy:** Shadows are never harsh. They are large, highly blurred, and very low opacity. Elevation is communicated through *blurring the background* rather than just casting a dark shadow.

## 7. Do's and Don'ts

### Do
- Do use heavy border radii (24px+) for main containers.
- Do implement `backdrop-filter: blur(20px)` heavily for top-level navigation and floating panels.
- Do mix playful, vibrant accent colors inside soft, off-white environments.
- Do allow elements (like images or badges) to break out of their bounding boxes.
- Do use pill-shaped (9999px radius) buttons.
- Do add a subtle noise/grain texture to the background to give it a physical feel.

### Don't
- Don't use pure black (`#000000`) for backgrounds or heavy dark modes. The Arc vibe is bright and airy.
- Don't use sharp corners (0px radius) anywhere except full-bleed background sections.
- Don't use harsh, small drop shadows. Shadows must be diffuse and large.
- Don't confine everything to a rigid, invisible grid. Add slight rotations (`transform: rotate(-2deg)`) to decorative elements.

## 8. Responsive Behavior

### Breakpoints
- **Mobile (<768px):** The "scrapbook" layout stacks. Glassmorphic cards become full width, but maintain their heavy rounded corners (padding on the left/right of the screen remains).
- **Desktop (>768px):** Asymmetric grids emerge. Side-by-side floating panels (resembling split-view in the browser).

### Touch Targets & Interactions
- Buttons remain massive on mobile.
- "Hover" states (which scale up elements) are replaced by active/tap states on mobile with a slight scale *down* (`scale(0.98)`) to mimic a physical button press.

## 9. Agent Prompt Guide

### Example Component Prompts
- **Hero Section:** "Create a hero section on a `#FAF9F6` background. Display headline 'You are brilliant.' at 84px bold, `#1A1A1C`, letter-spacing -0.04em. Add a dynamic mesh gradient blob in the background (`#FF6B8B` to `#424AFB`). Place a primary CTA button: pill-shaped, `#1A1A1C` background, white text, 16px 32px padding."
- **Glass Feature Card:** "Design a floating feature card. Background `rgba(255, 255, 255, 0.65)`, `backdrop-filter: blur(20px)`. Border radius 24px. Border `1px solid rgba(0,0,0,0.04)`. Add a soft shadow `0 12px 32px rgba(0,0,0,0.06)`. Title 24px semibold `#1A1A1C`."
- **Playful Badge/Sticker:** "Create a floating sticker element reading 'A+ Students'. Background `#34C759`, text `#FFFFFF`, bold 14px. Padding 8px 16px, pill radius. Rotate the element by `-3deg` and add a shadow `0 4px 12px rgba(0,0,0,0.1)` to make it look like a physical sticker."
- **Browser Mockup Container:** "Create a container that mimics the Arc browser window. Border radius 16px, 1px solid `rgba(0,0,0,0.1)`, with an internal left sidebar taking up 25% of the width on desktop, featuring a glassmorphic background."

### Iteration Guide
1. **Soften everything:** If it looks too rigid, increase the border radius and soften the shadow.
2. **Add a glass layer:** If a solid color feels too heavy, convert it to `rgba` and add a backdrop blur over a colorful background element.
3. **Break the grid:** If it looks like a standard corporate SaaS site, take a decorative element (an icon, a badge, a picture) and position it absolutely so it hangs halfway off the edge of a card.