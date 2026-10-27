# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org).

## [1.1.0] — 2026-10-27

First public repository release.

### Changed
- UI, seed data, templates and messages fully translated to English (prototype was Italian). Locale `en-GB`.
- Seed domain terms: statuses *Triage / To do / In progress / In review / Done*; priorities *Low / Medium / High / Critical*; roles *Admin / Project manager / Researcher / Viewer*; fields *Instrument / No. of samples / Lot / Hours per sample*; formula variable `{registrate}` → `{logged}`.
- Session export is a plain browser download (`labpm-session-YYYY-MM-DD.json`) instead of the host-specific download API.
- Standalone document: `<html lang="en">`, `<head>`/`<body>` structure, `<meta name="description">`.

### Added
- Content-Security-Policy meta (`default-src 'none'`, inline script/style, Google Fonts only; no network connections).
- Documentation (`README`, `docs/`), Playwright smoke tests, CI and GitHub Pages workflows, issue/PR templates.

### Compatibility
- Session files from the Italian prototype are not compatible with this version (enumerations changed language). Unknown statuses are coerced to *To do*, unknown roles to *Viewer* on import.

## [1.1] — prototype (Italian)

- Dashboard widgets, 5 task views, dependencies with cascade, timers, intake form, automations, templates, custom fields, portfolio/goals, documents, roles, sessions (snapshots + JSON file).
