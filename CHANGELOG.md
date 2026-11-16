# Changelog

All notable Dolowcool changes are recorded here. The project uses semantic versioning for repository milestones; it has not published a packaged desktop release.

## [0.2.0] — 2026-11-16

### Added

- Native SmartSpectra camera capture with live pulse and breathing.
- Reliability thresholds, validation coaching, personal baseline, hysteresis, and continuous recovery hold.
- Consent-first composer, explanation panel, deliberate override, memory-only recap, email handoff, and deterministic simulator.
- Unit, coverage, Electron smoke, Presage configuration, email handoff, live transport, and strict live acceptance tests.
- Judge-facing README, consent analysis, live report, self-audit, demo script, DEV draft, and CI.
- Node 22.12+ runtime constraint matching the pinned Electron toolchain.

### Fixed

- Removed renderer-to-main raw-frame transport from the SDK hot path.
- Merged separately arriving pulse and breathing packets with bounded freshness.
- Prevented gaps, absent metrics, and low-confidence readings from unlocking actions.
- Forced processed preview alpha opaque and reduced the dark framing overlay.
- Guarded shutdown against late SDK callbacks.

### Known limitations

- Live acquisition remains sensitive to camera, lighting, framing, stillness, and SDK confidence windows.
- Interaction thresholds are not clinically validated.
- The app opens a `mailto:` draft and is not a packaged consumer release.
