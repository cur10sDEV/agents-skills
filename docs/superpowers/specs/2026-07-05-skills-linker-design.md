# Skills Linker — Design Spec

## Overview

A Node.js script (`link.js`) that symlinks skill directories from this centralized skills repo into target agent config directories (opencode, claude code, codex). Allows users to maintain skills in one place and have them automatically reflected in any agent's config.

## Requirements

- Discover all skill directories (containing `SKILL.md`) in the repo
- Symlink each skill into configured agent target directories
- Support both per-skill and whole-repo linking via config
- Interactive conflict resolution (ask per conflict)
- Zero npm dependencies
- Dry-run mode
- Auto-yes mode for unattended installs
- Configurable via `skills.json`

## CLI Interface

```
node link.js                          # link all skills to all configured agents
node link.js --target <path>          # add an ad-hoc target directory
node link.js --skill <name>           # link only specific skill(s)
node link.js --dry-run                # preview without making changes
node link.js --yes                    # auto-overwrite without prompting
node link.js --init                   # create a default skills.json
node link.js --help                   # show usage
```

## Config File (`skills.json`)

```json
{
  "agents": {
    "opencode": {
      "path": "~/.config/opencode/skills"
    },
    "claude": {
      "path": "~/.claude/skills",
      "skills": ["linkedin-post-generator"]
    }
  },
  "customTargets": []
}
```

- `path` — target directory for this agent's skills
- `skills` (optional) — whitelist of skills to link for this agent. If omitted, **all** discovered skills are linked.
- `customTargets` — added via `--target` flag at runtime.

This gives you per-skill granularity per agent (e.g., only send certain skills to claude) while defaulting to linking everything.

## Script Flow

1. Parse CLI arguments
2. Load `skills.json` from repo root (or flag path)
3. Discover skills: scan repo root for directories containing `SKILL.md`
4. Build target list from config agents + custom targets
5. For each skill × target:
   - a. Resolve full path (expand `~`)
   - b. Check if target dir exists; warn + skip if missing
   - c. Check for existing file/symlink at `<target>/<skill>`
   - d. If exists: prompt (overwrite/skip/skip all/abort) unless `--yes`
   - e. If symlink already points to correct source: skip silently
   - f. Create symlink: `ln -s <source> <target>/<skill>`
6. Print summary

## Conflict Resolution Prompt

```
⚠  ~/.config/opencode/skills/linkedin-post-generator already exists.
   [o] Overwrite    [s] Skip    [a] Overwrite all    [S] Skip all    [q] Quit
```

## Error Handling

- Target dir missing → warn, skip that target, continue
- Symlink creation fails → print error, continue
- No skills found → warn and exit
- No targets configured → warn and exit

## Future Considerations (out of scope for v1)

- Watching for new skills and auto-linking
- Unlink command to remove symlinks
- Windows support via junctions
