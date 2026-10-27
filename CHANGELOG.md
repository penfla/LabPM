# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org).

## [1.3.0] — 2026-10-27

### Added
- **Attachments**: *Files* page (side menu) and *Attachments* section in each task. Files are copied to `<backup folder>/attachments/…` next to the database; links stored in the session (`files`). Open, save copy, remove link; name-collision suffix; Excel export lists attachment names.
- **Empty database**: *Download empty database file* and `empty-database/labpm-empty.json`.
- **Clear all project data** button (Admin, two-step) with automatic snapshot and folder copy beforehand.
- Empty-database safeguards (tasks require a project).

### Changed
- Session schema: optional `files` array (backward compatible).

## [1.2.0] — 2026-10-27

### Added
- **Backup folder**: choose a folder (File System Access API); LabPM saves an initial copy of the database, then rewrites `labpm-autosave.json` after every change; timestamped manual copies; pause/resume/change/disconnect; reconnect after restart.
- **Excel export** (`.xlsx`) of the task list driven by the filters: project, assignee, status, search, plus new *priority* and *due from / to* filters (and *Clear filters*). Includes an *Export info* sheet. No external library.
- Per-keystroke autosave for task notes, document title and document text.
- Tests for filtered export and folder autosave.

### Changed
- Version 1.2 in header, UI and docs.

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
