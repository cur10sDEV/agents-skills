# agent-skills — AGENTS.md

## What this repo is

Centralized collection of AI coding agent skills (each is a directory with a `SKILL.md` file). `link.js` creates relative symlinks from this repo into agent config directories so edits here are reflected everywhere instantly.

## Key commands

```
node link.js               # link all skills to all configured agents
node link.js --dry-run     # preview without making changes
node link.js --init        # create default skills.json
node link.js --help        # full flag reference
```

Zero dependencies — uses only Node.js built-ins (`fs`, `path`, `os`, `readline`).

## How skills are discovered

`link.js` scans repo root for directories containing a `SKILL.md` file. Directories starting with `.`, named `node_modules`, or named `docs` are **excluded**. Run `node link.js --dry-run` to verify a new skill is picked up.

## Adding a new skill

1. Create `your-skill/SKILL.md` in the repo root
2. Add any assets alongside it
3. Run `node link.js` — no config change needed unless you want per-agent filtering

## Config (`skills.json`)

- `--init` generates the default config targeting opencode, claude, codex
- Per-agent `skills` array whitelists which skills that agent receives; omit to link all
- `customTargets` array supports additional target paths in the config itself

## Safety

`link.js` refuses to remove paths that resolve to `/` or a parent-of-self directory. It will prompt before overwriting existing files/symlinks (use `--yes` to auto-accept). Already-correct symlinks are detected and skipped silently.

## Conventions

- `docs/superpowers/specs/` — design documents
- `docs/superpowers/plans/` — implementation plans
- These dirs are excluded from skill discovery
- Symlinks are relative (portable across mounts and machines)
- Non-TTY output strips ANSI color codes automatically

## No tests

There is no test suite. Verify with `node link.js --dry-run`.
