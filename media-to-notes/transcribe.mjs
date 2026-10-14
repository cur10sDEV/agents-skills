#!/usr/bin/env node
// media-to-notes — transcribe a local audio/video file via the OpenWhispr
// CLI bridge (NVIDIA Parakeet) and write a plain-text transcript .txt.
// Zero dependencies; Node >= 18.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "UsageError";
  }
}

// Accepts HH:MM:SS, MM:SS, or plain seconds (e.g. "00:01:30", "01:30", "750").
const TIME_RE = /^(?:(\d{1,2}):(\d{2})(?::(\d{2}))?|(\d+(?:\.\d+)?))$/;

export function validateTimeValue(value, flag) {
  if (typeof value !== "string" || !TIME_RE.test(value)) {
    throw new UsageError(
      `${flag} must be HH:MM:SS, MM:SS, or seconds (got ${JSON.stringify(value)})`
    );
  }
  return value;
}

const VALUE_FLAGS = new Set([
  "--start",
  "--end",
  "--duration",
  "--out",
  "--model",
  "--language",
  "--timeout",
]);
const BOOL_FLAGS = new Set(["--force", "--keep-audio", "--no-launch"]);

export function parseArgs(argv) {
  const opts = {
    inputPath: null,
    start: undefined,
    end: undefined,
    duration: undefined,
    out: undefined,
    model: undefined,
    language: undefined,
    force: false,
    keepAudio: false,
    noLaunch: false,
    timeoutSec: 900,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (VALUE_FLAGS.has(a)) {
      const v = argv[i + 1];
      if (v === undefined) throw new UsageError(`${a} requires a value`);
      i++;
      if (a === "--start") opts.start = validateTimeValue(v, a);
      else if (a === "--end") opts.end = validateTimeValue(v, a);
      else if (a === "--duration") opts.duration = validateTimeValue(v, a);
      else if (a === "--out") opts.out = v;
      else if (a === "--model") opts.model = v;
      else if (a === "--language") opts.language = v;
      else if (a === "--timeout") {
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) {
          throw new UsageError(`--timeout must be a positive number (got ${v})`);
        }
        opts.timeoutSec = n;
      }
    } else if (BOOL_FLAGS.has(a)) {
      if (a === "--force") opts.force = true;
      else if (a === "--keep-audio") opts.keepAudio = true;
      else if (a === "--no-launch") opts.noLaunch = true;
    } else if (a.startsWith("--")) {
      throw new UsageError(`unknown option: ${a}`);
    } else {
      positional.push(a);
    }
  }

  if (opts.end !== undefined && opts.duration !== undefined) {
    throw new UsageError("provide only one of --end or --duration");
  }
  if (positional.length === 0) {
    throw new UsageError("usage: transcribe.mjs <input-media> [options]");
  }
  if (positional.length > 1) {
    throw new UsageError(`unexpected extra argument: ${positional[1]}`);
  }
  opts.inputPath = positional[0];
  return opts;
}

// --out is a directory when it exists as one or ends with a path separator;
// otherwise it is the output file path itself. Default: <cwd>/<basename>-transcript.txt.
export function resolveOutputPath(inputPath, outFlag) {
  const base = path.basename(inputPath, path.extname(inputPath)) + "-transcript.txt";
  if (outFlag === undefined) return path.resolve(process.cwd(), base);
  let isDir = false;
  try {
    isDir = fs.statSync(outFlag).isDirectory();
  } catch {
    isDir = false;
  }
  if (isDir || outFlag.endsWith("/") || outFlag.endsWith(path.sep)) {
    return path.resolve(outFlag, base);
  }
  return path.resolve(outFlag);
}

// Stub until Task 4 wires the full pipeline: parses arguments and reports
// usage errors with the CLI's exit-code contract (1 = usage/validation).
export function main(argv) {
  try {
    parseArgs(argv);
    return 0;
  } catch (err) {
    process.stderr.write(`transcribe: ${err.message}\n`);
    return err instanceof UsageError ? 1 : 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
