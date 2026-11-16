# Dolowcool self-audit

Audit date: 2026-11-16. Scope: live SmartSpectra transport, metric integrity, lock safety, composer usability, consent/privacy, and judge reproducibility.

The audit standard is the project thesis: **a missing, stale, or unreliable body signal can never be interpreted as calm, and Dolowcool never sends automatically.** Each receipt below is intended to fail against the relevant pre-fix behavior.

## Findings, fixes, and receipts

| Severity | Finding | Root cause | Fix | Regression receipt |
| --- | --- | --- | --- | --- |
| Critical | Live 1280×720 sessions terminated with sustained low frame rate | Raw RGBA frames crossed renderer→main IPC on the SDK hot path | SmartSpectra now owns native 1280×720/30 capture in the main process; only a throttled processed preview crosses to the renderer | `npm run test:live-transport`; attended `npm run test:live` |
| Critical | A missing metric could contribute a zero rise and appear calm | The first lock-engine contract tolerated partial samples | `LockEngine.push()` now interrupts on either missing metric and clears any recovery hold | `npm test` missing-pulse, missing-breath, and recovery-reset cases |
| High | Pulse and breathing appeared to alternate instead of becoming ready together | SmartSpectra emits them in separate packets; each packet was treated as a complete pair | Cache each metric independently, merge only fresh values, expire each after eight seconds | Strict live run received both reliable metrics; Presage validation tests cover decoding |
| High | A numeric measurement could pass before SmartSpectra considered it stable | Presence and confidence were conflated | Require pulse confidence ≥40 and breathing confidence ≥45 before calibration or unlock | `npm test`; `npm run test:presage-smoke`; strict `npm run test:live` |
| High | A signal gap during recovery could unlock from disconnected low samples | Calm time was not guaranteed continuous across data loss | A >2.5-second gap locks, clears EMA/recovery time, and requires a fresh continuous hold | `npm test` signal-gap and continuous-hold regressions |
| High | Camera preview suddenly became dark during a live session | The HP camera accepted an SDK exposure-lock attempt but exposed neither a dependable lock nor gain control; transparent preview pixels and a heavy overlay made the displayed result worse | The SDK detected the luminance collapse and restored automatic exposure; Dolowcool made RGBA/BGRA output opaque and lightened the framing overlay | Live report records the failure and successful rerun; `npm run test:live-transport` verifies preview availability |
| Medium | Processed preview looked dim even when source frames were usable | SDK preview buffers could contain transparent/ambiguous alpha and the guide overlay was heavy | Convert RGBA/BGRA preview pixels to opaque output and lighten the overlay | Electron/live transport visual acceptance plus live report |
| Medium | Consent details could fall below the initial viewport | The first screen prioritized visual composition over the required disclosure | Consent and data boundaries are presented before start and linked to the full claim-by-claim document | `npm run test:smoke` checks unchecked consent gates start; manual README/post review |
| Medium | The user could not prove normal composing remained usable while sensing | Earlier live checks focused only on camera/metric output | Live acceptance fills recipient, subject, and body while capture is active and records responsiveness | `npm run test:live-transport` prints `COMPOSER_RESPONSIVE=true` |
| Medium | Source shutdown could race with late SDK callbacks | Callbacks could arrive as the source was being stopped/disposed | Lifecycle guards ignore late work and stop paths remain idempotent | Electron smoke stop/recap/return flow and bounded live cleanup |
| Medium | A single low sample could immediately restore handoff | Original behavior needed a stronger anti-flicker recovery rule | Separate lock/unlock thresholds plus an eight-second continuous settled hold | `npm test` hysteresis and early-reset cases; `npm run test:smoke` |
| Low | An override could be activated accidentally by a click | A normal confirmation is too cheap during a pause | Override requires continuous three-second pointer/keyboard hold and cancels on early release | `npm test` hold-gate cases; Electron smoke verifies disclosed control |
| Low | Demo artifacts could be mistaken for real camera proof | A polished simulated flow resembles a live product | Every simulator surface and README artifact is explicitly labeled; live proof has a separate strict command/report | `npm run test:smoke` judge-mode assertions; README and demo checklist |

## Security and privacy review

- `.env` is ignored; `.env.example` contains no credential.
- API key loading and SmartSpectra ownership stay in the Electron main process.
- Renderer access is limited through the preload bridge and narrow IPC handlers.
- No frames, readings, baseline, score, or recap are written to disk.
- Optional local drafts are visibly disclosed and deletable.
- SmartSpectra telemetry is explicitly disabled unless the owner opts in with `DOLOWCOOL_TELEMETRY=1`.
- Authentication and subscription validation still contact Presage; the repository does not claim an offline or anonymous session.
- No optional AI service receives message content.
- `mailto:` is invoked only from an explicit approved action; the app does not transmit mail itself.

## Measured acceptance receipt

Test system: Windows, HP HD Camera, `@smartspectra/node-sdk` 3.5.0, telemetry off.

```text
RESULT=PASSED MODE=metrics STREAM=true PULSE_RECEIVED=true BREATH_RECEIVED=true PULSE_RELIABLE=true BREATH_RELIABLE=true QUALITY=Both signals reliable
```

This receipt establishes one successful attended hardware configuration. It is not a claim of universal camera, physiology, or platform performance.

## Remaining risks and limitations

1. **Hardware variability:** exposure controls, field of view, image quality, and driver behavior vary by camera.
2. **Acquisition variability:** reliable pulse and especially breathing can require careful framing and time.
3. **Interaction thresholds:** the relative-rise and hold values are product choices, not clinical validation.
4. **Cause ambiguity:** a rise can reflect motion, exercise, environment, or many other causes; Dolowcool cannot infer emotion.
5. **Agency tradeoff:** the deliberate override means the app cannot guarantee a message is delayed.
6. **Email boundary:** `mailto:` depends on the operating system's configured client and does not confirm delivery.
7. **Vendor privacy gaps:** Presage does not publish every retention/detail answer for telemetry-off authentication and subscription checks.
8. **Submission blockers:** the repository must be public and a real-camera video and DEV post must be published before judging.

## Structured SmartSpectra feedback

These are reproducible integration findings worth sharing with Presage after the submission. They are observations, not claims that the SDK is defective:

- Pulse and breathing may arrive in separate metric packets, so consumers need a documented freshness/merge strategy.
- On the tested HP camera, an exposure-lock attempt caused a luminance collapse; the SDK correctly reverted to automatic exposure because the driver exposed no working AE lock or gain control.
- A processed preview may carry an unused zero alpha channel; renderers should force opaque alpha when converting RGBA/BGRA buffers.
- Numeric metric output is not sufficient acceptance evidence; applications should use the documented confidence thresholds and validation states.
- Validation code `11` can occur even after native transport previously passed, so bounded live tests should preserve exact diagnostics and fail closed.

## Full regression commands

```bash
npm test
npm run test:coverage
npm run build
npm run test:smoke
npm run test:presage-smoke
npm run test:live-transport
npm run test:live
npm audit
```

The live commands are attended hardware tests. The full test result recorded for a commit should distinguish transport-only success from strict two-metric reliability success.
