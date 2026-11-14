# Launch checklist

## Real-signal verification

- [ ] Add a valid `SMARTSPECTRA_API_KEY` in the local environment.
- [ ] Confirm the live camera preview opens on the intended physical camera.
- [ ] Record time to first pulse and breathing values.
- [ ] Verify framing messages for no face, low light, excessive motion, too close, and too far.
- [ ] Confirm baseline stability with at least three sessions.
- [ ] Confirm pulse-driven and breathing-driven pauses separately.
- [ ] Interrupt the camera during the calm hold and verify the timer resets.
- [ ] Tune the 15% pulse and 30% breathing thresholds from observed demo data; document any change.

## Submission artifacts

- [ ] Replace placeholders in `DEV_SUBMISSION.md`.
- [ ] Record the real-signal video using `DEMO_SCRIPT.md`.
- [ ] Make the code repository public before submission.
- [ ] Confirm installation works from a clean clone.
- [ ] Publish the DEV post with `devchallenge` and `presagechallenge` tags.
- [ ] Recheck Consent and Data Handling against the latest Presage documentation.
- [ ] Scrub API keys, email addresses, notifications, and private drafts from every screenshot, commit, video, and agent transcript.
- [ ] Optionally publish a curated Codex agent session and add its public link.

## Final judge pass

- [ ] A judge understands the idea within the first five seconds.
- [ ] The demo visibly proves that real Presage values control the pause.
- [ ] Nothing implies diagnosis, emotion detection, or medical use.
- [ ] The app, README, video, and DEV post use identical terminology and threshold numbers.
