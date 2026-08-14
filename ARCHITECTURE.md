# 🧪 Skill Evaluator: Architecture & Development Plan

> Historical note: this document captures an earlier transformation plan and is
> kept for context. For current file ownership and change routing, use
> `AGENTS.md` and `docs/repo-map.md`.

> A high-level planning document for transforming the Multi-Eval Skill Comparison Tool into the open-source **Skill Evaluator** project.

---

## 1. Vision

**Skill Evaluator** is a universal A/B evaluation tool for AI skills. Users can:
- Compare any two `skill.md` files against each other
- Test skills on any domain (coding, writing, design, analysis, etc.)
- Use their own prompts or generate domain-appropriate prompt banks
- Configure what the judge sees (text, screenshots, or both)
- Get detailed scoring and breakdowns

The goal is to be **completely extensible** — not hardcoded to frontend design evaluation.

---

## 2. Current State Analysis

### What Exists Today
| Component | Current State | Hardcoded? |
|-----------|---------------|------------|
| **Prompts** | 50 frontend design prompts in `prompts.json` | ✅ Yes |
| **System Prompt** | User-editable text area | ❌ Flexible |
| **Skill Files** | Upload A/B `.md` files | ❌ Flexible |
| **Judge Criteria** | 5 visual design criteria in `JUDGE_PROMPT` | ✅ Yes |
| **Output Type** | Expects HTML, uses Puppeteer for screenshots | ✅ Yes |
| **API Key** | Stored in localStorage, no warnings | ⚠️ Partial |
| **Model Selection** | Hardcoded to Claude Haiku/Sonnet/Opus | ⚠️ Partial |

### Files to Modify
```
Evals/
├── index.html          → Restructure into Configure + Evaluate flow
├── styles.css          → Adapt to Bloom design system
├── app.js              → Major refactoring for configurability
├── prompts.json        → Replace with dynamic prompt generation
└── screenshot-server.js → Make optional based on eval type
```

---

## 3. Proposed User Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        SKILL EVALUATOR                           │
├──────────────────────────────────────────────────────────────────┤
│  [⚠️ No API Key configured. Add one in Settings to continue.]   │
└──────────────────────────────────────────────────────────────────┘

┌─────────────┬─────────────┬─────────────┐
│  Configure  │   Evaluate  │  Settings   │
└─────────────┴─────────────┴─────────────┘
      ▲
      │ Start here
```

### 3.1 Settings Tab (New)
Global settings that persist across sessions.

**Contents:**
- **API Key Management**
  - Anthropic API key input (required)
  - OpenAI key (optional, for future)
  - Show/hide toggle, validation indicator
  
- **Model Preferences**
  - Default generation model
  - Default judge model
  - Max tokens default

- **Storage Management**
  - Clear all saved data
  - Export/import settings

---

### 3.2 Configure Tab — Skill-First Approach
A streamlined configuration flow where **skill files are the source of truth**.

No preset categories. Instead, the AI reads the uploaded skills and generates appropriate configuration.

#### Step 1: Upload Skills
Upload two skill files to compare. This is the **first step** (after API key).

```
┌─────────────────────────────────────────────────────────────┐
│  Upload Skills to Compare                                    │
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │                         │  │                         │  │
│  │     📄 Skill A          │  │     📄 Skill B          │  │
│  │                         │  │                         │  │
│  │   Drop .md or click     │  │   Drop .md or click     │  │
│  │                         │  │                         │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                             │
│  Recent skills: [skill-v1.md ▼] [skill-v2.md ▼]             │
└─────────────────────────────────────────────────────────────┘
```

**Convenience Features:**
- Preview/expand uploaded skill content
- Recent skills dropdown (from localStorage)
- Paste text directly instead of uploading

---

#### Step 2: Configure Evaluation
A **single unified page** with all configurable fields. Each field can be:
- Auto-generated from skill analysis
- Manually set or edited

**Top-Level Auto-Generation:**
```
┌─────────────────────────────────────────────────────────────┐
│  Configure Evaluation                                        │
│                                                             │
│  [✨ Generate All from Skills]                               │
│  Analyze uploaded skills and auto-fill all fields below     │
└─────────────────────────────────────────────────────────────┘
```

Clicking "Generate All" analyzes both skill files and populates:
- Output type (inferred from skill domain)
- Judge criteria (based on what the skill claims to do)
- Prompt suggestions (appropriate for the skill's focus areas)

---

**Output Type Selection** [✨ Auto]
```
┌─────────────────────────────────────────────────────────────┐
│  What type of output will your skill produce?               │
│                                                             │
│  ○ Text Only                                                │
│    Judge sees the raw text/code output                      │
│                                                             │
│  ○ Visual (Screenshot)                                      │
│    Judge sees rendered screenshots (requires HTML output)   │
│    ⚠️ Requires screenshot server running                   │
│                                                             │
│  ○ Both                                                     │
│    Judge sees screenshots AND source code                   │
└─────────────────────────────────────────────────────────────┘
```

---

**Judge Criteria** [✨ Auto]
```
┌─────────────────────────────────────────────────────────────┐
│  Scoring Criteria                                            │
│                                                             │
│  1. [Criterion Name] ────────────────── (1-5)  [✎] [×]     │
│     Description of what this measures                        │
│                                                             │
│  2. [Criterion Name] ────────────────── (1-5)  [✎] [×]     │
│     Description of what this measures                        │
│                                                             │
│  3. [Criterion Name] ────────────────── (1-5)  [✎] [×]     │
│     Description of what this measures                        │
│                                                             │
│  [+ Add Criterion]                                           │
└─────────────────────────────────────────────────────────────┘
```

Each criterion has:
- Name (e.g., "Prompt Adherence")
- Description (what judges should look for)
- Score range (default 1-5)
- Edit and delete buttons

---

**Prompts** [✨ Auto]
```
┌─────────────────────────────────────────────────────────────┐
│  Test Prompts (12)                                           │
│                                                             │
│  1. "Build a responsive landing page for..."     [✎] [×]   │
│  2. "Create a dark mode toggle..."               [✎] [×]   │
│  3. "Design an accessible form..."               [✎] [×]   │
│  ...                                                        │
│                                                             │
│  [+ Add Prompt]  [📁 Import JSON]  [🔀 Shuffle]             │
└─────────────────────────────────────────────────────────────┘
```

Prompts can be:
- Auto-generated from skills
- Added manually one-by-one
- Imported from a JSON file
- Edited or removed individually

---

#### Step 3: Review & Start
Summary of configuration:
- Skills: `skill-a.md` vs `skill-b.md`
- Output Type: Visual (Screenshot)
- Judge Criteria: 5 criteria configured
- Prompts: 15 prompts loaded

**[🚀 Start Evaluation]**

---

### 3.3 Evaluate Tab
The main evaluation interface (similar to current, but enhanced).

**Persistent Header Warning:**
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ No API key configured. Nothing will work until you add  │
│ one in Settings.                               [Go to Settings] │
└─────────────────────────────────────────────────────────────┘
```

Shows only after configuration is complete (or uses last config).

**Enhancements:**
- Show current config summary at top
- "Reconfigure" button to go back
- Better progress indicators during runs
- Side-by-side result previews

---

## 4. What Needs to Be Un-Hardcoded

### 4.1 Judge Prompt System
**Current:** Single hardcoded `JUDGE_PROMPT` constant with 5 frontend criteria.

**New Architecture:**
```javascript
// Judge prompt templates per category
const JUDGE_TEMPLATES = {
  frontend: { criteria: [...], systemPrompt: '...' },
  backend: { criteria: [...], systemPrompt: '...' },
  writing: { criteria: [...], systemPrompt: '...' },
  // ...
};

// Or fully customizable
state.config.judgeCriteria = [
  { id: 'clarity', name: 'Clarity', description: '...', maxScore: 5 },
  { id: 'accuracy', name: 'Accuracy', description: '...', maxScore: 5 },
  // ...
];
```

The judge prompt is dynamically constructed based on configured criteria.

---

### 4.2 Prompt Bank
**Current:** Hardcoded `prompts.json` with 50 frontend prompts.

**New Architecture:**
```
/prompts/
├── frontend.json       # Default frontend prompts
├── backend.json        # Default backend prompts
├── writing.json        # Default writing prompts
└── custom/             # User-generated banks (localStorage or file)
```

Or store everything in localStorage with import/export.

**Prompt Bank Schema:**
```json
{
  "category": "frontend",
  "name": "Frontend Design Basics",
  "prompts": [
    {
      "id": "1",
      "text": "Design a landing page for...",
      "tags": ["landing", "startup"],
      "difficulty": "medium"
    }
  ]
}
```

---

### 4.3 Output Type Handling
**Current:** Always expects HTML, always tries screenshots.

**New Architecture:**
```javascript
state.config.outputType = 'text' | 'visual' | 'both';

// In judgeEval:
if (state.config.outputType === 'visual' || state.config.outputType === 'both') {
  // Capture screenshots
}

if (state.config.outputType === 'text' || state.config.outputType === 'both') {
  // Include raw output in judge context
}
```

---

### 4.4 Screenshot Server
**Current:** Always required for judging.

**New Architecture:**
- Make optional based on output type
- Show clear status: ✅ Running | ⚠️ Not running (only matters for visual)
- Graceful degradation if not available

---

### 4.5 Auto-Generation Prompt Strategy

The "Generate from Skills" feature requires carefully designed prompts to produce consistent, useful results.

#### What We Send to the API

**Context Payload:**
```javascript
{
  skillA: {
    filename: "frontend-design-v2.md",
    content: "<full skill file content>"
  },
  skillB: {
    filename: "frontend-design-v1.md", 
    content: "<full skill file content>"
  },
  generationType: "all" | "criteria" | "prompts" | "outputType",
  promptCount: 50  // User-configurable, default 50
}
```

**Model & Token Configuration:**
- **Model:** `claude-sonnet-4-20250514` (cost-effective for config generation)
- **Max Tokens:** `8192` (sufficient for 50+ prompts + criteria in JSON)
- **Response Format:** `{ type: "json_object" }` for structured output

> **Note:** Sonnet's 200k context window easily accommodates two full skill files (~10-20k tokens each) plus the system prompt and example (~5k tokens), leaving ample room for generation.

#### System Prompt for Auto-Generation

```
You are a configuration generator for an AI skill evaluation tool.

Given two skill files that will be compared against each other, analyze them and generate appropriate evaluation configuration.

Your task is to understand:
1. What domain/task the skills are designed for
2. What kind of output the skills will produce
3. What criteria would fairly evaluate their outputs
4. What prompts would effectively test their capabilities

## Output Type Inference

Analyze the skill to determine output type:
- "visual" if skills produce HTML/CSS, UI components, or visual artifacts
- "text" if skills produce code, text, data, or non-visual outputs  
- "both" if outputs benefit from seeing both rendered result AND source

## Criteria Generation Guidelines

Generate 4-6 criteria that:
- Are specific to what these skills claim to do
- Can be objectively evaluated (not vague)
- Cover different aspects (correctness, quality, style, edge cases)
- Each have a clear 1-5 scoring rubric

## Prompt Generation Guidelines

Generate the requested number of prompts (user-configurable, default 50) that:
- Actually test what the skills claim to do
- Vary in difficulty (roughly 20% easy, 60% medium, 20% hard)
- Cover different aspects mentioned in the skills
- Are realistic user requests, not artificial tests
- Include edge cases and challenging scenarios
```

#### Example: Frontend Design Skill (Reference Implementation)

This is the example we include in the prompt to show the expected format:

```json
// EXAMPLE INPUT: Two versions of a frontend design skill
// EXAMPLE OUTPUT:
{
  "outputType": "visual",
  "outputTypeReasoning": "Skills produce HTML/CSS components that should be visually evaluated",
  
  "criteria": [
    {
      "id": "prompt_adherence",
      "name": "Prompt Adherence",
      "description": "How well does the output match what was requested?",
      "rubric": {
        "5": "Perfectly matches all requirements with thoughtful extras",
        "4": "Matches all explicit requirements",
        "3": "Matches most requirements, minor omissions",
        "2": "Partial match, significant gaps",
        "1": "Does not address the prompt"
      }
    },
    {
      "id": "visual_polish",
      "name": "Visual Polish",
      "description": "Quality of typography, spacing, color, and visual details",
      "rubric": {
        "5": "Premium, refined visual execution",
        "4": "Clean and professional",
        "3": "Acceptable but generic",
        "2": "Noticeable visual issues",
        "1": "Poor or broken visual presentation"
      }
    },
    {
      "id": "ux_usability",
      "name": "UX & Usability",
      "description": "Interactive elements, accessibility, responsive behavior",
      "rubric": {
        "5": "Excellent UX with thoughtful interactions",
        "4": "Good usability, works well",
        "3": "Functional but could be improved",
        "2": "Usability issues present",
        "1": "Unusable or inaccessible"
      }
    },
    {
      "id": "code_quality",
      "name": "Code Quality",
      "description": "Clean, semantic HTML/CSS, proper structure",
      "rubric": {
        "5": "Exemplary code organization and semantics",
        "4": "Good code quality",
        "3": "Functional but messy",
        "2": "Poor organization or practices",
        "1": "Broken or unmaintainable code"
      }
    },
    {
      "id": "creative_distinction",
      "name": "Creative Distinction",
      "description": "Originality and memorability of the design",
      "rubric": {
        "5": "Highly original, memorable design",
        "4": "Shows creativity beyond templates",
        "3": "Competent but unremarkable",
        "2": "Generic or derivative",
        "1": "No creative effort evident"
      }
    }
  ],
  
  "prompts": [
    "Build a responsive landing page for a SaaS product that helps teams track OKRs",
    "Create a dark mode toggle component with smooth transitions",
    "Design an accessible contact form with validation feedback",
    "Build a pricing table with three tiers and a toggle for monthly/annual",
    "Create a testimonial carousel with customer photos and quotes",
    "Design a mobile navigation menu with hamburger icon animation",
    "Build a hero section with a gradient background and CTA button",
    "Create a footer with newsletter signup and social links",
    "Design a feature comparison grid for a product page",
    "Build a loading skeleton screen for a card-based layout"
  ]
}
```

#### Making Generation Robust

**Key strategies:**

1. **Include the example as few-shot context** — The frontend example above is always included, with a note that it should be adapted to the actual skill domain.

2. **Structured JSON output** — Request JSON with a strict schema. Use `response_format: { type: "json_object" }` if available.

3. **Validation layer** — After generation, validate:
   - All required fields present
   - Criteria have valid rubrics (5 levels)
   - Prompts are non-empty strings
   - Output type is one of the valid enum values

4. **Fallback defaults** — If generation fails or produces invalid output:
   - Use generic criteria (Correctness, Quality, Completeness)
   - Prompt user to manually enter prompts
   - Default to "text" output type

5. **User validation step** — After generation, always show results for review before proceeding. Users can edit, remove, or regenerate individual items.

#### Per-Field Regeneration

The [✨ Auto] buttons on each field use the same prompt strategy but with a narrower `generationType`:

```javascript
// Just regenerate criteria
const response = await generateFromSkills({
  skillA, skillB,
  generationType: 'criteria',
  existingConfig: {
    outputType: 'visual', // Keep current
    prompts: [...] // Keep current
  }
});
```

This allows users to regenerate just the prompts while keeping their customized criteria, or vice versa.

#### Caching Strategy

To avoid redundant API calls, cache generated configurations:

```javascript
// Generate hash from skill contents
const skillHash = await crypto.subtle.digest('SHA-256', 
  new TextEncoder().encode(skillA.content + skillB.content)
);
const cacheKey = `skill_eval_config_${btoa(skillHash)}`;

// Check cache before API call
const cached = localStorage.getItem(cacheKey);
if (cached) {
  const { config, timestamp } = JSON.parse(cached);
  // Cache valid for 24 hours
  if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
    return config;
  }
}

// After successful generation
localStorage.setItem(cacheKey, JSON.stringify({
  config: generatedConfig,
  timestamp: Date.now()
}));
```

**Cache invalidation:**
- Skill content changes → new hash → cache miss
- User clicks "Regenerate" → bypass cache, update stored value
- 24-hour TTL as safety net

---

## 5. Key UX Improvements

### 5.1 API Key Warnings
**Where to show:**
- Persistent banner at top of all pages until key is added
- On Settings page: validation indicator (✅ valid / ❌ invalid / ⏳ checking)
- On Evaluate page: block "Run" button with clear message

**Validation:**
- Make a test API call on key entry
- Show "Key validated" or "Invalid key" feedback
- Store validation status to avoid repeat checks

---

### 5.2 First-Time User Experience
If no config exists:
1. Redirect to Configure tab automatically
2. Show a "Getting Started" callout
3. Guide through steps with contextual help
4. Don't allow navigation to Evaluate until basics are set

---

### 5.3 Progressive Disclosure
- Start with skills upload (required first step)
- "Generate All" button for instant configuration
- "Advanced" toggles for:
  - System prompt editing
  - Model selection
  - Max tokens

Most users: upload skills → Generate All → run
Power users: customize criteria, prompts, and advanced settings

---

### 5.4 Smart Defaults
Based on skill analysis, pre-fill:
- Output type (inferred from skill domain)
- Judge criteria (extracted from skill goals)
- Prompt suggestions (based on skill focus areas)
- System prompt (generic unless customized)
- Model recommendations (e.g., Opus for judging)

---

## 6. Data Architecture

### 6.1 localStorage Schema
```javascript
{
  // Settings (global)
  "skill_eval_api_key": "sk-ant-...",
  "skill_eval_default_gen_model": "claude-sonnet-4.5",
  "skill_eval_default_judge_model": "claude-opus-4.5",
  
  // Current configuration
  "skill_eval_config": {
    "category": "frontend",
    "outputType": "visual",
    "systemPrompt": "...",
    "judgeCriteria": [...],
    "skillA": { "name": "...", "content": "..." },
    "skillB": { "name": "...", "content": "..." },
    "prompts": [...]
  },
  
  // Recent skills (for quick re-use)
  "skill_eval_recent_skills": [
    { "name": "...", "content": "...", "lastUsed": "..." }
  ],
  
  // Saved prompt banks
  "skill_eval_prompt_banks": [...]
}
```

---

### 6.2 State Object
```javascript
const state = {
  // Settings
  settings: {
    apiKey: '',
    apiKeyValid: null, // null = unchecked, true/false
    defaultGenModel: 'claude-sonnet-4.5',
    defaultJudgeModel: 'claude-opus-4.5',
  },
  
  // Configuration
  config: {
    category: 'frontend',
    outputType: 'visual',
    systemPrompt: '',
    judgeCriteria: [],
    skillA: { name: '', content: '' },
    skillB: { name: '', content: '' },
    genModel: '',
    judgeModel: '',
    maxTokens: 8192,
  },
  
  // Prompts for current session
  prompts: [],
  
  // Evaluation results
  evals: [],
  
  // UI state
  ui: {
    currentTab: 'configure',
    configStep: 1,
    isRunning: false,
    isJudging: false,
  }
};
```

---

## 7. Migration Path

### Phase 1: Foundation
1. ☐ Set up new repo structure
2. ☐ Integrate Bloom design system (CSS variables, components)
3. ☐ Create tab-based navigation (Configure | Evaluate | Settings)
4. ☐ Build Settings page with API key management
5. ☐ Add API key warning banner

### Phase 2: Configure Flow
1. ☐ Build Step 1: Category selection with presets
2. ☐ Build Step 2: Skill upload/paste
3. ☐ Build Step 3: Output type + criteria configuration
4. ☐ Build Step 4: Prompt bank (manual + browse existing)
5. ☐ Build Step 5: Review & start

### Phase 3: Dynamic Judging
1. ☐ Refactor judge prompt to be constructed dynamically
2. ☐ Add category-specific criteria presets
3. ☐ Support custom criteria creation
4. ☐ Handle text-only vs visual judging

### Phase 4: AI-Powered Prompts
1. ☐ Build prompt generation UI
2. ☐ Create prompt generation API call
3. ☐ Add prompt preview/edit/regenerate flow
4. ☐ Support saving/loading prompt banks

### Phase 5: Polish
1. ☐ First-time user experience
2. ☐ Progress indicators and animations
3. ☐ Export improvements
4. ☐ Mobile responsiveness
5. ☐ Documentation and README

---

## 8. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|----------|
| **Web Framework** | React + Vite | Better maintainability, component reuse, hot reload for development |
| **Screenshot Server** | Local only | Keeps hosting simple, no server costs, privacy-friendly |
| **Prompt Sharing** | Local + GitHub Issues | No complex infrastructure; users can submit prompts via GitHub issues for community consideration |
| **Model Support** | Anthropic only (for now) | Focus on quality over breadth; can add OpenAI/OpenRouter later |

### Implications:

**React + Vite:**
- Use `create-vite` with React template
- Component-based architecture (matches Bloom patterns)
- CSS modules or styled-components for styling
- React Router for tab navigation

**Local Screenshot Server:**
- Keep existing Puppeteer server
- Clear instructions in README for setup
- Graceful degradation: if not running, disable visual judging option

**Prompt Sharing via Issues:**
- README section: "Have prompts to share? Open an issue!"
- Maintainers can curate and add to default banks
- No backend needed

---

## 9. Success Criteria

A successful Skill Evaluator will:
- ✅ Work out of the box for any domain, not just frontend
- ✅ Guide new users through configuration without documentation
- ✅ Be immediately useful with presets, but fully customizable
- ✅ Clearly communicate when things won't work (API key, server, etc.)
- ✅ Follow Bloom design system for consistent, professional UI
- ✅ Be well-documented for open source contribution

---

*Document created: January 12, 2026*  
*Last updated: January 12, 2026*
