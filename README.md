# agents-skills

A centralized collection of AI coding agent skills (SKILL.md files with associated assets). Symlink skills into your agent config directories — opencode, Claude Code, Codex, or anywhere else — and keep them all in sync from one place.

## Quick start

```bash
git clone <repo-url>
cd agents-skills
node link.js --init        # create default skills.json
# edit skills.json to taste
node link.js               # link all skills to all configured agents
```

## How the linker works

`link.js` discovers skill directories (any folder containing a `SKILL.md`), then creates **symlinks** from the repo into each agent's config directory (e.g., `~/.config/opencode/skills/`). Directories starting with a dot (`.`) are excluded. Because they're symlinks, edits in the repo are reflected immediately — no re-linking needed.

The linker checks for existing symlinks and skips or prompts before overwriting. A safety guard prevents accidentally removing paths that are too shallow (like `/`).

## Installation

```bash
git clone <repo-url>
cd agents-skills
```

No dependencies — `link.js` uses only Node.js built-ins.

## Usage

```
node link.js                          Link all skills to all configured agents
node link.js --target <path>          Add a custom target directory
node link.js --skill <name>           Link only specific skill(s) (repeatable)
node link.js --dry-run                Preview without making changes
node link.js --yes                    Auto-overwrite without prompting
node link.js --init                   Create a default skills.json
node link.js --help                   Show help
```

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

## Contributing

Contributions welcome! Please open an issue or pull request. Keep skills self-contained in their own directories with a `SKILL.md` entrypoint.

## License

MIT
