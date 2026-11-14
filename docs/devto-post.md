Tags: `devchallenge, presagechallenge`

# What I Built

I built Dolowcool, an Electron desktop message composer that adds a pause between writing a message and moving it into an email client.

The user can write immediately. During a camera session, Dolowcool compares SmartSpectra pulse and breathing-rate readings with that user's own baseline for the current session. If either reading rises far enough above the baseline, the email and copy actions pause. They return only after the relative score stays below a lower threshold for one continuous hold.

I wanted the behavior to be understandable without asking the user to interpret a biometric dashboard. The interface says which signal is driving the pause, shows the baseline and current values, exposes the thresholds and countdown, and keeps **Save draft** available. Nothing sends automatically. A visible override remains available, but it requires a continuous three-second press-and-hold.

Dolowcool does not infer emotions or medical conditions. It uses only pulse and breathing rate to calculate arousal relative to a personal session baseline.

# Demo

_Public 90–120 second demo video link: [ADD VIDEO URL]_

The final video uses the real SmartSpectra source with live pulse and breathing numbers visible. The repository GIF uses the simulator so it contains no face or API key.

# Code

Repository: https://github.com/Agozie180/dolowcool

The README includes the three-command simulator path, live SmartSpectra setup, supported platforms, architecture, tests, and an exact consent/data-handling explanation.

# How It Responds to Human Signals

Dolowcool requests only SmartSpectra's `PULSE_RATE` and `BREATHING_RATE` metrics. The SmartSpectra source owns the native camera and SDK in Electron's main process; the API key never enters the renderer. A throttled, memory-only processed preview goes to the renderer for framing.

That architecture came from a failed first approach. I initially copied 1280×720 camera frames from the renderer to the main process. On my test machine, that path could not sustain the SDK's required frame rate and ended with a sustained-low-frame-rate error. A temporary lower-resolution path proved that frame transport was the bottleneck, so I moved capture into SmartSpectra's native main-process camera path. The full live acceptance test then received both pulse and breathing output.

After a stable, continuous baseline is available, Dolowcool calculates two relative rises:

- pulse rise divided by a 15% reference rise;
- breathing-rate rise divided by a 30% reference rise.

It takes the larger value and smooths it with an exponential moving average. A score of 1.0 activates the pause. Unlocking uses hysteresis: the score must fall to 0.5 or lower and stay there for eight continuous seconds. These values are interaction-design starting points, not medically validated thresholds.

The lost-sample rule is intentionally strict: **a signal gap can never silently unlock**. A gap activates or preserves the pause, resets the calm hold, and requires a fresh continuous signal. SmartSpectra validation states such as no face found, poor framing, darkness, brightness, low frame rate, and motion are mapped to specific on-screen guidance. Missing or invalid data never counts as settled data.

For a camera-free review, the simulator has a permanently labeled **Simulated** judge mode. **Run demo scenario** plays baseline, rise, pause, settling, and unlock in about 60 seconds through the same lock engine used by the live source.

Current limitations: measurements depend on lighting, framing, stillness, and the SDK's averaging windows; the thresholds have been tuned only as a demo interaction; the composer opens a `mailto:` handoff rather than integrating with a mail provider; and the simulator proves UX rather than SDK use. The public video therefore must show the real SmartSpectra source and changing live values.

# Prize Categories

**Most Creative or Delightful Use.** Many camera-signal projects end at a chart. I used the live signal as an interaction state for a familiar action: the body-relative score changes what the message controls can do. The judge scenario, transparent explanation, deliberate hold override, and memory-only recap make that behavior visible without pretending the estimate is a verdict about the person.

**Best Thoughtful Real-World Use.** Regretted messages are an ordinary, non-medical problem. The app uses explicit consent, a personal rather than population baseline, visible uncertainty and signal coaching, a lost-sample rule that cannot fail open, local draft control, a reversible override, and no automatic sending. The user retains agency throughout.

# Consent and Data Handling

The camera starts only after the user selects an unchecked consent box that explains the data flow and presses **Begin session**. A visible **Stop camera & end session** control releases the camera, and a new session requires consent again.

Presage's official documentation says all SmartSpectra metric computation runs on-device and that its backend is contacted to authenticate the API key and validate the subscription. That official statement refutes a third-party claim that camera frames are uploaded for metric computation. Source: [SmartSpectra documentation index](https://smartspectra.presagetech.com/llms.txt).

Dolowcool does not write camera frames, pulse readings, breathing readings, the baseline, relative score, or recap to disk. They remain in memory for the session. The optional message draft is the only persisted app content; Electron stores it locally in `localStorage`, and **Discard local draft** deletes it. Dolowcool uses no optional AI service.

SmartSpectra telemetry defaults to on in the SDK, so Dolowcool explicitly passes `enableTelemetry: false` unless the app owner sets `DOLOWCOOL_TELEMETRY=1`. Presage says disabling it starts no telemetry session and transmits no telemetry; API-key authentication and subscription validation still occur. When enabled, telemetry includes SDK/device/runtime details, session shape, performance counts, quality-state counts, coarse failure information, and timestamps. Full readiness reports can also contain camera configuration, thresholds, diagnostic text, paths, and platform errors. Presage states that telemetry does not attach raw frames or measured physiological values. Authenticated requests can be correlated with an account and must not be described as anonymous. Source: [SDK Telemetry & Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy).

Presage says full readiness reports and access logs currently have no automatic expiration. Its telemetry page does not state a fixed retention period for measurement-session summaries or authentication/subscription-validation records. Its broader Privacy Policy says personal information is retained as long as necessary, includes broad biometric/vital-sign research language, and accepts deletion requests at `support@presagetech.com`, subject to stated exceptions. The policy does not state how those broad clauses apply to a telemetry-off Node session; I am treating that as an open question rather than making a stronger privacy claim. Source: [Presage Privacy Policy](https://api.physiology.presagetech.com/privacypolicy).

The SmartSpectra API key is read from `SMARTSPECTRA_API_KEY` only in Electron's main process, is ignored by Git when placed in `.env`, and is never exposed to the renderer or written to app storage.

Dolowcool is a wellness and reflection tool, not a medical device. It does not diagnose, treat, identify emotions, or make medical decisions.

# Agent Session

_Optional public, curated, secret-scrubbed Codex agent-session link: [ADD AGENT SESSION URL]_
