# What I Built

Dolowcool is a desktop message composer built around one small intervention: you can write immediately, but the action that moves the message into your email client pauses while your pulse or breathing rate is well above your own calm baseline.

It is not trying to identify anger, anxiety, stress, or any medical condition. It measures only relative change during the current session. The goal is to create a brief, visible gap between impulse and action without taking control away from the user.

# Demo

_Add the public demo video here._

# Code

_Add the public repository URL here._

Setup and simulator instructions are included in the repository README.

# How It Responds to Human Signals

Dolowcool captures the camera through SmartSpectra's native Node path at 720p/30 fps, keeping raw-frame transport out of Electron IPC. It requests only SmartSpectra's `BREATHING_RATE` and `PULSE_RATE` metrics and reads their latest measurements. The first stable, continuous window becomes the user's baseline.

For every later sample, the app calculates:

- pulse rise relative to baseline, scaled so a 15% rise reaches the lock threshold;
- breathing-rate rise relative to baseline, scaled so a 30% rise reaches the lock threshold.

The larger of those two values is smoothed with an exponential moving average. Crossing 1.0 activates the pause. Unlocking uses a lower 0.5 threshold plus an uninterrupted eight-second hold, preventing flicker around the boundary. Missing samples reset the hold and keep actions unavailable.

The live interface explains which signal is driving the pause instead of presenting an unexplained biometric verdict.

# Prize Categories

## Most Creative or Delightful Use

Most biometric experiences display a dashboard. Dolowcool turns a live signal into a tiny piece of interaction design: the state of the body changes what a familiar button can do. The effect is understandable without interpreting a chart.

## Best Thoughtful Real-World Use

Regretted messages are a common, non-medical problem. The design emphasizes explicit consent, personal baselines, honest uncertainty, continuous-signal safety, local drafts, and user agency. A deliberate override remains available because a camera estimate should add reflection—not remove autonomy.

# Consent and Data Handling

The camera starts only after the user selects an unchecked consent control and begins a session. A persistent Stop action releases the camera and ends measurement.

Dolowcool stores no video and no physiological readings. Readings remain in memory only for the current session. Optional message drafts are stored locally in `localStorage` and can be deleted with **Discard local draft**. Dolowcool does not share those drafts and uses no AI service.

The SmartSpectra API key is loaded from an environment variable and is not committed or written to app storage. SDK telemetry is disabled by default. According to Presage's telemetry documentation, enabled telemetry includes device, session, performance, and quality summaries but excludes raw frames and physiological values. Authenticated requests may be associated with an account, and diagnostic reports currently have no automatic expiration. Users who explicitly set `DOLOWCOOL_TELEMETRY=1` opt into that SDK telemetry.

Dolowcool is a wellness and reflection tool, not a medical device. It does not diagnose emotions, conditions, or health states and does not make medical decisions.

# Agent Session

_Add a scrubbed, public Codex agent-session link here if used._
