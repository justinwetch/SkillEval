# 🧪 Skill Evaluator: Architecture & Development Plan

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

### 3.2 Configure Tab (New — Like Bloom's Configure View)
A stepped configuration flow before running evals.

#### Step 1: What Are You Testing?
> "What kind of skill are you evaluating?"

**Preset Categories:**
- 🎨 Frontend/UI Design (current default)
- 💻 Backend/Code Generation
- ✍️ Writing & Content
- 📊 Data Analysis
- 🔍 Research & Summarization
- 🧩 Custom / Other

Each category pre-fills:
- Suggested system prompt
- Appropriate judge criteria
- Example prompts to get started

User can also start from scratch.

---

#### Step 2: Upload Skills
Upload two skill files to compare.

- Skill A: `[Upload .md]` | `[Paste text]`
- Skill B: `[Upload .md]` | `[Paste text]`

**Convenience Features:**
- "Use same base, different versions" toggle
- Preview/expand uploaded skill content
- Recent skills dropdown (from localStorage)

---

#### Step 3: Configure Evaluation
> "What should the judge see?"

**Output Type Selection:**
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

**Judge Criteria Configuration:**

**Three Options:**

**A) Use Preset Criteria**
- Pre-built criteria sets based on category from Step 1
- One click to apply

Default presets per category:

| Category | Criteria |
|----------|----------|
| Frontend/UI | Prompt Adherence, Aesthetic Fit, Visual Polish, UX/Usability, Creative Distinction |
| Backend/Code | Correctness, Code Quality, Efficiency, Documentation, Edge Cases |
| Writing | Clarity, Accuracy, Engagement, Structure, Voice/Tone |
| Data Analysis | Accuracy, Insight Depth, Visualization, Methodology, Actionability |
| Research | Thoroughness, Source Quality, Synthesis, Relevance, Objectivity |

**B) Generate Criteria (AI-Powered)**
- User describes what aspects matter for their specific evaluation
- AI generates 5 criteria with names, descriptions, and scoring rubrics
- Uses our existing frontend criteria as the example format

Example workflow:
```
┌─────────────────────────────────────────────────────────────┐
│  📝 What should the judge evaluate?                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ I'm testing SQL query generation. I care about query  │ │
│  │ correctness, performance, readability, handling edge  │ │
│  │ cases, and proper indexing suggestions.               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [✨ Generate Criteria]                                      │
└─────────────────────────────────────────────────────────────┘
```

Generated output (editable):
```
### 1. Query Correctness (1-5)
Does the query return the expected results?
- 5: Perfectly correct, handles all specified conditions
- 3: Mostly correct but misses edge cases
- 1: Returns wrong results or errors

### 2. Performance Optimization (1-5)
...
```

**C) Custom Criteria (Manual)**
- Add/remove criteria manually
- Edit criterion names and descriptions
- Set point values (1-5 or 1-10)

---

#### Step 4: Build Your Prompt Bank
> "What prompts will you test?"

**Three Options:**

**A) Manual Entry**
- Same as current: add prompts one by one
- +/- buttons, text areas

**B) Use Example Bank**
- Show existing prompts from a JSON file
- User can browse, select, or "use all"
- Filter/search within bank

**C) Generate New Bank (AI-Powered)**
- User describes what they want to test
- AI generates 10-50 prompts appropriate for:
  - The skill category
  - The uploaded skill files
  - Any user notes/focus areas

Example workflow:
```
┌─────────────────────────────────────────────────────────────┐
│  📝 Describe what you want to test                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ I want to test prompts that challenge the skill to    │ │
│  │ build responsive layouts, handle dark mode, and       │ │
│  │ create accessible forms.                              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  How many prompts?  [10 ▼]                                  │
│                                                             │
│  [✨ Generate Prompts]                                       │
└─────────────────────────────────────────────────────────────┘
```

After generation:
- Show preview of all generated prompts
- User can edit, delete, regenerate individual prompts
- "Use These" button to proceed

---

#### Step 5: Review & Start
Summary of configuration:
- Category: Frontend/UI Design
- Skills: `skill-a.md` vs `skill-b.md`
- Output Type: Visual (Screenshot)
- Judge Criteria: 5 default criteria
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
- Start with simple presets (category selection)
- "Advanced" toggles for:
  - Custom criteria
  - System prompt editing
  - Model selection
  - Max tokens

Most users: pick category → upload skills → generate prompts → run
Power users: customize everything

---

### 5.4 Smart Defaults
Based on category selection, pre-fill:
- System prompt
- Judge criteria
- Suggested max tokens
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
