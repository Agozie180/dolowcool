# Dolowcool: handoff for Codex

Date written: 2026-11-13. Deadline: **2026-11-22, 11:59 PM PST**. The owner (the user) is a solo participant and is using an AI coding agent to build this. Read this whole file before touching code.

How to read this file: each fact is marked **[user]** (the user said or chose it), **[source]** (found in the challenge page or third-party material, with where), or **[assumed]** (my guess, verify it). Do not treat [assumed] items as facts.

---

## 1. What this is

**Dolowcool** is a desktop message composer. The **Send button stays locked while the user's pulse or breathing rate is well above their own calm baseline**, and unlocks only after they have settled and stayed settled. A secondary action, "Save draft & sleep on it", is always available.

It is an entry for the **Presage SmartSpectra SDK Challenge** on DEV: https://dev.to/challenges/presage-2026-11-04

- **[user]** Chose this idea out of several I proposed. They asked for non-generic ideas and were interested in fast-changing body states (running/exertion, anger, over-breathing). They picked the "send button locks until you've cooled down" idea.
- **[user]** Name is **"Dolowcool"**. They explicitly said **not** to call it "Cooldown Send" (that was my working name). Do not use that name anywhere.
- **[user]** They intend to use an AI agent to build it (that is you now). They will give you this file.

Why this idea (pitch logic, useful for the DEV post): relatable, ten seconds to understand, the live signal directly controls the app's one behavior, and the demo films itself.

---

## 2. Challenge rules that constrain the build [source: challenge page]

Dates: runs Nov 4 to Nov 22, 2026. Winners announced Dec 10, 2026.

Prize: $3,000 total across ten winners. Four overall winners and six category winners ($300 each plus DEV++ membership and badge).

Prompt: build a working experience with the SmartSpectra SDK that **responds meaningfully to real-time human signals captured through a camera** (pulse, breathing rate, HRV, expressions).

Prize categories (optional, but odds are better because pools are smaller; one submission can qualify for both categories and for overall, but can win only once):
- **Most Creative or Delightful Use**
- **Best Thoughtful Real-World Use**: clear real-world need, strong usability, consent, responsible data handling

Judging criteria: use of underlying technology; usability and UX; originality and creativity.

**Every submission must:**
1. Integrate the SmartSpectra SDK into a functional app and use **at least one live Presage signal**.
2. Include a DEV post, a **public code repository with setup instructions**, and a **demo video** (public hosting of the app is optional).
3. Explain camera consent and data handling, and disclose any storage, sharing, retention, deletion, SDK telemetry, or optional AI service use. A "Consent and Data Handling" section is in the post template; submissions without it may be considered incomplete.

**Not allowed:** diagnosis or treatment claims, medical decision-making, covert or non-consensual monitoring.

Other rules: one entry per participant, no teams, 18+, English required for prize eligibility. Judges verify SDK use from the **public repo and demo video**, so both must clearly show the integration and the live signal. If the app needs a login, provide test credentials. Open source reuse is allowed but must be credited and changes must be significant. AI use is allowed.

Post requirements: publish a DEV post using the submission template with tags `devchallenge, presagechallenge`. Template sections: What I Built; Demo; Code; How It Responds to Human Signals; Prize Categories; Consent and Data Handling; Agent Session (optional but encouraged).

Agent Session (optional): upload the agent transcript at https://dev.to/agent_sessions/new (Codex is a supported tool), curate it, **click Make Public** (uploads are unlisted by default), and **scrub keys and sensitive data first**.

Credits: the challenge runs on Presage's free trial with no extra credits. If limits are hit, ask in the Presage Discord.

Official links listed on the challenge page (I could not open most of these with my tools; try them):
- SmartSpectra docs: https://smartspectra.presagetech.com/docs
- Desktop starting point (Node.js and Electron): https://smartspectra.presagetech.com/docs/nodejs
- API key registration: https://physiology.presagetech.com/auth/register
- Telemetry and Privacy (required reading for the consent section): https://smartspectra.presagetech.com/docs/telemetry-and-privacy
- SDK repo: https://github.com/Presage-Security/SmartSpectra
- Examples repo (iOS found): https://github.com/Presage-Security/SmartSpectraExamples
- MLH resources: https://www.mlh.com/partners/presage
- Discord: https://discord.com/invite/K7KNmuX7KT

---

## 3. What exists in the repo right now

Project root: `dolowcool/` (Electron). Built and checked by me in a sandbox. **Only the lock logic test was run.** The Electron window was never launched.

```
package.json            scripts: start, start:sim, start:presage, test; devDependency electron ^33
main.js                 main process: window, IPC, owns the signal source (sim | presage via DOLOWCOOL_SOURCE)
preload.js              contextBridge API: config, start, stop, onSample, onError, simSet
sources/sim.js          simulated pulse/breath, slider-controlled (dev mode, no camera, no credits)
sources/presage.js      REAL source: STUB, throws "not wired yet" after checking API key + package
renderer/index.html     consent card, gauge, compose box, Send / Save draft / Stop camera, sim slider
renderer/renderer.js    UI wiring; feeds samples into the lock engine
renderer/lock.js        pure LockEngine (baseline, EMA smoothing, hysteresis, calm-hold). UMD, testable in Node
test/lock.test.js       one test: baseline -> small wobble stays unlocked -> spike locks -> locked until calm held -> unlocks
README.md               run instructions and structure
handoff.md              this file
```

Run:
```
npm install
npm test                 # expect: lock tests passed
npm run start:sim        # simulated signals; drag slider to lock/unlock Send
```

### Signal source contract (the key seam)
Any source must be an EventEmitter with `start()`, `stop()`, and emit about once per second:
```
em.emit('sample', { t: <ms epoch>, pulse: <bpm or null>, breath: <breaths/min or null> })
```
Errors: `em.emit('error', err)`; the UI shows "Signal problem" and disables Send.

### Lock logic defaults (renderer/lock.js, all configurable)
- baseline: 30 s, median of pulse and breath samples (needs at least 5 of each)
- score per sample = max(pulse rise / 0.15, breath rise / 0.30), rise measured relative to the user's own baseline, floor 0
- score smoothed with EMA weight 0.3
- lock when smoothed score >= 1.0; to unlock, score must be <= 0.5 and **stay there 10 s** (hysteresis prevents flicker)
- gauge shows score on a 0 to 2 scale; the lock point marker is at 50%
- Send is enabled only in state `unlocked`; disabled while `calibrating` and `locked`

### UI behavior
- Consent card first: checkbox "I understand and I'm choosing to turn the camera on" gates the Start button. Nothing runs before that.
- "Stop camera" stops the source and returns to the consent screen (re-consent required).
- Send is a **demo only** ("Sent (demo: nothing leaves this app)"). It clears the box. It does not send anywhere.
- Save draft writes to `localStorage` and clears the box.
- Sim slider is shown only when `DOLOWCOOL_SOURCE=sim`.

---

## 4. What is known about the SmartSpectra Node SDK

I could not open the official Node docs. Everything here is from third-party posts, so verify against the real docs.

- **[source: dev.to post "SmartSpectra with no camera: where the SDK actually stops", by an AI agent, 2026-11-05]**
  - Package: `@smartspectra/node-sdk@3.4.0`. The post says it is about 388 MB and contains a native `linux-x64` runtime linked against glibc 2.36; it loaded on Debian 12 with no graphics stack and no camera device.
  - Importing and constructing the SDK does not open a camera device. It loads local face models. The camera is used only when you call something that needs one. `useFile()` feeds a video file instead of a camera.
  - Auth: SDK needs an API key (env var `SMARTSPECTRA_API_KEY` in that post's script). A bad key fails with `Status code: 403` and `error: 2 SmartSpectra authentication failed...`. **Code 2 means auth, not camera or video problems.**
  - Metric sets selectable: `breathing | cardio | face | micromotion | eda | all`.
  - Validation codes seen: `kNoFaceFound`, `kTooDark`, `kFaceNotCentered`. If no packets and no errors, playback likely ended before enough frames were judged.
  - Claim: **there is no local-only mode; frames are uploaded to Presage's service**; telemetry and retention are Presage's behavior. This is one third-party claim and is **not verified**. Treat as likely, and check the official telemetry page.
  - Degradation test idea from that post (crop, dark, low-res, heavy compression, half frame rate) is a good way to find out what breaks readings.
- **[source: GitHub project "StudyBunny", a hackathon entry]** The native Node SDK was **unstable when fed 30 fps webcam frames from a React frontend** (race conditions, backend crashes). They fixed it with a dedicated Node WebSocket proxy that isolates the SDK loop, multiplexes clients, and adds synthetic telemetry jitter. Lesson: keep the SDK loop out of the UI process. This repo already does that by running the source in Electron's main process, but it may need a child process or worker if crashes appear.
- **[source: Presage iOS example repo]** On iOS the metric names are `sdk.metrics?.cardio.pulseRate`, `sdk.metrics?.breathing.rate`, `sdk.metrics?.face.expression`, and `sdk.config.requestedMetrics` limits which metric groups are requested. **The Node equivalents are unknown to me.**
- **[source: third-party GitHub project "ReelTrust", Android]** SDK is aimed at live camera health-related use, not offline video analysis.
- **[source: clinicaltrials.gov record NCT07362641]** Presage's SmartSpectra is described there as a prescription-use medical device for hospitals, not for at-home use. For this challenge, do **not** make any health claims; see section 7.

### What I did NOT find and you must find
1. The official Node live-camera example: how to open the camera, request breathing and cardio, and read pulse and breathing per packet.
2. Whether the SDK opens the camera natively or expects frames from Electron's renderer (`getUserMedia`). This changes the architecture of `sources/presage.js`.
3. Supported OS/arch for the native runtime (the one post only confirmed linux-x64). Ask the owner which OS they run.
4. Whether pulse and breathing arrive per second, per window, or in bursts, and the typical warm-up time before the first values. The baseline step must tolerate nulls and slow starts.
5. Presage's official statement on frame upload, telemetry, retention and deletion, for the consent section.

---

## 5. Prioritized next steps

Today is Nov 13; deadline Nov 22 11:59 PM PST. Suggested order:

1. **Launch check.** `npm install && npm run start:sim`. Confirm the window opens, consent gating works, baseline counts down, slider locks and unlocks Send. Fix whatever breaks (I never ran Electron).
2. **Wire the real source** in `sources/presage.js` using the official Node example. Keep the emit contract in section 3. Handle null pulse or breath. Convert SDK errors (auth code 2, no face, too dark, face not centered) into friendly UI messages via the `error` event.
3. **Hardening**: if the SDK crashes, move it to a child process (`child_process.fork`) and talk over IPC. Add a "no face / bad lighting" state in the UI instead of silently unlocking or locking. Decide behavior when the signal is lost mid-session: **recommended: lock Send and say why.** [assumed: safer default]
4. **Calibration quality**: if baseline is noisy, require stable samples, allow "Recalibrate", and show baseline values (already shown after calibration).
5. **Tune thresholds with real data**, record the numbers used in the post.
6. **Consent and Data Handling section**: write from Presage's telemetry page, see section 7.
7. **Demo video** that clearly shows the **live Presage signal** and the lock behavior, see section 8.
8. **README for judges**: setup instructions, how to get an API key, how to test without hardware if possible, and which signals are used.
9. **DEV post** using the template, tags `devchallenge, presagechallenge`, plus prize category notes.
10. Optional: upload the Codex session to DEV Agent Sessions (public, scrubbed).

Buffer: keep at least the last two days free for video, post and fixes.

---

## 6. Design decisions and open questions

Decided by the user: the idea, the name Dolowcool, using an AI agent to build.

Decided by me, not yet confirmed by the user [assumed]:
- Electron desktop app (the challenge lists a Node/Electron starting point).
- Simulated source for development; demo video must use the real source.
- Thresholds in section 3.
- Send is a demo action (no real email or chat integration). Real integrations (Gmail, Slack, a browser extension) are out of scope unless the owner asks.

Open questions for the owner: which OS they use; whether they have a Presage API key yet; whether they want a "type of message" feature or an optional AI softer-rewrite feature. If an AI rewrite is added, it must be disclosed in the consent section, and it is optional, so default is **not** to add it.

---

## 7. Consent, safety wording and data handling

**Correction to what I told the owner earlier:** I first suggested writing "all processing is local." I later found a third-party claim that frames are uploaded to Presage's service. Do **not** claim local-only processing unless Presage's official docs say so.

Language rules:
- Say **"arousal relative to your own baseline"**, "pulse and breathing rate", "settled" or "worked up".
- **Never** say the app detects anger, stress disorders, anxiety, hyperventilation, or any health condition. No diagnosis, no treatment, no medical decisions.
- No covert monitoring: the camera starts only after an explicit consent action and the user can stop at any time (already built).

Checklist for the Consent and Data Handling section of the post (fill with facts from Presage's official telemetry page):
- When the camera turns on and how the user consents and stops
- What leaves the machine (frames? metrics? telemetry?), where it goes, how long it is retained, how it is deleted
- What Dolowcool stores: currently **no video and no readings**; the only persisted item is an optional draft in `localStorage`
- API key handling (never commit it; use environment variables)
- Any optional AI service (none currently)
- A one-line "not a medical device, no diagnosis" statement

---

## 8. Demo video script (judges verify live signal use here)

1. Show the consent screen and tick the box, press Start.
2. Show the baseline countdown with live numbers visible.
3. Type an angry reply. Show the gauge climbing with real pulse and breathing numbers on screen, then Send locking.
4. Slow breathing. Show the "hold steady" countdown, then Send unlocking.
5. Click Save draft & sleep on it, or Send.
6. End with a few seconds on the repo and README setup.

Make sure the real source is used, not the simulator. If the camera readings are slow or noisy, say so honestly in the post.

---

## 9. Pitfalls and caveats

- The Electron app has not been launched; expect small bugs.
- The Send button is a demo, so describe it that way in the post rather than implying it sends real messages.
- `@smartspectra/node-sdk` is about 388 MB per one report; mention it in setup and consider not committing `node_modules`.
- Native SDK runtime support per OS is unknown; verify early because it can block the whole plan.
- Trial credits are limited; avoid long test loops against the real service. Use the simulator for UI work.
- Do not commit API keys. Check `git log` before making the repo public.
- Credit any borrowed code or ideas in the post (for example the community findings about SDK stability).
- All numbers in thresholds are starting points, not validated values.
