# Live SmartSpectra Test Report

Date: 2026-11-14

Machine: Windows, HP HD Camera

SDK: `@smartspectra/node-sdk` 3.5.0

Telemetry: off

## Result

**Complete pulse + breathing acceptance test: not yet passed.**

The real API key was accepted, the HP camera opened, the SDK reached its running state, and live frames were processed. A 640×480 run emitted SmartSpectra metric packets and included breathing output, but pulse output remained gated by validation code `7`: the frame did not contain both the user's face and upper chest.

No camera frames, API key, or physiological values were saved in this report or committed to Git.

## Evidence

| Check | Outcome |
| --- | --- |
| API authentication | Passed; no authentication error |
| HP camera stream | Passed |
| SDK processing state | Running (`3`) |
| Sustained frame delivery at 640×480 | Passed; no low-frame-rate termination |
| SmartSpectra metric packets | Received |
| Breathing metric present | Yes |
| Pulse metric present | No |
| Final validation | Code `7`: face and upper chest must both be visible |
| Overall two-metric test | Not passed |

## Root cause and correction

The SDK's default 1280×720 Electron frame path initially ended with error code `14` because RGBA frame copying could not sustain the required rate on this machine. Dolowcool now owns a 640×480, 30-fps browser camera stream and supplies it to the official renderer SDK. That removed the frame-rate failure and allowed metric packets to arrive.

The remaining failure is physical framing, not authentication, permissions, SDK startup, or frame transport. A final acceptance run requires a person seated far enough from the camera for face and upper chest to remain visible with steady front lighting.

## Reproduce

1. Put the API key in the ignored `.env` file.
2. Sit centered with face and upper chest visible.
3. Run `npm run test:live`.
4. Accept only `RESULT=PASSED STREAM=true PULSE_RECEIVED=true BREATH_RECEIVED=true` as a complete pass.
