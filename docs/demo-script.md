# Dolowcool demo script

Target: **105 seconds**. Record with `npm start`, which now launches the live SmartSpectra experience by default. Keep the **Live SmartSpectra** source label, reliability status, and changing pulse and breathing numbers visible.

## Shot list

| Time | Picture | Voiceover / action |
| --- | --- | --- |
| 0:00–0:05 | Start on the paused message action, live numbers visible. | “What if the send button could notice a rise relative to me—and ask for one more moment?” |
| 0:05–0:17 | Cut to the consent screen. Show **Live SmartSpectra · ready**, the unchecked box, on-device processing/authentication wording, reliability rule, and telemetry-off statement. Select consent and press **Start live camera session**. | “Dolowcool starts only after explicit consent. SmartSpectra computes metrics on-device; both live signals must become reliable, and optional telemetry is off.” |
| 0:17–0:36 | Show the real camera preview with face and upper chest framed. Use a clearly visible jump cut through SDK warm-up, then keep **Live SmartSpectra**, pulse, breathing rate, confidence, and **Both signals reliable** visible while the baseline completes. | “There is no universal calm number here. Dolowcool first requires reliable live pulse and breathing, then learns my own stable session baseline.” |
| 0:36–0:52 | Type a short annoyed message that contains no real names or addresses. Let a natural rise from brief, safe movement before sitting down appear in the readings. | “I can write immediately. As the relative score crosses the visible 1.0 threshold, email and copy pause.” |
| 0:52–1:05 | Hold on the paused state and **Why is this paused?** panel. Show baseline, current values, driving signal, threshold, and unavailable actions. | “This is not emotion detection. The panel shows exactly which reading changed relative to my baseline and why the action is paused.” |
| 1:05–1:22 | Sit comfortably, stay still, and breathe slowly and comfortably. Keep the lower 0.5 threshold, signal-integrity rule, and eight-second continuous countdown visible. | “The action does not return on one low sample. The score must stay below the lower threshold continuously. A gap, missing metric, or low-confidence reading resets the timer—it never fails open.” |
| 1:22–1:32 | Show **Settled. Your choice is open**, then the enabled email and copy actions. Do not use the override in the main take. | “After the continuous hold, the choice returns. Nothing sends automatically; I still review in my email app.” |
| 1:32–1:40 | Press **Stop camera & end session**. Show the memory-only recap timeline and “You waited … seconds.” | “The recap shows the relative-score timeline and pause markers. It is not saved and disappears when I leave this screen.” |
| 1:40–1:45 | Show the public repository README, hero GIF, SmartSpectra source file, tests, and consent document. | “The public repo shows the real SDK integration, tests, setup, and exact data-handling notes.” |

## Recording checklist

- [ ] Use the real SmartSpectra source; **Live SmartSpectra** is visible.
- [ ] Show changing live pulse and breathing numbers on screen.
- [ ] Breathe normally; do not force rapid breathing for the recording. Cut honestly through acquisition time if needed.
- [ ] Keep the API key, `.env`, terminal environment, notifications, personal email, and private drafts off screen.
- [ ] Use a fictional recipient and message with no personal data.
- [ ] Frame the face and upper chest; use soft front light and avoid strong backlighting.
- [ ] Sit far enough from the camera for the framing guide and breathing measurement.
- [ ] Close other camera apps and unnecessary background apps.
- [ ] Hide desktop notifications and close password managers, chat apps, and private browser tabs.
- [ ] Record at 1080p or higher, 30 fps, with the app text readable and system audio disabled unless needed.
- [ ] Capture clean voiceover with a quiet room or separate microphone.
- [ ] Show consent, baseline, annoyed draft, pause, explanation, slow comfortable breathing, countdown, settled unlock, recap, and the repo.
- [ ] Do not demonstrate the override in the main take; the README and UI disclose it.
- [ ] Keep the final five seconds on the public repo and SmartSpectra integration evidence.
- [ ] Review the exported video frame by frame for secrets, faces in reflections, notifications, physiological values outside the intended app UI, and personal data.
