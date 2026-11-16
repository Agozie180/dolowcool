# Dolowcool submission checklist

## Build decisions

**Mode:** one deep SDK flagship. Dolowcool protects depth, reliability, and judge verifiability over adding more biometric metrics or unrelated features.

**Thesis:** a missing, stale, or unreliable body signal can never be interpreted as calm, and Dolowcool never sends automatically.

**Load-bearing architecture:** SmartSpectra owns native capture in Electron's main process. Only validated metric/status events and a throttled memory-only preview cross the renderer boundary. This keeps the API key out of the UI and avoids the measured raw-frame IPC bottleneck.

**Core invariants:**

- explicit consent precedes every camera session;
- pulse and breathing must both be fresh and reliable;
- signal loss interrupts calibration or recovery rather than unlocking;
- personal baseline is session-specific;
- recovery requires the lower threshold continuously for eight seconds;
- no frame, reading, baseline, score, or recap is written to disk;
- no message leaves without an explicit user action.

**Verified constraints:**

- supported runtime is Node 20+ on the SmartSpectra-published platform matrix;
- live use needs an API key, network authentication/subscription validation, and a suitable camera view;
- pulse and breathing can arrive separately and have different acquisition timing;
- the tested camera does not provide reliable AE lock or gain controls;
- public repository, live-camera video, and DEV post are mandatory; hosted app deployment is optional.

**Priority order:**

1. P0 — real native capture, reliable dual metrics, fail-closed thesis, consent.
2. P1 — usable composer, explanation, recovery, override, recap, accessibility.
3. P2 — tests, CI, audit receipts, README, consent analysis, demo and post assets.
4. P3 — public repository, final video, DEV publication, optional public agent session.

**Do not build before submission:** emotion/anger diagnosis, medical claims, Gmail/Outlook OAuth, automatic sending, cloud biometric storage, AI rewriting, HRV/expression feature count, mobile clients, accounts, analytics, or signed installers.

**Day-0 probes already resolved:**

- renderer-to-main 720p frame copying failed the SDK frame-rate requirement → native capture;
- temporary 640×480 transport produced partial output but harmed framing → retain native 720p;
- separate pulse/breath packets caused false missing-state oscillation → freshness-aware merge;
- numeric values arrived below stable confidence → strict reliability thresholds;
- exposure lock darkened the HP camera → SDK auto-exposure fallback plus opaque/lighter preview;
- composer fields remained responsive during native capture → live transport receipt.

## Judging rubric

| Criterion | Evidence judges should see |
| --- | --- |
| Use of underlying technology | Live SmartSpectra label, real preview, changing pulse and breathing, confidence, native source code, strict acceptance report |
| Usability and UX | Consent, framing guidance, continued typing, explanation panel, recovery countdown, save/override/stop choices |
| Originality and creativity | Live body-relative measurements change the availability of a familiar action instead of ending at a chart |

## Prize targets

- Most Creative or Delightful Use.
- Best Thoughtful Real-World Use.
- Overall judging pool. One submission may qualify for several pools but can win only once.

## Public repository

- [ ] Repository is public: https://github.com/Agozie180/dolowcool
- [x] README opens with the one-line explanation, simulator GIF disclosure, and three-command live quickstart.
- [x] README includes live SmartSpectra setup, supported platforms, architecture, verification commands, limitations, consent, and data handling.
- [x] Repository visibly contains the real `@smartspectra/node-sdk` integration and requests pulse plus breathing rate.
- [x] No `.env`, API key, camera frame, personal data, or physiological value is committed.
- [x] Clean-copy `npm ci`, build, unit, Electron, and Presage configuration tests pass on Windows x64.
- [x] `npm test`, `npm run test:smoke`, `npm run test:presage-smoke`, and `npm audit` pass.
- [x] `npm run test:coverage` enforces at least 70% line coverage across the imported unit-test scope.
- [x] One bounded `npm run test:live` run passes with the owner's API key, real camera, both requested metrics, and both SDK reliability verdicts.

## Demo video

- [ ] Public video URL is available.
- [ ] Video is 90–120 seconds and hooks the idea in the first five seconds.
- [ ] Video uses **Live SmartSpectra**, not the simulator.
- [ ] Live pulse and breathing numbers are readable and visibly change.
- [ ] Video shows consent, personal baseline, annoyed draft, pause, explanation, continuous settled hold, unlock, recap, and the repository.
- [ ] Video briefly demonstrates the fail-closed guardrail by losing valid framing while paused, then returning to frame.
- [ ] No API key, `.env`, notification, private email, personal data, or unintended app is visible.
- [ ] Final five seconds show the public repository and SDK integration evidence.

## DEV post

- [x] Post draft uses the challenge template sections: **What I Built**, **Demo**, **Code**, **How It Responds to Human Signals**, **Prize Categories**, **Consent and Data Handling**, **Agent Session**.
- [ ] Demo placeholder is replaced with the public video URL.
- [x] Code section links to the repository URL, which must be made public before publication.
- [x] Prize Categories targets **Most Creative or Delightful Use** and **Best Thoughtful Real-World Use**, with a specific reason for each.
- [x] Consent and Data Handling matches `docs/consent-and-data.md` and links official Presage sources.
- [x] Engineering story includes the renderer-to-main frame-copy bottleneck and move to native main-process capture.
- [x] Signal-integrity rule states that gaps, missing metrics, and low-confidence readings can never silently unlock.
- [x] Limitations and unvalidated interaction thresholds are disclosed.
- [x] Tags are exactly `devchallenge, presagechallenge`.
- [ ] Post is published before 2026-11-22 11:59 PM PST; target publication date is 2026-11-21.

## Optional agent session

- [ ] Agent transcript is curated and scrubbed of keys, personal data, frames, and physiological values.
- [ ] Agent session is uploaded at https://dev.to/agent_sessions/new.
- [ ] **Make Public** is clicked; uploads are unlisted by default.
- [ ] Public agent-session URL replaces the placeholder in the DEV post.

## Owner approval

- [x] Owner supplies and locally stores the SmartSpectra API key.
- [ ] Owner approves the final consent wording and asks Presage the open retention/privacy-policy questions if possible.
- [ ] Owner records and uploads the real-camera demo video.
- [ ] Owner reviews and publishes the DEV post.
- [ ] Owner decides whether to publish the optional agent session.
- [ ] Owner decides whether to rewrite existing Git history to replace the non-noreply author email before wider publication.

## After submission

- [ ] Send Presage the reproducible packet-timing, preview-alpha, exposure, and validation feedback recorded in `AUDIT.md`.
- [ ] Publish a technical retrospective only with measured claims and redacted diagnostics.
- [ ] Maintain issues/releases if real users adopt the project; do not claim product traction before evidence exists.
- [ ] If Dolowcool wins, add the exact verified award and receipt link to the repository description and profile win index.
