# 🧪 Skill Evaluator

A visual workbench for A/B testing AI skills. Upload two skill files, run them through a batch of test prompts, and let an AI judge score the results.

DEMO VIDEO: [SkillEval v1.1 product video](https://www.linkedin.com/posts/justinwetch_skilleval-v11-is-out-now-featuring-a-refreshed-ugcPost-7463683888738058240-N887/)

I built this to improve Anthropic's frontend design skill and prove the improvements with data. That project was hardcoded to frontend evaluation, so I extracted the core evaluation engine and made it extensible—now you can 1v1 any two skills, in any domain, with any model.

For the full story on how this started and why data-driven skill development matters, see [Teaching Claude to Design Better](https://www.justinwetch.com/blog/improvingclaudefrontend).

This project is a spiritual successor to my work on [Bloom GUI](https://github.com/justinwetch/bloom), a visual interface for Anthropic's behavioral evaluation framework. Building that taught me a lot about what makes evaluations useful—clear metrics, comparative analysis, and good visualization. I brought that learning (and the design language I developed there) into Skill Evaluator.

GUI by [Justin Wetch](https://github.com/justinwetch)

---

## v1.1 Update

Skill Evaluator v1.1 adds support for the latest Anthropic, OpenAI, and Google models, expanding the app beyond Anthropic-only workflows. Model selection now supports provider-specific API keys, cross-provider choices, and separate defaults for skill output generation and judge scoring.

This release also introduces a refreshed design language, with cleaner surfaces, tighter controls, restrained depth, and fully considered light and dark modes.

---

## Using the GUI

**Configure** — Upload two skill files (A and B) and set up your evaluation. Click the ✨ Generate button to have AI analyze your skills and create appropriate evaluation criteria and test prompts automatically. Choose your output type (text, visual, or both) based on what your skills produce.

Light:
![Configure - Upload skills and generate criteria in light mode](screenshots/configure%201.png)

Dark:
![Configure - Upload skills and generate criteria in dark mode](screenshots/dark/configure%201.png)

Light:
![Configure - Generated criteria and prompts in light mode](screenshots/configure%202.png)

Dark:
![Configure - Generated criteria and prompts in dark mode](screenshots/dark/configure%202.png)

**Evaluate** — Select your model and run all prompts through both skills simultaneously. Each prompt generates two outputs (one from Skill A, one from Skill B) which you can compare side-by-side. The status badges show progress in real-time.

Light:
![Evaluate - Running prompts through both skills in light mode](screenshots/Evaluate%201.png)

Dark:
![Evaluate - Running prompts through both skills in dark mode](screenshots/dark/Evaluate%201.png)

**Results** — After generation, run the judge to score both outputs against your criteria. The summary view shows overall wins/losses, while the detailed breakdown reveals per-criterion scores and patterns.

Light:
![Results - Summary view with wins and scores in light mode](screenshots/evaluate%20results.png)

Dark:
![Results - Summary view with wins and scores in dark mode](screenshots/dark/evaluate%20results.png)

Light:
![Results - Per-criterion breakdown in light mode](screenshots/evaluate%20results%202.png)

Dark:
![Results - Per-criterion breakdown in dark mode](screenshots/dark/evaluate%20results%202.png)

**Settings** — Manage provider keys for Anthropic, OpenAI, and Gemini, then set default models for configuration, generation, and judging.

Light:
![Settings - provider keys and default models in light mode](screenshots/settings.png)

Dark:
![Settings - provider keys and default models in dark mode](screenshots/dark/settings.png)

---

## Installation

### Prerequisites

- Node.js 18+
- Provider key for at least one supported provider:
  - Anthropic ([console.anthropic.com](https://console.anthropic.com/))
  - OpenAI ([platform.openai.com](https://platform.openai.com/api-keys))
  - Gemini ([aistudio.google.com](https://aistudio.google.com/app/apikey))

### Clone and Setup

```bash
git clone https://github.com/justinwetch/SkillEval.git
cd SkillEval/app
npm install
```

### Running the GUI

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

### Running an Evaluation

1. Go to **Configure** and choose the Output model and Judge model
2. If a selected model needs provider access, click its **Add Key** action to open the right Settings panel
3. Upload two skill files
4. Click **Generate All from Skills** to auto-generate criteria and prompts
5. Go to **Evaluate** and click **Run All Evals**
6. Once generation completes, click **Judge All** to score the outputs
7. Review the results in Summary and Detailed Breakdown tabs

---

## Model Selection

Choose models deliberately for the two major phases. The Output model runs both skills, while the Judge model generates criteria/prompts and scores the results.

| Model | Provider | Characteristics |
|-------|----------|-----------------|
| **Claude Sonnet 4.6** | Anthropic | Balanced capability and speed (default output generation) |
| **Claude Opus 4.7** | Anthropic | Strong model for criteria, prompts, and judging (default judge) |
| **Claude Haiku 4.5** | Anthropic | Fast, cost-effective, good for iteration |
| **GPT-5.5** | OpenAI | Frontier model for complex reasoning and coding |
| **GPT-5.4 Mini / Nano** | OpenAI | Lower-latency, lower-cost OpenAI options |
| **Gemini 3.5 Flash** | Gemini | Stable Gemini model for sustained coding and agentic tasks |
| **Gemini 3.1 Pro Preview** | Gemini | Advanced Gemini Pro option |

For judging, **Claude Opus 4.7** is the default because strong reasoning is useful for criteria, prompts, and nuanced scoring. Claude Sonnet 4.6 is the default for skill output generation. OpenAI and Gemini models are available in the same selectors when their provider keys are configured.

---

## Writing Skills

For documentation on how to write effective skill files, see [Claude Code Skills](https://code.claude.com/docs/en/skills).

The `test-skills/` folder contains example skill files you can use as reference:
- `sql-skill-a.md` — Basic SQL query generation skill
- `sql-skill-b.md` — Advanced SQL skill with optimization focus

---

## Screenshot Server (Optional)

For visual evaluations (HTML/CSS skills that produce rendered output), you'll need the screenshot server:

```bash
# From the project root
node screenshot-server.js
```

The server runs on port 3001 and uses Puppeteer to capture screenshots of rendered HTML. If you're evaluating text-only skills (code, SQL, writing, etc.), you don't need this.

---

## Project Structure

```
SkillEval/
├── app/                      # React application
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── contexts/         # React context (config, run state, settings)
│   │   ├── utils/            # Core logic (API, eval, judging)
│   │   └── views/            # Page components
│   └── package.json
├── test-skills/              # Example skill files
├── screenshots/              # GUI screenshots
├── screenshot-server.js      # Optional visual evaluation server
├── ARCHITECTURE.md           # Detailed architecture docs
└── DESIGN_SYSTEM.md          # UI design system specs
```

---

## Contributing

Contributions welcome! Open an issue for bugs, feature requests, or to share interesting skill files you've tested.

---

## License

MIT

---

## Credits

Thanks to Anthropic for the Skills framework and Claude models.

Built by [Justin Wetch](https://www.justinwetch.com)
