#!/usr/bin/env node
// soundscribe — transcribe a local audio/video file via the OpenWhispr
// CLI bridge (NVIDIA Parakeet) and write a plain-text transcript .txt.
// Zero dependencies; Node >= 18.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
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

// --- ffmpeg stage -------------------------------------------------------------

const VIDEO_EXTS = new Set([
  ".mp4", ".mkv", ".mov", ".webm", ".avi", ".m4v", ".flv",
  ".mpg", ".mpeg", ".ts", ".3gp",
]);
const AUDIO_EXTS = new Set([
  ".mp3", ".wav", ".m4a", ".flac", ".ogg", ".opus", ".aac",
  ".wma", ".amr", ".aiff",
]);

function ffprobeStreamInfo(filePath, selectStreams) {
  return spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", selectStreams,
      "-show_entries", "stream=codec_type",
      "-of", "csv=p=0",
      filePath,
    ],
    { encoding: "utf8" }
  );
}

export function classifyInput(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  // Unknown extension: fall back to ffprobe — any video stream means video.
  const r = ffprobeStreamInfo(filePath, "v:0");
  return ((r.stdout || "").trim().length > 0) ? "video" : "audio";
}

// 'yes' = audio stream found; 'no' = probe succeeded but no audio stream;
// 'unknown' = ffprobe itself failed (e.g. corrupt file) — caller defers to ffmpeg.
function probeAudio(filePath) {
  const r = ffprobeStreamInfo(filePath, "a:0");
  if (r.status !== 0) return "unknown";
  return ((r.stdout || "").trim().length > 0) ? "yes" : "no";
}

export function hasAudioStream(filePath) {
  return probeAudio(filePath) === "yes";
}

const FFMPEG_AUDIO_ARGS = ["-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le"];

export function buildFfmpegArgs(inputPath, wavPath, { start, end, duration } = {}) {
  const seek = start === undefined ? "00:00:00" : String(start);
  if (end !== undefined) {
    return ["-ss", seek, "-to", String(end), "-i", inputPath, ...FFMPEG_AUDIO_ARGS, wavPath];
  }
  if (duration !== undefined) {
    return ["-ss", seek, "-t", String(duration), "-i", inputPath, ...FFMPEG_AUDIO_ARGS, wavPath];
  }
  if (start !== undefined) {
    return ["-ss", seek, "-i", inputPath, ...FFMPEG_AUDIO_ARGS, wavPath];
  }
  return ["-i", inputPath, ...FFMPEG_AUDIO_ARGS, wavPath];
}

export function runFfmpeg(args) {
  return new Promise((resolve) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("error", (err) => {
      resolve({ ok: false, stderr: `ffmpeg not found: ${err.message}` });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, stderr: stderr.slice(-2000) });
    });
  });
}

// Each run extracts into its own subdirectory so concurrent runs and
// kept wavs can never be deleted by another run's cleanup.
export function tmpWavPath(inputPath) {
  const runDir = path.join(tempWavDir(), `run-${process.pid}-${Date.now()}`);
  fs.mkdirSync(runDir, { recursive: true });
  const base = path.basename(inputPath, path.extname(inputPath));
  return path.join(runDir, `${base}.wav`);
}

function tempWavDir() {
  return process.platform === "linux"
    ? "/tmp/opencode/soundscribe"
    : path.join(os.tmpdir(), "soundscribe");
}

// Stale run-dirs (kept via --keep-audio or stranded by a failure) are swept
// once older than an hour, so 16 kHz wavs (~2 MB per media minute) cannot
// accumulate unbounded. Only this skill's own subdirectories are touched.
const TEMP_MAX_AGE_MS = 60 * 60 * 1000;

function sweepStaleTempDirs() {
  let entries;
  try {
    entries = fs.readdirSync(tempWavDir(), { withFileTypes: true });
  } catch {
    return; // temp dir does not exist yet
  }
  const now = Date.now();
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(tempWavDir(), e.name);
    try {
      if (now - fs.statSync(dir).mtimeMs > TEMP_MAX_AGE_MS) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {
      // unreadable entry — leave it alone
    }
  }
}

// --- OpenWhispr CLI bridge ----------------------------------------------------

export class BridgeError extends Error {
  constructor(message) {
    super(message);
    this.name = "BridgeError";
  }
}

export function readBridgeFile() {
  const file =
    process.env.OPENWHISPR_BRIDGE_FILE ||
    path.join(os.homedir(), ".openwhispr", "cli-bridge.json");
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    throw new BridgeError(`OpenWhispr is not running (no CLI bridge file at ${file})`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new BridgeError(`invalid CLI bridge file at ${file}`);
  }
  if (!data.port || !data.token) {
    throw new BridgeError(`CLI bridge file is missing port/token: ${file}`);
  }
  return { port: data.port, token: data.token };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function spawnDetached(bin, args = []) {
  const child = spawn(bin, args, {
    detached: true,
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  // An async spawn failure (ENOENT/EACCES) must not crash the CLI with a
  // stack trace — the caller's polling surfaces it as a clean exit 2.
  child.on("error", () => {});
  child.unref();
}

function launchOpenWhispr() {
  if (process.env.OPENWHISPR_BIN) {
    const bin = process.env.OPENWHISPR_BIN;
    if (!fs.existsSync(bin)) {
      throw new BridgeError(`OpenWhispr binary not found at ${bin} (OPENWHISPR_BIN)`);
    }
    spawnDetached(bin);
    return;
  }
  if (process.platform === "darwin") {
    spawnDetached("open", ["-a", "OpenWhispr"]);
    return;
  }
  const candidates =
    process.platform === "win32"
      ? [path.join(process.env.LOCALAPPDATA || "", "Programs", "OpenWhispr", "OpenWhispr.exe")]
      : process.platform === "linux"
        ? ["/opt/OpenWhispr/open-whispr"]
        : [];
  for (const bin of candidates) {
    if (fs.existsSync(bin)) {
      spawnDetached(bin);
      return;
    }
  }
  throw new BridgeError(
    "OpenWhispr is not running and no installed binary was found (set OPENWHISPR_BIN to the app launcher path)"
  );
}

// Any HTTP response — including 401 — means the bridge server is up.
async function pingBridge(port, timeoutMs = 2000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    await fetch(`http://127.0.0.1:${port}/v1/health`, { signal: ac.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function ensureBridgeAvailable({ noLaunch = false, log = () => {} } = {}) {
  let bridge;
  try {
    bridge = readBridgeFile();
  } catch (err) {
    if (noLaunch) {
      throw new BridgeError("--no-launch set and OpenWhispr is not running");
    }
    log("OpenWhispr is not running — launching the app…");
    launchOpenWhispr();
    let haveBridge = false;
    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      try {
        bridge = readBridgeFile();
        haveBridge = true;
        break;
      } catch {
        // keep waiting for the app to write its bridge file
      }
    }
    if (!haveBridge) {
      throw new BridgeError("OpenWhispr did not create its CLI bridge file within 60 s (is the app installed?)");
    }
    log("CLI bridge file present; waiting for the app to come up…");
  }
  for (let i = 0; i < 60; i++) {
    if (await pingBridge(bridge.port)) return bridge;
    await sleep(1000);
  }
  throw new BridgeError(`OpenWhispr is not responding on port ${bridge.port}`);
}

async function postTranscribe(bridge, body, timeoutSec) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), Math.max(1, timeoutSec) * 1000);
  try {
    return await fetch(`http://127.0.0.1:${bridge.port}/v1/transcribe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bridge.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new BridgeError(`transcription request timed out after ${timeoutSec}s`);
    }
    throw new BridgeError(`cannot reach the OpenWhispr bridge on port ${bridge.port}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

async function errorMessage(res) {
  try {
    const json = await res.json();
    if (json?.error?.message) return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return `HTTP ${res.status}`;
}

export async function transcribeViaBridge({ path: mediaPath, model, language, timeoutSec = 900 }) {
  const body = { path: mediaPath };
  if (model !== undefined) body.model = model;
  if (language !== undefined) body.language = language;

  let bridge = readBridgeFile();
  let res = await postTranscribe(bridge, body, timeoutSec);

  if (res.status === 401) {
    // The app restarts rotate the token — re-read once and retry.
    bridge = readBridgeFile();
    res = await postTranscribe(bridge, body, timeoutSec);
    if (res.status === 401) {
      throw new BridgeError(`OpenWhispr rejected the CLI token: ${await errorMessage(res)}`);
    }
  }

  if (!res.ok) {
    throw new BridgeError(await errorMessage(res));
  }

  const json = await res.json();
  const data = json?.data || {};
  return {
    text: typeof data.text === "string" ? data.text : "",
    provider: data.provider,
    model: data.model,
    warning: data.warning,
  };
}

// Full pipeline: parse → validate input → optional ffmpeg stage → OpenWhispr
// bridge transcription → write .txt. Exit codes: 0 ok, 1 usage/validation,
// 2 bridge/ffmpeg/app failure, 3 no speech (nothing written).
export async function main(argv) {
  let tempWav = null;
  try {
    const opts = parseArgs(argv);

    let realInput;
    try {
      realInput = fs.realpathSync(opts.inputPath);
    } catch {
      throw new UsageError(`no file at ${opts.inputPath}`);
    }
    if (!fs.statSync(realInput).isFile()) {
      throw new UsageError(`input is not a file: ${opts.inputPath}`);
    }

    // Resolve and refuse the output BEFORE any expensive work — a forgotten
    // --force must fail fast instead of burning a full transcription. Name
    // the default output after the path the user typed (not the realpath
    // target), so a symlinked input keeps its link's name.
    const outPath = resolveOutputPath(opts.inputPath, opts.out);
    if (fs.existsSync(outPath) && !opts.force) {
      throw new UsageError(`output file already exists: ${outPath} (use --force to overwrite)`);
    }

    const kind = classifyInput(realInput);
    const needsTrim =
      opts.start !== undefined || opts.end !== undefined || opts.duration !== undefined;
    let mediaPath = realInput;

    sweepStaleTempDirs();

    // Video always needs extraction; audio needs ffmpeg only when trimming.
    if (kind === "video" || needsTrim) {
      if (kind === "video") {
        const audio = probeAudio(realInput);
        if (audio === "no") throw new UsageError("input has no audio track");
        // 'unknown' (probe failed, e.g. corrupt file) proceeds so ffmpeg's
        // own error — the actionable one — reaches the user as exit 2.
      }
      tempWav = tmpWavPath(realInput);
      const ff = await runFfmpeg(
        buildFfmpegArgs(realInput, tempWav, {
          start: opts.start,
          end: opts.end,
          duration: opts.duration,
        })
      );
      if (!ff.ok) {
        const tail = ff.stderr.split("\n").filter(Boolean).slice(-2).join(" | ");
        throw new Error(`ffmpeg failed: ${tail}`);
      }
      mediaPath = tempWav;
    }

    await ensureBridgeAvailable({
      noLaunch: opts.noLaunch,
      log: (s) => process.stderr.write(`${s}\n`),
    });

    const result = await transcribeViaBridge({
      path: mediaPath,
      model: opts.model,
      language: opts.language,
      timeoutSec: opts.timeoutSec,
    });

    if (!result.text) {
      process.stderr.write(
        `transcribe: no speech detected in ${opts.inputPath} — nothing written\n`
      );
      return 3;
    }

    fs.writeFileSync(outPath, `${result.text}\n`, "utf8");

    if (tempWav && !opts.keepAudio) {
      fs.rmSync(path.dirname(tempWav), { recursive: true, force: true });
    }

    process.stdout.write(`${outPath}\n`);
    process.stdout.write(`chars: ${result.text.length}\n`);
    process.stdout.write(`provider: ${result.provider}\n`);
    process.stdout.write(`model: ${result.model}\n`);
    process.stdout.write(`preview: ${result.text.slice(0, 200).replace(/\s+/g, " ")}\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`transcribe: ${err.message || err}\n`);
    return err instanceof UsageError ? 1 : 2;
  }
}

// Node resolves import.meta.url through symlinks, but argv[1] keeps the
// symlink path the user typed (this repo deploys skills via symlinks) —
// realpath argv[1] so the guard matches both the repo path and the linked one.
let entryPath = null;
try {
  entryPath = process.argv[1] ? fs.realpathSync(process.argv[1]) : null;
} catch {
  entryPath = process.argv[1]; // e.g. `node -e` eval strings — never matches below
}
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`transcribe: unexpected failure: ${err?.stack || err}\n`);
      process.exit(2);
    });
}
