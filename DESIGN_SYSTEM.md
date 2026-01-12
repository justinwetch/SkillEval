# 🎨 Skill Evaluator Design System

> Extracted from the **Bloom GUI** (Anthropic fork by Justin Wetch)  
> Reference: `bloom-design-ref/gui/src/`

---

## 1. Design Philosophy

The Bloom GUI embodies a **warm, professional aesthetic** inspired by Anthropic's Claude branding. Key principles:

- **Warm Neutrals**: No cold grays — all neutrals have brown/amber undertones
- **Coral/Terracotta Accent**: A distinctive orange-coral accent (`#DA7756`) that feels human and approachable
- **Semantic Color Usage**: Colors convey meaning — issues highlighted in warm amber/red tones, success in muted sage green
- **Restrained Elegance**: Minimal color usage, letting typography and whitespace breathe
- **Dark-First with Light Option**: Dark mode default, with a warm cream light mode variant

---

## 2. Color Palette

### 2.1 Base Colors (Dark Mode — Default)

```css
/* Background Hierarchy */
--color-bg-primary: #1C1B18;      /* Main background - warm charcoal */
--color-bg-secondary: #262520;    /* Cards, panels */
--color-bg-tertiary: #32302B;     /* Input fields, code blocks */
--color-bg-elevated: #3A3835;     /* Hover states, elevated surfaces */

/* Text Hierarchy */
--color-text-primary: #F5F4F2;    /* Headings, primary content */
--color-text-secondary: #B8B5AD;  /* Body text, descriptions */
--color-text-muted: #8A867D;      /* Labels, hints, metadata */

/* Borders */
--color-border: #3D3A35;          /* Default borders */
--color-border-hover: #524F48;    /* Hover state borders */
```

### 2.2 Base Colors (Light Mode)

```css
[data-theme="light"] {
  --color-bg-primary: #FAF9F7;    /* Warm cream */
  --color-bg-secondary: #FFFFFF;   /* Pure white cards */
  --color-bg-tertiary: #F0EDE8;   /* Warm off-white */
  --color-bg-elevated: #FFFFFF;

  --color-text-primary: #1A1915;  /* Near-black with warmth */
  --color-text-secondary: #524E45;
  --color-text-muted: #7A766C;

  --color-border: #D5D0C6;
  --color-border-hover: #B8B3A8;
}
```

### 2.3 Accent Colors

```css
/* Primary Accent - Coral/Terracotta */
--color-accent: #DA7756;          /* Primary buttons, links, highlights */
--color-accent-hover: #E8886A;    /* Hover state */
--color-accent-subtle: rgba(218, 119, 86, 0.15);  /* Background tint */

/* Light mode variant */
--color-accent: #E07830;          /* Slightly more orange for visibility */
--color-accent-hover: #D06820;
```

### 2.4 Semantic / Status Colors

```css
/* Status Indicators */
--color-success: #7B9E7F;         /* Sage green — approachable, not clinical */
--color-warning: #D4A853;         /* Golden amber */
--color-error: #C45C3E;           /* Deep terracotta red */
--color-info: #7A9BBE;            /* Muted steel blue */

/* Score Semantics (for evaluation metrics) */
--color-score-neutral: var(--color-text-primary);  /* Default score display */
--color-score-good: #7B9E7F;                       /* Low concern scores */
--color-score-concern: #DA7756;                    /* Medium concern */
--color-score-high-concern: #C45C3E;               /* High concern */
```

### 2.5 Message/Role Colors

```css
/* Conversation Thread Roles */
.role-evaluator { 
  border-left-color: #7A9BBE;  /* Steel blue */
  background-color: rgba(122, 155, 190, 0.08);
}
.role-target { 
  border-left-color: #7B9E7F;  /* Sage green */
  background-color: rgba(123, 158, 127, 0.08);
}
.role-tool { 
  border-left-color: #D4A853;  /* Amber/gold */
  background-color: rgba(212, 168, 83, 0.08);
}
.role-system { 
  border-left-color: #9B8ABE;  /* Soft purple */
  background-color: rgba(155, 138, 190, 0.08);
}
```

---

## 3. Typography

### 3.1 Font Family

```css
--font-serif: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

> **Note**: Both `--font-serif` and `--font-sans` are set to DM Sans. The naming allows future differentiation.

### 3.2 Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| H1 | 2.25rem (36px) | 600 | 1.3 | -0.01em |
| H2 | 1.75rem (28px) | 600 | 1.3 | -0.01em |
| H3 | 1.375rem (22px) | 600 | 1.3 | -0.01em |
| H4 | 1.125rem (18px) | 600 | 1.4 | — |
| Body | 1rem (16px) | 400 | 1.7 | — |
| Small/Labels | 0.875rem (14px) | 400-500 | — | — |
| Tiny/Hints | 0.75rem (12px) | 400 | — | — |

### 3.3 Metric Display

```css
.metric-primary {
  font-size: 3.5rem;      /* Large hero numbers */
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.02em;
}

.metric-secondary {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
}

.metric-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}
```

---

## 4. Spacing Scale

```css
--space-xs: 0.5rem;    /* 8px */
--space-sm: 0.75rem;   /* 12px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
--space-3xl: 4rem;     /* 64px */
```

**Common patterns:**
- Card padding: `var(--space-xl)` (32px)
- Section gaps: `var(--space-2xl)` (48px) with `mb-8` or `mb-10`
- Element gaps: `gap-3` to `gap-6` (12-24px)
- Input padding: `px-5 py-4` or `px-4 py-3` (20px/16px horizontal, 16px/12px vertical)

---

## 5. Border Radius

```css
--radius-sm: 8px;      /* Small elements, buttons */
--radius-md: 12px;     /* Inputs, badges, dropdowns */
--radius-lg: 16px;     /* Cards */
--radius-xl: 24px;     /* Large panels, modals */
--radius-full: 9999px; /* Pills, circular elements */
```

**Component mapping:**
- **Cards**: `var(--radius-lg)` — `rounded-xl` in Tailwind
- **Buttons**: `rounded-sm` (8px)
- **Inputs/Selects**: `rounded-xl` (12px)
- **Badges**: `rounded-full`
- **Toggle switches**: `var(--radius-md)` (12px)

---

## 6. Shadows

```css
/* Dark mode - stronger shadows for depth */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.25);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.3);

/* Light mode - more subtle */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.10), 0 2px 4px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
```

**Usage:**
- Cards in light mode get `var(--shadow-sm)` by default
- Hover states increase to `var(--shadow-md)`
- Modals/overlays use `var(--shadow-lg)`

---

## 7. Animations

### 7.1 Keyframes

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes warmGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(218, 119, 86, 0); }
  50% { box-shadow: 0 0 20px 2px rgba(218, 119, 86, 0.15); }
}

@keyframes radialPulse {
  0% { box-shadow: 0 0 0 0 rgba(218, 119, 86, 0.5); }
  50% { box-shadow: 0 0 0 12px rgba(218, 119, 86, 0); }
  100% { box-shadow: 0 0 0 0 rgba(218, 119, 86, 0); }
}
```

### 7.2 Utility Classes

```css
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-slide-up { animation: slideUp 0.4s ease-out; }
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.animate-radial-pulse { animation: radialPulse 2s ease-out infinite; }
```

### 7.3 Transition Defaults

```css
/* Standard transitions */
transition: all 0.2s ease;
transition: border-color 0.2s ease, box-shadow 0.2s ease;
transition: background-color 0.2s ease, color 0.2s ease;

/* For opening/closing panels */
transition: transform 0.15s ease;

/* Icon rotations (chevrons) */
.rotate-180 { transform: rotate(180deg); }
```

---

## 8. Component Patterns

### 8.1 Card

```jsx
/* Base card styles (from index.css) */
.card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  border-color: var(--color-border-hover);
}

.card-interactive {
  cursor: pointer;
}

.card-interactive:hover {
  background-color: var(--color-bg-tertiary);
}

.card-accent {
  border-color: var(--color-accent);
  background-color: var(--color-accent-subtle);
}
```

**React Component Props:**
- `interactive` — adds hover background change
- `accent` — coral border + subtle background for highlights
- `className` — additional classes

### 8.2 Button

**Variants:**
| Variant | Background | Text | Border |
|---------|------------|------|--------|
| `primary` | `--color-accent` | White | None |
| `secondary` | `--color-bg-tertiary` | `--color-text-primary` | `--color-border` |
| `ghost` | Transparent | `--color-text-secondary` | None |
| `danger` | `--color-error` | White | None |

**Sizes:**
| Size | Padding | Font Size |
|------|---------|-----------|
| `sm` | `px-3 py-1.5` | `text-sm` |
| `md` | `px-5 py-2.5` | `text-sm` |
| `lg` | `px-7 py-3` | `text-base` |

**Features:**
- Loading state with spinner
- Disabled state with `opacity-50`
- `rounded-sm` (8px radius)
- Icon + text support via `gap-2`

### 8.3 Badge

**Variants:**
| Variant | Background | Text |
|---------|------------|------|
| `default` | `--color-bg-tertiary` | `--color-text-secondary` |
| `success` | `success/15` | `--color-success` |
| `warning` | `warning/15` | `--color-warning` |
| `error` | `error/15` | `--color-error` |
| `info` | `info/15` | `--color-info` |
| `accent` | `--color-accent-subtle` | `--color-accent` |

**Sizes:**
- `sm`: `px-2 py-0.5 text-xs`
- `md`: `px-3 py-1 text-xs`
- `lg`: `px-4 py-1.5 text-sm`

**Shape:** `rounded-full` (pill)

### 8.4 Input Fields

```jsx
className="w-full bg-[var(--color-bg-tertiary)] 
           border border-[var(--color-border)] 
           rounded-xl 
           px-5 py-4 
           text-[var(--color-text-primary)] 
           placeholder:text-[var(--color-text-muted)] 
           focus:outline-none 
           focus:border-[var(--color-accent)] 
           transition-colors"
```

**Key features:**
- Generous padding (`px-5 py-4` = 20px/16px)
- Focus state: border changes to accent color
- No focus ring, just border color change
- `rounded-xl` (12px)

### 8.5 Select Dropdowns

Same styling as inputs, plus:
```css
select {
  padding-right: 2.5rem !important;
  background-image: url("data:image/svg+xml,..."); /* Custom chevron */
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  appearance: none;
}
```

### 8.6 Checkboxes

Custom-styled:
```css
input[type="checkbox"] {
  appearance: none;
  width: 1rem;
  height: 1rem;
  border: 1.5px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-bg-tertiary);
}

input[type="checkbox"]:checked {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
}

input[type="checkbox"]:checked::after {
  /* White checkmark via border technique */
}
```

### 8.7 Progress Bar

```jsx
<div className="w-full bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden h-2.5">
  <div 
    className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[#B85D3F] 
               transition-all duration-500 ease-out rounded-full"
    style={{ width: `${percentage}%` }}
  />
</div>
```

**Key features:**
- Gradient fill from coral to deeper terracotta
- Smooth width transition (500ms)
- Height options: `h-1.5`, `h-2.5`, `h-3`

### 8.8 Tooltip

```jsx
<span className="tooltip-trigger">
  ?
  <span className="tooltip-content">{content}</span>
</span>
```

**Styling:**
- Trigger: 16x16px circle with `?`
- Content: 240px wide, appears above
- Arrow via CSS borders
- Fade in with 0.15s transition

---

## 9. Layout Patterns

### 9.1 Page Structure

```jsx
<div className="min-h-screen bg-[var(--color-bg-primary)]">
  {/* Fixed Header */}
  <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--color-border)]">
    <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
      {/* Logo + Nav */}
    </div>
  </header>

  {/* Main Content */}
  <main className="pt-16 min-h-screen pb-16">
    <div className="max-w-7xl mx-auto px-8 py-10">
      {/* Page content */}
    </div>
  </main>

  {/* Footer */}
  <footer className="border-t border-[var(--color-border)] py-4 bg-[var(--color-bg-secondary)]">
    {/* Footer content */}
  </footer>
</div>
```

**Key values:**
- Max width: `max-w-7xl` (1280px)
- Horizontal padding: `px-8` (32px)
- Header height: `h-16` (64px)

### 9.2 Glass Effect (Headers)

```css
.glass {
  background: rgba(28, 27, 24, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

[data-theme="light"] .glass {
  background: rgba(250, 249, 247, 0.9);
}
```

### 9.3 Two-Column Layout (Dashboard)

```jsx
<div className="grid grid-cols-3 gap-8">
  <div className="col-span-2 space-y-6">
    {/* Main content */}
  </div>
  <div className="space-y-6">
    {/* Sidebar */}
  </div>
</div>
```

### 9.4 Metric Grid

```jsx
<div className="grid grid-cols-6 gap-4 mb-10">
  <Card className="text-center flex flex-col justify-center">
    <div className="metric-label mb-3">Metric Name</div>
    <div className="metric-secondary">{value}</div>
    <div className="text-xs text-[var(--color-text-muted)] mt-2">subtitle</div>
  </Card>
  {/* ... more cards */}
</div>
```

### 9.5 Section Dividers

```jsx
<div className="mb-6">
  <div className="flex items-center gap-4">
    <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-widest">
      Section Title
    </div>
    <div className="flex-1 h-px bg-[var(--color-border)]"></div>
  </div>
</div>
```

---

## 10. Page Header Pattern

```jsx
{/* Page Header */}
<div className="mb-6">
  <h1 className="text-3xl text-[var(--color-text-primary)] mb-2">
    Page Title
  </h1>
  <p className="text-[var(--color-text-secondary)] text-lg">
    Subtitle or description
  </p>
</div>

{/* Action Buttons Row */}
<div className="flex items-center justify-between mb-8">
  <div className="flex gap-3">
    {/* Left-aligned buttons */}
  </div>
  <Button size="md">
    {/* Primary action */}
  </Button>
</div>
```

---

## 11. Filter/Sort Controls Pattern

```jsx
<div className="flex items-center justify-between mb-8">
  {/* Left: Filter buttons */}
  <div className="flex gap-2 items-center">
    {filters.map(f => (
      <button
        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          active === f.id
            ? 'bg-[var(--color-accent)] text-white'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'
        }`}
      >
        {f.label}
      </button>
    ))}
  </div>

  {/* Right: Sort controls */}
  <div className="flex items-center gap-4">
    <span className="text-sm text-[var(--color-text-muted)]">Sort by</span>
    <select className="...">...</select>
    <button className="p-2 rounded-xl bg-[var(--color-bg-tertiary)]">
      {/* Sort direction icon */}
    </button>
  </div>
</div>
```

---

## 12. Message/Thread Pattern

```jsx
<div className="p-5 rounded-xl border-l-[6px] role-evaluator">
  <div className="text-xs font-medium text-[#7A9BBE] mb-3 uppercase tracking-wide">
    Evaluator
  </div>
  <div className="text-sm text-[var(--color-text-primary)] leading-relaxed">
    {content}
  </div>
</div>
```

**Key features:**
- 6px left border in role color
- Subtle tinted background
- Role label uppercase with tracking
- Content with relaxed line-height

---

## 13. Error/Warning States

```jsx
{/* Error Card */}
<Card className="border-[var(--color-error)]/50 bg-[var(--color-error)]/10">
  <p className="text-[var(--color-error)]">{error}</p>
</Card>

{/* Warning Card with Icon */}
<Card className="border-[var(--color-warning)]/50 bg-[var(--color-warning)]/10">
  <div className="flex items-start gap-3">
    <svg className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5">
      {/* Warning triangle icon */}
    </svg>
    <div>
      <p className="text-[var(--color-warning)] font-medium">Warning Title</p>
      <p className="text-[var(--color-text-secondary)] text-sm mt-1">
        Warning details...
      </p>
    </div>
  </div>
</Card>
```

---

## 14. Stepped Form Pattern

```jsx
<Card className="mb-8">
  <div className="flex items-center gap-4 mb-6">
    <div className="w-10 h-10 rounded-full bg-[var(--color-accent-subtle)] 
                    flex items-center justify-center text-[var(--color-accent)] font-semibold">
      1
    </div>
    <h2 className="text-xl text-[var(--color-text-primary)]" 
        style={{ fontFamily: 'var(--font-serif)' }}>
      Step Title
    </h2>
    <Badge variant="accent" size="sm">Optional Badge</Badge>
  </div>
  
  {/* Step content */}
</Card>
```

---

## 15. Expandable/Collapsible Sections

```jsx
<Card>
  <button
    onClick={() => setExpanded(!expanded)}
    className="flex items-center justify-between w-full"
  >
    <span className="font-medium text-[var(--color-text-primary)]">
      Section Title
    </span>
    <svg className={`w-5 h-5 text-[var(--color-text-secondary)] transition-transform ${
      expanded ? 'rotate-180' : ''
    }`}>
      {/* Chevron down */}
    </svg>
  </button>

  {expanded && (
    <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
      {/* Expanded content */}
    </div>
  )}
</Card>
```

---

## 16. Scrollbar Styling

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-hover);
}
```

---

## 17. Icon Guidelines

**Size conventions:**
- Inline with text: `w-4 h-4`
- Button icons: `w-4 h-4` to `w-5 h-5`
- Decorative/large: `w-6 h-6` to `w-16 h-16`

**Stroke styling:**
- `stroke="currentColor"` for color inheritance
- `strokeWidth={1.5}` or `strokeWidth={2}`
- `strokeLinecap="round"` and `strokeLinejoin="round"`

**Common icons used:**
- Chevrons (up/down/left/right)
- Plus, Minus
- Key (API keys)
- Info circle
- Warning triangle
- Checkmark
- X/Close
- Search magnifying glass
- Refresh/reload
- External link

---

## 18. Focus States

```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* For inputs that handle their own focus */
.no-focus-ring:focus-visible {
  outline: none;
}
```

---

## 19. Application to Skill Evaluator

When building Skill Evaluator, apply these patterns:

1. **Use the CSS variables** — copy the `:root` and `[data-theme="light"]` blocks
2. **Import DM Sans** from Google Fonts
3. **Maintain the warm palette** — no cold blues/grays
4. **Card-based layouts** — everything lives in cards
5. **Generous whitespace** — `gap-4` to `gap-6`, `mb-8` between sections
6. **Consistent input styling** — `rounded-xl`, focus border change
7. **Badge for metadata** — transcript counts, status indicators
8. **Role colors for A/B comparison** — use role colors for Skill A vs Skill B
9. **Semantic score colors** — highlight concerning scores only
10. **Settings in localStorage** — same pattern as API key storage

---

## 20. File Structure Reference

```
gui/src/
├── index.css          # All CSS variables, globals, utilities
├── App.css            # Minimal, mostly unused
├── components/
│   ├── Badge.jsx      # Status badges
│   ├── Button.jsx     # Primary UI button
│   ├── Card.jsx       # Container component
│   ├── Layout.jsx     # Page shell with header/footer
│   ├── ProgressBar.jsx # Gradient progress indicator
│   └── RadarChart.jsx # SVG radar/spider chart
├── contexts/
│   └── ThemeContext.jsx # Dark/light mode
├── views/
│   ├── HomeView.jsx     # Landing page with evaluations list
│   ├── ConfigureView.jsx # Multi-step configuration form
│   ├── DashboardView.jsx # Evaluation results dashboard
│   ├── TranscriptView.jsx # Individual transcript viewer
│   └── ProgressView.jsx  # Running evaluation progress
└── utils/
    └── colors.js        # Score color logic
```

---

*This design system was extracted on January 12, 2026 from the Bloom GUI fork.*
