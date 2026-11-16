# Consent and data handling

Last verified against Presage's official pages on 2026-11-14.

## Before the camera starts

Dolowcool does not start camera-based sensing until the user selects an unchecked consent box and presses **Start live camera session**. The app keeps a visible **Stop camera & end session** control available during sensing. Starting a new session requires consent again.

Dolowcool uses pulse and breathing rate only to calculate arousal relative to the user's own session baseline. It does not infer emotions, diagnose a condition, recommend treatment, or make a medical decision.

## Where frames are processed

Presage's official SmartSpectra documentation states: "All metric computation runs on-device inside the SDK; the backend is only contacted to authenticate the API key and validate the subscription." This refutes the third-party claim that SmartSpectra uploads camera frames for metric computation. Source: [SmartSpectra documentation index](https://smartspectra.presagetech.com/llms.txt).

Dolowcool uses SmartSpectra's native camera path in Electron's main process. A throttled processed preview is copied to the renderer for framing. Dolowcool does not write frames to disk.

## What leaves the machine

Even with telemetry disabled, SmartSpectra contacts Presage to authenticate the API key and validate the subscription. The official documentation does not state the complete field-level contents or retention period of those authentication and subscription-validation requests. Source: [SmartSpectra documentation index](https://smartspectra.presagetech.com/llms.txt).

SmartSpectra telemetry defaults to on in the SDK. Dolowcool explicitly sets `enableTelemetry: false` unless the app owner sets `DOLOWCOOL_TELEMETRY=1`. Presage says disabling telemetry starts no telemetry session and transmits no telemetry. Authentication and subscription validation still occur. Source: [SDK Telemetry & Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy).

When telemetry is enabled, measurement-session summaries contain:

- SDK build and package origin;
- platform, OS version, device model, CPU architecture, and SDK binding;
- source kind, session outcome, and the number of requested metrics;
- frame-throughput, frame-rate, startup-latency, flow-limiter, and produced-metric counts;
- counts of validation states and a coarse error code for failed sessions;
- a wall-clock session timestamp.

When telemetry is enabled, a device-readiness check sends its full diagnostic report. That report can include requested metrics, camera selection information, dimensions and frame rate, performance observations, thresholds, diagnostic messages, paths, and platform-supplied errors. Presage warns that free-text diagnostic messages are not guaranteed to be free of identifying information. Source: [SDK Telemetry & Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy).

Presage states that telemetry does not attach raw video/image frames or measured physiological values. Telemetry requests use SDK account authentication and device-authentication headers, so service correlation can associate them with an account; they must not be described as anonymous. Source: [SDK Telemetry & Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy).

## Storage, retention, and deletion

Dolowcool stores no video, camera frames, physiological readings, baseline, relative-arousal score, or session recap on disk. Those values exist only in memory for the active session. An optional message draft is the one exception: it is stored in Electron `localStorage` on the device and can be removed with **Discard local draft**.

For enabled SmartSpectra telemetry, Presage says full device-readiness reports are kept in private diagnostic storage and operational logs contain summary metadata and archive references. Readiness reports and access logs currently have no automatic expiration configured. The official telemetry page does not state a fixed retention period for measurement-session summaries or for authentication/subscription-validation request records. Source: [SDK Telemetry & Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy).

Presage's broader Privacy Policy says it retains personal information as long as necessary for the purposes in that policy; says biometric information and vital-sign data may be used for ongoing research to improve the SDK; and allows deletion requests by email to `support@presagetech.com`, subject to legal or contractual exceptions. If a user does not have their own API key, the policy says the request must go through the app using the SDK. Source: [Presage Privacy Policy](https://api.physiology.presagetech.com/privacypolicy) (last updated February 2, 2024).

The Privacy Policy does not state how its broad biometric/vital-sign collection and research language applies to the current Node SDK when metric computation is on-device and telemetry is disabled. That is an open question for Presage and the owner should obtain written clarification before making any stronger claim.

## Account and key handling

The SmartSpectra API key is loaded only in Electron's main process from `SMARTSPECTRA_API_KEY`. Dolowcool does not expose it to the renderer or write it to app storage. `.env` is ignored by Git.

Dolowcool uses no optional AI service and sends no message automatically. Opening the default email app or copying message text occurs only after an explicit user action.

## Open questions for the owner

- Ask Presage how the Privacy Policy's biometric/vital-sign collection and research clauses apply to a telemetry-off Node SDK session.
- Ask Presage for the retention and deletion rules for authentication/subscription-validation records and measurement-session summaries.
- Ask Presage whether any request fields beyond account/device authentication and subscription validation leave the machine when telemetry is disabled.
