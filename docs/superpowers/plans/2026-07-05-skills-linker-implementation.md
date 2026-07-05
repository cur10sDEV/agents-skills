# Skills Linker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a zero-dependency Node.js script (`link.js`) that symlinks skill directories into agent config directories, with a `skills.json` config and `README.md`.

**Architecture:** Single `link.js` script (no deps) using built-in `fs`, `path`, `os`, `readline` modules. CLI args parsed from `process.argv`. Config in `skills.json` maps agent names to target paths with optional per-agent skill whitelists.

**Tech Stack:** Node.js (no dependencies)

---

### Task 1: Create `link.js` — Argument parsing, config loading, skill discovery

**Files:**
- Create: `link.js`

- [ ] **Step 1: Write the script skeleton with argument parsing and help**

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_ROOT = __dirname;
const CONFIG_FILE = path.join(REPO_ROOT, 'skills.json');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { targets: [], skills: [], dryRun: false, yes: false, init: false, help: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--target': opts.targets.push(args[++i]); break;
      case '--skill':  opts.skills.push(args[++i]); break;
      case '--dry-run': opts.dryRun = true; break;
      case '--yes': case '-y': opts.yes = true; break;
      case '--init': opts.init = true; break;
      case '--help': case '-h': opts.help = true; break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }
  return opts;
}

function showHelp() {
  console.log(`
${colors.cyan}agent-skills linker${colors.reset}

  Links skill directories from this repo into agent config directories.

${colors.cyan}Usage:${colors.reset}
  node link.js                          Link all skills to all configured agents
  node link.js --target <path>          Add a custom target directory
  node link.js --skill <name>           Link only specific skill(s) (repeatable)
  node link.js --dry-run                Preview without making changes
  node link.js --yes                    Auto-overwrite without prompting
  node link.js --init                   Create a default skills.json
  node link.js --help                   Show this help

${colors.cyan}Examples:${colors.reset}
  node link.js
  node link.js --target ~/.config/opencode/skills
  node link.js --skill linkedin-post-generator --yes
  node link.js --dry-run
`);
}

function resolvePath(p) {
  if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
  return path.resolve(p);
}

function discoverSkills() {
  const entries = fs.readdirSync(REPO_ROOT, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'docs') continue;
    if (fs.existsSync(path.join(REPO_ROOT, entry.name, 'SKILL.md'))) {
      skills.push(entry.name);
    }
  }
  return skills.sort();
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return { agents: {}, customTargets: [] };
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

function createDefaultConfig() {
  const config = {
    agents: {
      opencode: { path: '~/.config/opencode/skills' },
      claude:   { path: '~/.claude/skills' },
      codex:    { path: '~/.codex/skills' },
    },
    customTargets: [],
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
  return config;
}

function promptUser(question) {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim().toLowerCase()); });
  });
}

function printSummary(linked, skipped, errors) {
  console.log(`\n${colors.cyan}Summary:${colors.reset}`);
  console.log(`  ${colors.green}Linked: ${linked}${colors.reset}`);
  if (skipped > 0) console.log(`  ${colors.dim}Skipped: ${skipped}${colors.reset}`);
  if (errors > 0) console.log(`  ${colors.red}Errors: ${errors}${colors.reset}`);
}

async function main() {
  const opts = parseArgs();

  if (opts.help) { showHelp(); return; }

  if (opts.init) {
    if (fs.existsSync(CONFIG_FILE)) {
      console.log(`${colors.yellow}⚠  skills.json already exists.${colors.reset}`);
      return;
    }
    createDefaultConfig();
    console.log(`${colors.green}✓ Created skills.json with default targets (opencode, claude, codex).${colors.reset}`);
    console.log(`  Edit it to customize paths or add more agents.`);
    return;
  }

  let config = loadConfig();

  if (Object.keys(config.agents).length === 0 && opts.targets.length === 0) {
    console.log(`${colors.yellow}No targets configured.${colors.reset}`);
    const ans = await promptUser(`  ${colors.cyan}Create a default skills.json? (Y/n): ${colors.reset}`);
    if (ans !== 'n') {
      config = createDefaultConfig();
      console.log(`${colors.green}✓ Created skills.json${colors.reset}`);
    } else {
      console.log(`${colors.red}No targets. Use --target <path> or --init to create a config.${colors.reset}`);
      process.exit(1);
    }
  }

  let skills = discoverSkills();

  if (skills.length === 0) {
    console.log(`${colors.red}No skills found (no directories with SKILL.md).${colors.reset}`);
    process.exit(1);
  }

  if (opts.skills.length > 0) {
    const missing = opts.skills.filter(s => !skills.includes(s));
    for (const s of missing) console.log(`${colors.yellow}⚠  Skill "${s}" not found.${colors.reset}`);
    skills = skills.filter(s => opts.skills.includes(s));
    if (skills.length === 0) {
      console.log(`${colors.red}No matching skills found.${colors.reset}`);
      process.exit(1);
    }
  }

  const targets = [];
  for (const [name, cfg] of Object.entries(config.agents)) {
    targets.push({ name, path: resolvePath(cfg.path), skills: cfg.skills || skills });
  }
  for (const t of opts.targets) {
    targets.push({ name: path.basename(resolvePath(t)), path: resolvePath(t), skills });
  }

  // Print summary of what will happen
  console.log(`\n${colors.cyan}Skills linker${colors.reset}`);
  console.log(`${colors.dim}${'-'.repeat(40)}${colors.reset}`);
  console.log(`${colors.green}Skills:${colors.reset} ${skills.join(', ')}`);
  console.log(`${colors.green}Targets:${colors.reset}`);
  for (const t of targets) {
    console.log(`  ${colors.blue}${t.name}${colors.reset} → ${t.path}`);
    if (t.skills.length < skills.length) console.log(`    ${colors.dim}skills: ${t.skills.join(', ')}${colors.reset}`);
  }
  console.log();

  if (opts.dryRun) {
    console.log(`${colors.yellow}Dry-run mode. No changes made.${colors.reset}`);
    return;
  }

  let linked = 0, skipped = 0, errors = 0;
  let overwriteAll = false, skipAll = false;

  for (const target of targets) {
    if (!fs.existsSync(target.path)) {
      console.log(`${colors.yellow}⚠  Target does not exist: ${target.path}${colors.reset}`);
      if (!opts.yes) {
        const ans = await promptUser(`  ${colors.cyan}Create it? (Y/n): ${colors.reset}`);
        if (ans === 'n') { console.log(`  ${colors.dim}Skipped.${colors.reset}`); continue; }
      }
      fs.mkdirSync(target.path, { recursive: true });
      console.log(`${colors.green}  ✓ Created${colors.reset}`);
    }

    for (const skillName of target.skills) {
      if (!skills.includes(skillName)) continue;

      const sourcePath = path.join(REPO_ROOT, skillName);
      const linkPath = path.join(target.path, skillName);

      if (fs.existsSync(linkPath)) {
        const isLink = fs.lstatSync(linkPath).isSymbolicLink();
        let shouldOverwrite;

        if (isLink) {
          const linkTarget = fs.readlinkSync(linkPath);
          const resolvedTarget = path.resolve(path.dirname(linkPath), linkTarget);
          if (resolvedTarget === sourcePath) {
            console.log(`  ${colors.dim}${target.name}/${skillName} — already linked ✓${colors.reset}`);
            skipped++;
            continue;
          }
        }

        if (opts.yes || overwriteAll) {
          shouldOverwrite = true;
        } else if (skipAll) {
          shouldOverwrite = false;
        } else {
          const label = isLink ? 'symlink' : 'file/directory';
          const ans = await promptUser(
            `  ${colors.yellow}⚠  ${linkPath} already exists (${label}).${colors.reset}\n` +
            `    ${colors.cyan}[o] Overwrite  [s] Skip  [a] Overwrite all  [S] Skip all  [q] Quit: ${colors.reset}`
          );
          if (ans === 'o') shouldOverwrite = true;
          else if (ans === 'a') { shouldOverwrite = true; overwriteAll = true; }
          else if (ans === 's') shouldOverwrite = false;
          else if (ans === 'S') { shouldOverwrite = false; skipAll = true; }
          else if (ans === 'q') { console.log(`${colors.red}Aborted.${colors.reset}`); printSummary(linked, skipped, errors); process.exit(1); }
          else shouldOverwrite = false;
        }

        if (!shouldOverwrite) {
          console.log(`  ${colors.dim}${target.name}/${skillName} — skipped${colors.reset}`);
          skipped++;
          continue;
        }

        fs.rmSync(linkPath, { recursive: true, force: true });
      }

      try {
        const relativePath = path.relative(path.dirname(linkPath), sourcePath);
        fs.symlinkSync(relativePath, linkPath, 'dir');
        console.log(`  ${colors.green}✓${colors.reset} ${target.name}/${skillName} → ${relativePath}`);
        linked++;
      } catch (err) {
        console.log(`  ${colors.red}✗${colors.reset} ${target.name}/${skillName}: ${err.message}`);
        errors++;
      }
    }
  }

  printSummary(linked, skipped, errors);
}

main().catch(err => { console.error(`${colors.red}Error:${colors.reset}`, err.message); process.exit(1); });
```

- [ ] **Step 2: Verify the script runs**

Run: `node link.js --help`
Expected: Shows help text with usage information.

- [ ] **Step 3: Verify dry-run mode returns clean output**

Run: `node link.js --dry-run`
Expected: Shows discovered skills and targets, with "Dry-run mode. No changes made."

- [ ] **Step 4: Commit**

```bash
git add link.js
git commit -m "feat: add skills linker script"
```

---

### Task 2: Create `skills.json` default config

**Files:**
- Create: `skills.json`

- [ ] **Step 1: Create the config file**

```json
{
  "agents": {
    "opencode": {
      "path": "~/.config/opencode/skills"
    },
    "claude": {
      "path": "~/.claude/skills"
    },
    "codex": {
      "path": "~/.codex/skills"
    }
  },
  "customTargets": []
}
```

- [ ] **Step 2: Verify script loads the config**

Run: `node link.js --dry-run`
Expected: Shows opencode (~/.config/opencode/skills), claude (~/.claude/skills), codex (~/.codex/skills) as targets.

- [ ] **Step 3: Commit**

```bash
git add skills.json
git commit -m "feat: add default skills config"
```

---

### Task 3: Test the script end-to-end

- [ ] **Step 1: Create temp directories and test linking**

```bash
mkdir -p /tmp/test-skills/{opencode,claude,codex}
node link.js --target /tmp/test-skills/opencode --target /tmp/test-skills/claude --yes
```

Expected: Creates symlinks for each skill in both target directories.

- [ ] **Step 2: Verify symlinks work**

Run: `ls -la /tmp/test-skills/opencode/`
Expected: Shows symlinks pointing to the repo's skill directories.

Run: `ls -la /tmp/test-skills/claude/`
Expected: Same.

- [ ] **Step 3: Test idempotency (re-run)**

Run: `node link.js --target /tmp/test-skills/opencode --yes`
Expected: Reports skills as "already linked", no duplicates or errors.

- [ ] **Step 4: Test --dry-run after linking**

Run: `node link.js --target /tmp/test-skills/opencode --dry-run`
Expected: Shows what would be done (likely "already linked" status).

- [ ] **Step 5: Test --init works**

```bash
rm -f skills.json
node link.js --init
cat skills.json
```

Expected: Creates skills.json with default agents.

Run: `git checkout -- skills.json` to restore original.

- [ ] **Step 6: Cleanup test dirs**

```bash
rm -rf /tmp/test-skills
```

- [ ] **Step 7: Commit any fixes** (if bugs found during testing)

```bash
git add -A
git commit -m "fix: handle edge cases in link.js"
```

---

### Task 4: Write README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

See README content below — covers what the repo is, how to set up agents, script usage, config file format, and per-skill filtering.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and usage instructions"
```

---

### Task 5: Plan self-review

- [ ] **Step 1: Review plan against spec**

**Spec coverage check:**
- Config file with agents and paths ✓ (Task 1, Task 2)
- Per-agent skill whitelisting via `cfg.skills` ✓ (Task 1)
- `--target` custom targets ✓ (Task 1)
- `--skill` filtering ✓ (Task 1)
- `--dry-run` ✓ (Task 1)
- `--yes` ✓ (Task 1)
- `--init` ✓ (Task 1)
- `--help` ✓ (Task 1)
- Interactive conflict resolution ✓ (Task 1)
- Zero dependencies ✓ (Task 1 — uses only built-in modules)
- README ✓ (Task 4)

No gaps. ✓

**Placeholder scan:** No TBD, TODO, "similar to", "implement later" patterns. ✓

**Type consistency:** All function names, option flags, and config keys consistent throughout. ✓
