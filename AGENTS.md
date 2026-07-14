# agents-skills — AGENTS.md

## What this repo is

Centralized collection of AI coding agent skills (each is a directory with a `SKILL.md` file). `link.js` links (or copies) skill directories from this repo into agent config directories so edits here are reflected everywhere.

**Cross-platform**: relative symlinks on macOS/Linux, directory junctions on Windows (no admin needed), and automatic recursive-copy fallback when neither is available.

## Key commands

```
node link.js               # link all skills to all configured agents
node link.js --dry-run     # preview without making changes
node link.js --init        # create default skills.json
node link.js --copy        # copy instead of symlink/junction
node link.js --help        # full flag reference
```

Zero dependencies — uses only Node.js built-ins (`fs`, `path`, `os`).

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

## Default agent paths (cross-platform)

`~` expands via `os.homedir()` so the same `~/.config/opencode/skills` style paths work everywhere:

| Agent    | Configured path                        | Windows equivalent                                        |
|----------|----------------------------------------|------------------------------------------------------------|
| opencode | `~/.config/opencode/skills`            | `%USERPROFILE%\.config\opencode\skills`                    |
| claude   | `~/.claude/skills`                     | `%USERPROFILE%\.claude\skills`                             |
| codex    | `~/.codex/skills`                      | `%USERPROFILE%\.codex\skills`                              |

## Cross-platform linking strategy

| OS            | Method        | Notes                                                                  |
|---------------|---------------|------------------------------------------------------------------------|
| macOS / Linux | relative symlink | No special privileges required                                     |
| Windows       | directory junction | Works without admin/Developer Mode; uses absolute target path     |
| Windows (fallback) | recursive copy | Used when junctions fail (e.g. locked-down system, different volume) |
| Any (`--copy`)     | recursive copy | Force copy mode, loses live-edit propagation                       |

Already-correct links are detected and skipped silently — this works for both symlinks and junctions because `fs.lstatSync().isSymbolicLink()` returns `true` for NTFS junctions.

## Safety

`link.js` refuses to remove paths that resolve to a root (`/`, `C:\`, `C:\Users\`, etc.) or a parent-of-self directory. It will prompt before overwriting existing files/symlinks (use `--yes` to auto-accept). Already-correct symlinks/junctions are detected and skipped silently.

## Conventions

- `docs/` — excluded from skill discovery (along with `node_modules` and dot-prefixed dirs)
- Symlinks are relative (portable across mounts and machines); junctions are absolute (single-machine, portable across reboots)
- Non-TTY output strips ANSI color codes automatically

## Adding dependencies to a skill

If a skill needs npm packages (e.g. the `linkedin-post-generator` depends on `puppeteer-core` and `pdf-lib`):

1. `cd your-skill && npm install <package>` — run from inside the skill directory
2. Commit both `package.json` and `package-lock.json`
3. There is no step 3 — the root `.npmrc` (`lockfile-version=3`) and `.gitattributes` (`**/package-lock.json eol=lf`) ensure cross-OS lockfile stability automatically

**Do not** manage dependencies from the repo root — there is no root `package.json`. Each skill is self-contained.

**Pin the Node.js version** using `.nvmrc` (already present at root — update it when the LTS changes). This keeps lockfile generation consistent.

## No tests

There is no test suite. Verify with `node link.js --dry-run`.
