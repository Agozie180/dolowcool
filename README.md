# Dolowcool

A message composer whose **Send** button stays locked while your pulse or breathing is well above *your own* calm baseline, and unlocks once you've settled and stayed settled. Built for the Presage SmartSpectra SDK Challenge.

## Run it (simulated signals, no camera, no credits)
    npm install
    npm run start:sim
    npm test            # lock logic + SmartSpectra adapter tests
    npm run test:smoke  # launches Electron and checks the main UI flow

Drag the "Simulated signals" slider up to lock Send, then back down and hold steady to unlock.

## Run it with the real SDK
The SDK supports Windows x64, macOS Apple Silicon, and Linux x64/ARM64. Use Node.js 20 or newer.

PowerShell:

    $env:SMARTSPECTRA_API_KEY='your_key'
    npm run start:presage

macOS/Linux:

    SMARTSPECTRA_API_KEY=your_key npm run start:presage

The real source opens the default camera through SmartSpectra, requests breathing and cardio metrics, and forwards only the latest pulse and breathing-rate values to the lock engine. Keep API keys in environment variables and never commit them.

## Structure
- `renderer/lock.js`: pure baseline + lock/unlock logic (smoothing, hysteresis, calm-hold timer)
- `sources/`: signal sources (`sim`, `presage`) behind one tiny interface
- `main.js`: main process owns the signal source and forwards samples to the UI over IPC

## Consent and data
Camera capture starts only after an explicit checkbox and Start click, and Stop camera releases it. Dolowcool makes no diagnosis or treatment claim; it only compares readings with the user's own baseline.

- Dolowcool stores no video or physiological readings. An optional message draft is stored locally in `localStorage`.
- The Presage API key is read from `SMARTSPECTRA_API_KEY` in the main process and is not exposed to the renderer.
- SmartSpectra telemetry is disabled by default (`enableTelemetry: false`). Set `DOLOWCOOL_TELEMETRY=1` only to opt in.
- Presage documents that telemetry, when enabled, contains session/device/performance/quality summaries but no raw frames or measured physiological values. Authenticated requests can be associated with an account, and diagnostic reports currently have no automatic expiration.

See Presage's [SDK Telemetry & Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy) documentation and [Privacy Policy](https://api.physiology.presagetech.com/privacypolicy).

## License

Dolowcool is available under the [MIT License](LICENSE).
