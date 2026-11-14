# Dolowcool submission checklist

## Public repository

- [ ] Repository is public: https://github.com/Agozie180/dolowcool
- [ ] README opens with the one-line explanation, simulator GIF, and three-command quickstart.
- [ ] README includes live SmartSpectra setup, supported platforms, architecture, verification commands, limitations, consent, and data handling.
- [ ] Repository visibly contains the real `@smartspectra/node-sdk` integration and requests pulse plus breathing rate.
- [ ] No `.env`, API key, camera frame, personal data, or physiological value is committed.
- [ ] Clean-clone setup has been tested on a supported platform.
- [ ] `npm test`, `npm run test:smoke`, `npm run test:presage-smoke`, and `npm audit` pass.
- [ ] One bounded `npm run test:live` run passes with the owner's API key and real camera.

## Demo video

- [ ] Public video URL is available.
- [ ] Video is 90–120 seconds and hooks the idea in the first five seconds.
- [ ] Video uses **Live SmartSpectra**, not the simulator.
- [ ] Live pulse and breathing numbers are readable and visibly change.
- [ ] Video shows consent, personal baseline, annoyed draft, pause, explanation, continuous settled hold, unlock, recap, and the repository.
- [ ] No API key, `.env`, notification, private email, personal data, or unintended app is visible.
- [ ] Final five seconds show the public repository and SDK integration evidence.

## DEV post

- [ ] Post uses the challenge template sections: **What I Built**, **Demo**, **Code**, **How It Responds to Human Signals**, **Prize Categories**, **Consent and Data Handling**, **Agent Session**.
- [ ] Demo placeholder is replaced with the public video URL.
- [ ] Code section links to the public repository.
- [ ] Prize Categories targets **Most Creative or Delightful Use** and **Best Thoughtful Real-World Use**, with a specific reason for each.
- [ ] Consent and Data Handling matches `docs/consent-and-data.md` and links official Presage sources.
- [ ] Engineering story includes the renderer-to-main frame-copy bottleneck and move to native main-process capture.
- [ ] Lost-sample rule states that a signal gap can never silently unlock.
- [ ] Limitations and unvalidated interaction thresholds are disclosed.
- [ ] Tags are exactly `devchallenge, presagechallenge`.
- [ ] Post is published before 2026-11-22 11:59 PM PST; target publication date is 2026-11-21.

## Optional agent session

- [ ] Agent transcript is curated and scrubbed of keys, personal data, frames, and physiological values.
- [ ] Agent session is uploaded at https://dev.to/agent_sessions/new.
- [ ] **Make Public** is clicked; uploads are unlisted by default.
- [ ] Public agent-session URL replaces the placeholder in the DEV post.

## Owner approval

- [ ] Owner supplies and locally stores the SmartSpectra API key.
- [ ] Owner approves the final consent wording and asks Presage the open retention/privacy-policy questions if possible.
- [ ] Owner records and uploads the real-camera demo video.
- [ ] Owner reviews and publishes the DEV post.
- [ ] Owner decides whether to publish the optional agent session.
- [ ] Owner decides whether to rewrite existing Git history to replace the non-noreply author email before wider publication.
