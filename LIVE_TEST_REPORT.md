# Live SmartSpectra Test Report

Date: 2026-11-14

Machine: Windows, HP HD Camera

SDK: `@smartspectra/node-sdk` 3.5.0

Telemetry: off

## Result

**Native camera transport and preview: passed. Complete pulse + breathing acceptance test: awaiting an attended framing run.**

The real API key was accepted, the HP camera opened, and live frames were processed. The original renderer-to-main 1280×720 raw-frame path could not sustain the required frame rate. A temporary 640×480 path removed that error and emitted breathing output, but pulse remained gated by physical framing.

The capture foundation has since been replaced with SmartSpectra's native 1280×720/30 camera path in Electron's main process. A bounded Electron acceptance run passed native capture, SDK validation delivery, and the memory-only in-app preview. An unattended native run processed more than 1,200 frames without a sustained-low-frame-rate failure; its final validation was code `1` (`No face found`), which is expected when nobody is seated in front of the camera.

No camera frames, API key, or physiological values were saved in this report or committed to Git.

## Evidence

| Check | Outcome |
| --- | --- |
| API authentication | Passed; no authentication error |
| HP camera stream | Passed |
| Native 720p camera transport | Passed |
| In-app memory-only preview | Passed |
| Sustained native frame delivery | Passed; no low-frame-rate termination |
| Historical reduced-resolution metric packets | Received |
| Historical breathing metric | Present |
| Historical pulse metric | Withheld by framing validation |
| Latest unattended validation | Code `1`: no face found |
| Overall two-metric test | Requires an attended framing run |

## Root cause and correction

The SDK's renderer 1280×720 Electron path initially ended with error code `14` because RGBA frame copying could not sustain the required rate on this machine. Reducing renderer resolution proved the transport bottleneck but compromised the framing experience.

Dolowcool now captures directly through the native SDK in Electron's main process at 1280×720/30 fps. Processed preview frames are throttled before IPC and exist only in memory. This removes raw capture from the IPC hot path, keeps the API key out of the renderer, preserves the full camera field of view, and eliminates the code `14` failure observed in the original architecture.

The remaining full-metric acceptance step is physical: a person must be seated far enough from the camera for face and upper chest to remain visible with steady front lighting. Authentication, permissions, SDK startup, native frame transport, validation delivery, and preview rendering are verified.

## Reproduce

1. Put the API key in the ignored `.env` file.
2. Sit centered with face and upper chest visible.
3. Run `npm run test:live`.
4. Accept only `RESULT=PASSED MODE=metrics STREAM=true PULSE_RECEIVED=true BREATH_RECEIVED=true` as a complete pass.
