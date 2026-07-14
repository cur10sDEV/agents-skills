# agents-skills

Centralized collection of AI coding agent skills (each is a directory with a `SKILL.md` file). `link.js` links (or copies) skill directories from this repo into agent config directories so edits here are reflected everywhere.

**Cross-platform**: relative symlinks on macOS/Linux, directory junctions on Windows (no admin needed), and automatic recursive-copy fallback when neither is available.

## Quick start

```bash
git clone <repo-url>
cd agents-skills
node link.js --init        # create default skills.json
# edit skills.json to taste
node link.js               # link all skills to all configured agents
```

## How the linker works

`link.js` discovers skill directories (any folder containing a `SKILL.md`), then creates **symlinks** (macOS/Linux) or **directory junctions** (Windows, no admin needed) from the repo into each agent's config directory (e.g., `~/.config/opencode/skills/`). If neither is available, it falls back to recursive copy.

Directories starting with a dot (`.`), `node_modules`, and `docs` are excluded from discovery. Edits in the repo are reflected immediately when using symlinks or junctions — no re-linking needed.

The linker checks for existing links and skips or prompts before overwriting. A safety guard prevents accidentally removing paths that are too shallow (like `/` or `C:\`).

## Installation

```bash
git clone <repo-url>
cd agents-skills
```

No dependencies — `link.js` uses only Node.js built-ins (`fs`, `path`, `os`).

## Usage

```
node link.js                          Link all skills to all configured agents
node link.js --target <path>          Add a custom target directory
node link.js --skill <name>           Link only specific skill(s) (repeatable)
node link.js --dry-run                Preview without making changes
node link.js --yes                    Auto-overwrite without prompting
node link.js --copy                   Copy instead of symlink/junction
node link.js --init                   Create a default skills.json
node link.js --help                   Show this help
```

### Cross-platform behavior

| OS            | Method        | Notes                                                                  |
|---------------|---------------|------------------------------------------------------------------------|
| macOS / Linux | relative symlink | No special privileges required                                     |
| Windows       | directory junction | Works without admin/Developer Mode; uses absolute target path     |
| Windows (fallback) | recursive copy | Used when junctions fail (e.g. locked-down system, different volume) |
| Any (`--copy`)     | recursive copy | Force copy mode, loses live-edit propagation                       |

### Default agent paths

| Agent    | Config path                          | Windows equivalent                                        |
|----------|--------------------------------------|------------------------------------------------------------|
| opencode | `~/.config/opencode/skills`          | `%USERPROFILE%\.config\opencode\skills`                    |
| claude   | `~/.claude/skills`                   | `%USERPROFILE%\.claude\skills`                             |
| codex    | `~/.codex/skills`                    | `%USERPROFILE%\.codex\skills`                              |

### Examples

```bash
# Link everything
node link.js

# Add a one-off target
node link.js --target ~/.config/opencode/skills

# Link a single skill, skip prompts
node link.js --skill linkedin-post-generator --yes

# Preview what would happen
node link.js --dry-run

# Copy instead of symlink (no live-edit propagation)
node link.js --copy
```

## Config file (`skills.json`)

The config lives at `skills.json` in the repo root. Created automatically with `--init`:

```json
{
  "agents": {
    "opencode": { "path": "~/.config/opencode/skills" },
    "claude":   { "path": "~/.claude/skills" },
    "codex":    { "path": "~/.codex/skills" }
  },
  "customTargets": []
}
```

### Per-agent skill filtering

Only link certain skills to certain agents by adding a `skills` array:

```json
{
  "agents": {
    "opencode": {
      "path": "~/.config/opencode/skills",
      "skills": ["linkedin-post-generator"]
    },
    "claude": {
      "path": "~/.claude/skills"
    }
  }
}
```

If `skills` is omitted, all skills are linked. If present, only the named skills are linked to that agent.

## Adding a new skill

1. Create a directory in the repo root (e.g., `my-new-skill/`)
2. Add a `SKILL.md` file inside it — the linker discovers directories by looking for that file
3. Add any associated assets alongside it
4. Run `node link.js` — no config changes needed unless you want per-agent filtering

## Adding dependencies to a skill

If a skill needs npm packages (e.g. `puppeteer-core`, `pdf-lib`):

1. `cd your-skill && npm install <package>` — run from inside the skill directory
2. Commit both `package.json` and `package-lock.json`
3. The root `.npmrc` (`lockfile-version=3`) and `.gitattributes` (`**/package-lock.json eol=lf`) ensure cross-OS lockfile stability automatically

**Do not** manage dependencies from the repo root — there is no root `package.json`. Each skill is self-contained.

Node.js version is pinned via `.nvmrc` at the repo root — update it when the LTS changes.

## License

MIT
