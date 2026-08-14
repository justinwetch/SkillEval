# SkillEval Frontend Workspace

This folder contains the React/Vite frontend for SkillEval.

Use these docs in this order:

1. `../AGENTS.md`
2. `../docs/repo-map.md`
3. `../README.md`

This file is a local workspace note. It does not override the root repo map.

## Commands

From `app/`:

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Source Ownership Summary

- `src/views/` - screen-level UI and page-local interactions
- `src/components/` - reusable UI pieces
- `src/contexts/` - shared persisted state and workflow orchestration
- `src/utils/` - focused helpers and service boundaries
- `src/App.jsx` - route/provider composition
- `src/main.jsx` - bootstrap render
- `dist/` - generated output; do not edit directly

For the detailed file-level map, use `../docs/repo-map.md`.
