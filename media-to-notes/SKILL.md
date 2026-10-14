---
name: media-to-notes
description: Transcribe a local audio or video file locally via the OpenWhispr desktop app's CLI bridge (NVIDIA Parakeet model) and hand the plain-text transcript to the notesmith skill to produce a study guide. Use when the user asks to transcribe a recording or lecture, extract audio from a video, optionally trim between --start/--end or --start/--duration timestamps, or make notes from any media file. Requires OpenWhispr installed; launches it automatically if it is not running.
version: 0.1.0
---

# Media to Notes

Turn a local media file (audio or video) into a notesmith study guide, fully locally: OpenWhispr's bundled NVIDIA Parakeet model does the transcription, notesmith writes the note.

## When to use

- "Transcribe this audio/video/lecture/recording"
- "Make notes from this mp4/wav/m4a/..." (any media file)
- "Extract audio from this video between 5:00 and 12:30, then summarize/notes"
- Any task where a transcript `.txt` of a local media file is the input to further work (if the user only wants the transcript, stop after step 2)

The transcription runs on this machine through the OpenWhispr app's local CLI bridge — no cloud, no API keys. English model by default (`parakeet-unified-en-0.6b`).

## Workflow

**Step 1 — transcribe.** Run the script bundled in this skill's directory (the directory containing this SKILL.md):

```bash
node <skill-dir>/transcribe.mjs <input-media> [options]
```

Options: see the table below. `--start`/`--end`/`--duration` accept `HH:MM:SS`, `MM:SS`, or plain seconds; they trim the media before transcription. Defaults: whole file, no trimming.

**Step 2 — relay the summary.** On success (exit 0) the script prints the transcript's absolute `.txt` path as the first stdout line, then `chars:`, `provider:`, `model:`, `preview:` lines. Read the `.txt` file if you need the full text; do not paste the whole transcript into the conversation unless asked.

**Step 3 — hand off to notesmith.** Invoke the **notesmith** skill on the printed `.txt` file path. Do not restate or re-implement notesmith's rules here — notesmith owns the note structure, fidelity rules, and output location (`study-guide-<slug>.md` in the literal current working directory). If the notesmith skill is not available in your agent, stop after step 2 and report the `.txt` path instead.

**Step 4 — report.** Tell the user the final study-guide path (and the transcript path). If the script exited 3 (no speech), say so — there is nothing to hand to notesmith.

## Options

| Flag | Default | Meaning |
|---|---|---|
| `--start <HH:MM:SS\|s>` | from beginning | Trim start point (applies to audio and video) |
| `--end <HH:MM:SS\|s>` | end of file | Trim end point; mutually exclusive with `--duration` |
| `--duration <HH:MM:SS\|s>` | — | Trim length from `--start`; mutually exclusive with `--end` |
| `--out <path>` | `./<basename>-transcript.txt` | Output `.txt`; a directory means `<dir>/<basename>-transcript.txt` |
| `--model <name>` | app's default model | Model name as listed by `GET /v1/transcribe/models` (e.g. `parakeet-unified-en-0.6b`) |
| `--language <code>` | none | Optional language hint passed through to OpenWhispr |
| `--force` | off | Overwrite an existing output `.txt` (refused otherwise) |
| `--keep-audio` | off | Keep the extracted/trimmed `.wav` in the temp dir instead of deleting it (kept wavs are swept after ~1 hour by a later run) |
| `--no-launch` | off | Fail rather than auto-launch OpenWhispr when the app is closed |
| `--timeout <seconds>` | 900 | Max wait for the transcription request |

Video inputs are always passed through ffmpeg first (`-vn -ac 1 -ar 16000 -c:a pcm_s16le` → 16 kHz mono WAV in the temp dir). Audio files skip ffmpeg unless trim flags are given. The transcript `.txt` contains raw text only — no timestamps, no headers.

## Troubleshooting

| Symptom / exit code | Cause and fix |
|---|---|
| exit 1, `output file already exists` | Add `--force` or choose another `--out` |
| exit 1, `provide only one of --end or --duration` | Pick one; both were given |
| exit 1, `no file at …` | Input path wrong, or the agent's working directory moved |
| exit 1, `input has no audio track` | Valid video file with no audio stream |
| exit 2, `--no-launch set and OpenWhispr is not running` | Launch OpenWhispr, or drop `--no-launch` |
| exit 2, `OpenWhispr … no installed binary was found` | OpenWhispr is not installed (or non-standard path — set `OPENWHISPR_BIN`) |
| exit 2, `Model '…' is not downloaded` | Open OpenWhispr → Settings → Transcription → download the model, or omit `--model` |
| exit 2, `ffmpeg failed: …` | Corrupt/unsupported media (temp wav is kept for diagnosis; pass `--keep-audio` to inspect) |
| exit 2, `OpenWhispr is not responding` / launch timeout | App started but its bridge never came up — open the app manually once and retry |
| exit 2, `OpenWhispr rejected the CLI token` | Bridge file/token out of sync — restart the app, retry; if it persists, remove `~/.openwhispr/cli-bridge.json` and restart |
| exit 3, `no speech detected` | File has no speech (silence/music) — nothing written, do not invoke notesmith |

The CLI bridge only exists while the OpenWhispr desktop app runs; without `--no-launch` the script launches the app itself and waits for the bridge (up to 60 s + 60 s). Long recordings are fine — OpenWhispr segments them automatically.

## Appendix — OpenWhispr CLI bridge reference

The app exposes a loopback HTTP API for external CLIs. Read the current endpoint and token from `~/.openwhispr/cli-bridge.json` (`{"version":1,"port":8200,"token":"…"}`; port range 8200–8219; **token and port rotate on every app start**). Send `Authorization: Bearer <token>` on every request; requests from non-loopback addresses are refused.

| Endpoint | Purpose |
|---|---|
| `GET /v1/health` | Liveness check |
| `GET /v1/transcribe/models` | Available + downloaded transcription models |
| `POST /v1/transcribe` | Body `{"path": "<absolute media path>", "model": "…", "language": "…"}` → `{"data":{"text","provider","model"}}`; the app reads the file itself |
| `GET /v1/notes/list`, `GET /v1/notes/search`, `GET /v1/notes/<id>` | Read notes |
| `POST /v1/notes/create`, `PATCH /v1/notes/<id>`, `DELETE /v1/notes/<id>` | Write notes (optional — e.g. filing a transcript as a note) |

Env overrides for testing/non-standard setups: `OPENWHISPR_BRIDGE_FILE` (bridge file path), `OPENWHISPR_BIN` (app launcher path).
