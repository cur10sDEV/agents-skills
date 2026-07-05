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

if (!process.stdout.isTTY) {
  for (const key of Object.keys(colors)) colors[key] = '';
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { targets: [], skills: [], dryRun: false, yes: false, init: false, help: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--target':
        if (i + 1 >= args.length) {
          console.error(`${colors.red}Error: --target requires a path argument${colors.reset}`);
          process.exit(1);
        }
        opts.targets.push(args[++i]);
        break;
      case '--skill':
        if (i + 1 >= args.length) {
          console.error(`${colors.red}Error: --skill requires a name argument${colors.reset}`);
          process.exit(1);
        }
        opts.skills.push(args[++i]);
        break;
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
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`${colors.red}Error reading ${CONFIG_FILE}: ${err.message}${colors.reset}`);
    console.error(`${colors.yellow}Falling back to empty config. Fix or remove skills.json.${colors.reset}`);
    return { agents: {}, customTargets: [] };
  }
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

  const allSkills = discoverSkills();

  if (allSkills.length === 0) {
    console.log(`${colors.red}No skills found (no directories with SKILL.md).${colors.reset}`);
    process.exit(1);
  }

  let skills = allSkills;
  if (opts.skills.length > 0) {
    const missing = opts.skills.filter(s => !allSkills.includes(s));
    for (const s of missing) console.log(`${colors.yellow}⚠  Skill "${s}" not found.${colors.reset}`);
    skills = allSkills.filter(s => opts.skills.includes(s));
    if (skills.length === 0) {
      console.log(`${colors.red}No matching skills found.${colors.reset}`);
      process.exit(1);
    }
  }

  const targets = [];
  for (const [name, cfg] of Object.entries(config.agents)) {
    let agentSkills = cfg.skills || allSkills;
    if (opts.skills.length > 0) {
      agentSkills = agentSkills.filter(s => opts.skills.includes(s));
    }
    targets.push({ name, path: resolvePath(cfg.path), skills: agentSkills });
  }
  for (const t of config.customTargets) {
    const resolved = resolvePath(t);
    targets.push({ name: path.basename(resolved), path: resolved, skills });
  }
  for (const t of opts.targets) {
    targets.push({ name: path.basename(resolvePath(t)), path: resolvePath(t), skills });
  }

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

        // Safety check: verify linkPath is a reasonable path (not root or empty)
        const resolvedLinkPath = path.resolve(linkPath);
        if (resolvedLinkPath === '/' || resolvedLinkPath === path.dirname(resolvedLinkPath)) {
          console.log(`  ${colors.red}✗ Refusing to remove ${linkPath} — path too shallow.${colors.reset}`);
          errors++;
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
