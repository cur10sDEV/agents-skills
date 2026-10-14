#!/usr/bin/env node
// media-to-notes — transcribe a local audio/video file via the OpenWhispr
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

function ffprobeEntries(filePath, selectStreams) {
  const r = spawnSync(
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
  return (r.stdout || "").trim();
}

export function classifyInput(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  // Unknown extension: fall back to ffprobe — any video stream means video.
  return ffprobeEntries(filePath, "v:0").length > 0 ? "video" : "audio";
}

export function hasAudioStream(filePath) {
  return ffprobeEntries(filePath, "a:0").length > 0;
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

export function tmpWavPath(inputPath) {
  const dir =
    process.platform === "linux"
      ? "/tmp/opencode/media-to-notes"
      : path.join(os.tmpdir(), "media-to-notes");
  fs.mkdirSync(dir, { recursive: true });
  const base = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${base}-${Date.now()}.wav`);
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

function launchOpenWhispr() {
  if (process.env.OPENWHISPR_BIN) {
    spawn(process.env.OPENWHISPR_BIN, [], {
      detached: true,
      stdio: "ignore",
      shell: process.platform === "win32",
    }).unref();
    return;
  }
  if (process.platform === "darwin") {
    spawn("open", ["-a", "OpenWhispr"], { detached: true, stdio: "ignore" }).unref();
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
      spawn(bin, [], { detached: true, stdio: "ignore", shell: process.platform === "win32" }).unref();
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
