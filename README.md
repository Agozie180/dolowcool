# Dolowcool

**Write now. Send when settled.** Dolowcool turns live pulse and breathing rate into a transparent, reversible pause before a message leaves the desktop composer.

![Simulated Dolowcool flow: calibrating, paused, then settled](docs/dolowcool-demo.gif)

```bash
npm install
npm test
npm start
```

`npm start` is the live SmartSpectra experience and requires `SMARTSPECTRA_API_KEY` in the environment or ignored `.env` file. The simulator is an explicitly labeled developer fallback, not the competition experience.

Built for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-2026-11-04).

[![CI](https://github.com/Agozie180/dolowcool/actions/workflows/ci.yml/badge.svg)](https://github.com/Agozie180/dolowcool/actions/workflows/ci.yml)

The GIF is captured from the real Electron UI in simulator mode. It contains no face, camera frames, API key, or readings from a person. The competition demo must use the live SmartSpectra source.

## Why it is different

- **The live signal controls the core interaction.** Pulse and breathing rate directly determine whether the message action is available.
- **Personal, not population-based.** Dolowcool learns a stable baseline for each session instead of applying a universal “calm” number.
- **Continuous means continuous.** Lost samples reset the calm hold; a signal gap can never silently unlock the action.
- **Reliability is part of the rule.** Both pulse and breathing must meet SmartSpectra's documented reliability verdicts; missing or low-confidence data keeps actions paused.
- **User agency remains intact.** A clearly disclosed override requires a continuous three-second press-and-hold, and nothing is sent automatically.
- **The data boundaries are visible before sensing starts.** Dolowcool stores no frames or physiological readings, and it explicitly disables optional SmartSpectra telemetry unless the app owner enables it.

## Experience

1. The user explicitly consents before the camera starts.
2. A live preview and framing guide help establish a clear signal.
3. Dolowcool waits for reliable pulse and breathing, then learns a stable, continuous personal baseline.
4. The user writes while pulse and breathing remain visible.
5. A relative-arousal score uses the stronger rise of pulse or breathing rate.
6. If the score crosses the threshold, email and copy actions pause, and **Why is this paused?** exposes every input and rule.
7. The actions return only after readings remain below the lower threshold for eight continuous seconds.
8. Ending the session shows a memory-only relative-score timeline with pause and unlock markers.
9. The user reviews the message in their default email app; Dolowcool never sends automatically.

## Developer fallback: simulated signals

No camera, API key, or trial credits are needed.

```bash
npm install
npm run start:sim
```

Press **Run demo scenario** for a permanently labeled, approximately 60-second simulated tour of baseline, rise, pause, settling, and unlock. Or control the same lock engine manually with the slider.

## Run with SmartSpectra

Requirements:

- Node.js 20 or newer
- Windows x64, macOS Apple Silicon, or Linux x64/ARM64. Linux requires glibc 2.35 or newer (for example Ubuntu 22.04+ or Debian 12+).
- A SmartSpectra API key

This platform matrix is the one published for `@smartspectra/node-sdk` 3.5.0 in Presage's [Node.js and Electron SDK documentation](https://smartspectra.presagetech.com/docs/nodejs).

PowerShell:

```powershell
$env:SMARTSPECTRA_API_KEY='your_key'
npm start
```

Alternatively, copy `.env.example` to `.env`, paste the key after `SMARTSPECTRA_API_KEY=`, and run `npm start`. The `.env` file is ignored by Git.

SmartSpectra's first discovered camera is used by default. Set `DOLOWCOOL_CAMERA_ID` only when a machine has multiple cameras and a specific device is required.

macOS/Linux:

```bash
SMARTSPECTRA_API_KEY=your_key npm start
```

The app uses SmartSpectra's native Node camera path in Electron's main process at 1280×720/30 fps. This avoids copying every raw camera frame from the renderer to the main process, which could not sustain SmartSpectra's required frame rate on the test machine. A throttled, memory-only processed preview is sent to the renderer for framing; frames are never written to disk. Only `BREATHING_RATE` and `PULSE_RATE` are requested, avoiding unrelated models and trial usage. SmartSpectra may deliver those measurements in separate packets, so Dolowcool merges the latest fresh pulse and breathing points with an eight-second expiration instead of incorrectly treating each packet as a complete pair. Both readings must meet SmartSpectra's documented stable-confidence standards—pulse confidence 40 or higher and breathing confidence 45 or higher—before calibration or unlocking can progress. The API key stays in the main process and is never exposed to the renderer.

## Verification

```bash
npm test
npm run test:smoke
npm run test:presage-smoke
npm audit
```

To verify the complete email-client handoff without opening a mail client or sending anything:

```powershell
$env:DOLOWCOOL_TEST_RECIPIENT='recipient@example.com'
npm run test:email-handoff
```

With a key in `.env`, `npm run test:live` performs one bounded, telemetry-off test of the real Electron camera and SmartSpectra native pipeline, allowing up to 90 seconds for both metrics to meet the SDK reliability thresholds before it stops automatically.

`npm run test:live-transport` performs a shorter acceptance check for native camera capture, SDK validation, and the in-app preview without waiting for vital-sign output.

For a valid pulse-and-breathing run, sit far enough from the camera for both your face and upper chest to be visible with soft front lighting. The test records only pass/fail booleans and SDK status codes; it does not save frames, API keys, or physiological values. See [LIVE_TEST_REPORT.md](LIVE_TEST_REPORT.md) for the latest redacted hardware run.

The tests cover:

- stable personal-baseline calibration;
- threshold smoothing and hysteresis;
- continuous calm-hold unlocking;
- prevention of false unlocks after gaps, missing metrics, or low-confidence readings;
- all documented SmartSpectra validation-state coaching;
- the three-second override hold and early-release cancellation;
- memory-only recap timing and markers;
- the Electron consent, judge-mode, draft, accessibility-announcement, and stop-session flow.

## Architecture

- `renderer/lock.js` — pure, tested baseline and state engine.
- `renderer/renderer.js` — memory-only camera preview, experience state, explanations, recap rendering, draft handling, email handoff, and deliberate override.
- `renderer/demo-scenario.js`, `session-recap.js`, `hold-confirm.js` — small independently tested behavior modules.
- `sources/presage.js` — native SmartSpectra camera capture, validation feedback, and metric decoding.
- `sources/sim.js` — camera-free signal simulator.
- `main.js` — window security, source lifecycle, narrow renderer IPC, and safe `mailto:` handoff.

## Consent and data handling

- Camera-based sensing starts only after an unchecked consent box is selected and **Start live camera session** is clicked. **Stop camera & end session** releases the camera; a new session requires consent again.
- Presage states that SmartSpectra metric computation runs on-device and its backend is contacted to authenticate the API key and validate the subscription. Camera frames are therefore not uploaded for metric computation. [Official SmartSpectra documentation index](https://smartspectra.presagetech.com/llms.txt)
- Dolowcool stores no frames, physiological readings, baseline, relative-arousal score, or recap on disk. Those values stay in memory for the session. Optional message drafts are stored in local `localStorage` and can be removed with **Discard local draft**.
- SmartSpectra telemetry defaults to on in the SDK. Dolowcool explicitly sets `enableTelemetry: false` unless the app owner sets `DOLOWCOOL_TELEMETRY=1`. Presage says disabled telemetry starts no telemetry session and transmits no telemetry. Authentication and subscription validation still occur. [SDK Telemetry & Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy)
- When enabled, telemetry contains SDK/device/runtime details, session shape, performance counts, validation-state counts, coarse failure information, and timestamps. Device-readiness reports can also contain camera configuration, thresholds, diagnostic messages, paths, and platform errors. Presage says telemetry excludes raw frames and measured physiological values.
- Telemetry uses account and device-authentication headers, so requests can be associated with an account and are not anonymous. Full readiness reports and access logs currently have no automatic expiration. Presage does not state a fixed retention period for session summaries or authentication/subscription-validation records on these pages.
- Presage's broader Privacy Policy says personal information is retained as long as necessary, includes biometric/vital-sign language, and provides deletion requests through `support@presagetech.com`. It does not state how those broad clauses apply to a telemetry-off Node session. [Presage Privacy Policy](https://api.physiology.presagetech.com/privacypolicy)
- The API key is loaded from `SMARTSPECTRA_API_KEY` only in Electron's main process. It is never exposed to the renderer or written to app storage.
- Dolowcool uses no optional AI service and makes no diagnosis, treatment recommendation, emotion inference, or medical decision.

The full claim-by-claim explanation and open questions are in [docs/consent-and-data.md](docs/consent-and-data.md).

## License

MIT — see [LICENSE](LICENSE).

## Submission working files

- [DEV post draft](docs/devto-post.md)
- [90–120 second demo script](docs/demo-script.md)
- [Submission checklist](docs/submission-checklist.md)
- [Detailed consent and data notes](docs/consent-and-data.md)
