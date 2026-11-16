# Live SmartSpectra Test Report

Date: 2026-11-14

Machine: Windows, HP HD Camera

SDK: `@smartspectra/node-sdk` 3.5.0

Telemetry: off

## Result

**Complete native pulse + breathing acceptance test: passed.**

The real API key was accepted, the HP camera opened, and live frames were processed. The original renderer-to-main 1280×720 raw-frame path could not sustain the required frame rate. A temporary 640×480 path removed that error and emitted breathing output, but pulse remained gated by physical framing.

The capture foundation has since been replaced with SmartSpectra's native 1280×720/30 camera path in Electron's main process. A bounded attended Electron acceptance run passed native capture, SDK validation delivery, the memory-only in-app preview, pulse output, and breathing output. The exact redacted result was:

```text
RESULT=PASSED MODE=metrics STREAM=true PULSE_RECEIVED=true BREATH_RECEIVED=true QUALITY=Signal clear
```

No camera frames, API key, or physiological values were saved in this report or committed to Git.

## Evidence

| Check | Outcome |
| --- | --- |
| API authentication | Passed; no authentication error |
| HP camera stream | Passed |
| Native 720p camera transport | Passed |
| In-app memory-only preview | Passed |
| Sustained native frame delivery | Passed; no low-frame-rate termination |
| Signal validation | Clear |
| Pulse metric | Received |
| Breathing metric | Received |
| Overall two-metric test | Passed |

## Root cause and correction

The SDK's renderer 1280×720 Electron path initially ended with error code `14` because RGBA frame copying could not sustain the required rate on this machine. Reducing renderer resolution proved the transport bottleneck but compromised the framing experience.

Dolowcool now captures directly through the native SDK in Electron's main process at 1280×720/30 fps. Processed preview frames are throttled before IPC and exist only in memory. This removes raw capture from the IPC hot path, keeps the API key out of the renderer, preserves the full camera field of view, and eliminates the code `14` failure observed in the original architecture.

Authentication, permissions, SDK startup, native frame transport, validation delivery, preview rendering, pulse output, and breathing output are all verified.

## Post-hardening bounded rerun

A single bounded rerun after the competition-hardening changes opened the camera stream but remained in SmartSpectra's documented `kNoFaceFound` validation state. No metric packets were produced, so that run was recorded as **incomplete/failed**, as intended by the test's fail-closed rule. It did not expose an API key, frame, or physiological value.

This unattended result does not replace the earlier attended two-metric pass above, but it also does not re-verify the full live path after the latest UI changes. The owner must perform the final attended run while centered with face and upper chest visible before recording the demo.

## Strict reliability rerun — 2026-11-16

The acceptance test now requires both measurements to meet SmartSpectra's documented stable-confidence standards, not merely to contain numeric values. A bounded telemetry-off run opened the native camera stream and rendered the preview, then correctly failed closed in validation code `7` because the camera could not see enough of the face, shoulders, and upper chest. It produced no metric packets and never calibrated or unlocked.

```text
RESULT=FAILED STREAM=true VALIDATION_CODE=7 PULSE_RELIABLE=false BREATH_RELIABLE=false
```

This is an expected safe failure, not a complete acceptance pass. A person must sit farther from the camera and remain in frame for the final attended rerun.

## Successful strict live rerun — 2026-11-16

After fixing cross-packet metric synchronization, the attended telemetry-off run passed while the user remained naturally still and breathed normally. SmartSpectra emitted pulse and breathing in separate packets; Dolowcool now retains each fresh measurement for up to eight seconds so the pair can be evaluated together without treating stale data as current.

The camera driver briefly collapsed image brightness while SmartSpectra attempted exposure lock. The SDK detected the luminance drop and reverted the HP camera to automatic exposure because this hardware exposes neither a working AE lock nor gain control. Dolowcool also now renders processed RGBA/BGRA preview frames as opaque and uses a lighter framing overlay.

```text
RESULT=PASSED MODE=metrics STREAM=true PULSE_RECEIVED=true BREATH_RECEIVED=true PULSE_RELIABLE=true BREATH_RELIABLE=true QUALITY=Both signals reliable
```

This is the current accepted live result.

A subsequent bounded live-transport run also populated the recipient, subject, and message fields while native capture was active and returned `COMPOSER_RESPONSIVE=true`; it did not open an email client or transmit the fictional message.

## Reproduce

1. Put the API key in the ignored `.env` file.
2. Sit centered with face and upper chest visible.
3. Run `npm run test:live`.
4. Accept only a result containing `RESULT=PASSED MODE=metrics STREAM=true PULSE_RECEIVED=true BREATH_RECEIVED=true PULSE_RELIABLE=true BREATH_RELIABLE=true` as a complete pass.
