# Security policy

## Supported version

Dolowcool is a hackathon-stage desktop prototype. Security fixes are applied to the current `main` branch; there is no supported packaged release yet.

## Reporting a vulnerability

Use GitHub's private **Report a vulnerability** / Security Advisory flow for this repository when available. Do not open a public issue containing an API key, camera frame, physiological reading, private message, or identifying diagnostic output.

Include the affected commit, operating system, minimal reproduction steps, expected behavior, and redacted logs. Never attach `.env` or unredacted SmartSpectra credentials.

## Security boundaries

- The SmartSpectra API key belongs only in the main process environment or ignored `.env` file.
- The renderer receives a narrow preload API, not Node.js access or the key.
- Dolowcool stores no frames or physiological readings on disk.
- Optional local drafts are device-local and explicitly deletable.
- SmartSpectra telemetry is disabled by default; authentication and subscription validation still contact Presage.
- Dolowcool opens an email draft only after explicit user action and does not send mail itself.
