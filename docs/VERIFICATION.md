# Verification record

## Project engineering update · 12 November 2026

- Laravel passed 37 tests and 247 assertions. The commissioning tests cover authentication, server-side alarm/equipment linking, required closeout evidence, verifier identity, stale edits, reopening and activity logging. An empty trend archive returns an empty preview and a header-only CSV.
- Playwright passed eight Chromium tests. New flows verify priority ordering, newest-first sorting, return-to-normal details, alarm-linked commissioning, overdue status, saved closeout evidence and keyboard focus return. A missing-reading fixture shows 23 of 24 readings, a chart gap and withheld baseline and target comparisons.
- TypeScript, the Vite production build, ESLint on changed frontend files and the existing 31 light/dark contrast checks passed. Browser tests checked page overflow at 375, 768, 1024 and 1440 px. The commissioning register and mobile dialog screenshots are in `test-results/`.
- The register uses the existing workspace panels, readable status labels, labelled controls and form errors. It uses an empty state until a finding is logged and displays saved issue counts directly from the register.
- The local SQLite database was migrated. Browser verification used an isolated SQLite database and an ephemeral session key. Field hardware and live feeds were outside the verification scope.

## Initial workspace verification

7 November 2026. Tested on Windows with PHP 8.5.12 and Node.js 24.15.0.

## Automated checks

- Laravel: 35 passing tests, 196 assertions. Authentication, all workspace route protection, alarm acknowledgment and duplicate prevention, operator notes, setpoint bounds and half-degree increments, non-writable points, schedule validation and CRUD, per-user preferences, reporting periods, CSV contents and local-only demo access.
- TypeScript strict checking and Vite production build: passed.
- ESLint: application resources, browser tests and utility scripts passed.
- Composer and npm security audits: no known vulnerabilities reported by the installed dependency audit tools.
- Contrast: `npm run check:contrast` verifies 31 text, input boundary, focus, chart and sidebar palette pairs in both themes. With the supplied slate-blue palette, the lowest tested normal-text ratio is 4.55:1; the lowest tested non-text ratio is 5.83:1. This is palette verification, not a claim of full WCAG conformance.

## Browser interactions

Playwright Chromium uses an isolated database and checks these flows:

All six browser tests passed, including persistence, failure/retry, keyboard focus and responsive navigation checks.

| Interaction | Verified behavior |
| --- | --- |
| Local demo entry | Opens the authenticated overview |
| Sidebar destinations | All nine workspace pages render without JavaScript page errors |
| System and floor shortcuts | Open the equipment inventory with the corresponding filter |
| Equipment search | Filters rows and displays a meaningful empty state |
| Inspect equipment | Opens the shadcn dialog with point metadata |
| Save setpoint | Persists a simulated value after a reload |
| Escape from dialog | Closes the dialog and restores focus to its opener |
| Acknowledge alarm | Persists operator note, keeps the active condition and writes activity |
| Add/edit/delete schedule | Updates the weekly program and requires a deletion confirmation |
| Reporting period | Seven-day selection loads 168 hourly records |
| CSV download | Returns the selected period with the correct filename |
| Appearance and units | Dark theme, Fahrenheit and compact preference persist |
| Responsive layouts | No page horizontal overflow at 375, 768, 1024 and 1440px |
| Mobile Menu | Opens the shadcn Sheet, navigates and closes |
| Failed refresh | Shows an accessible connection error and supports retry |

Screenshots are available in `test-results/overview-desktop.png`, `test-results/overview-dark.png` and `test-results/overview-mobile.png` after the browser suite runs. Desktop and mobile screenshots were visually inspected. Wide tables intentionally scroll inside their own containers.

## Delivery review

The Anti Slop delivery review checked the declared design direction, functional navigation, honest demo labels, responsive layouts, light/dark consistency, focus feedback, error/empty/loading states and recorded visual decisions. No third-party image assets were created. The product name is a text wordmark and the operator avatar is an initial placeholder.

No field hardware, Schneider authentication, real telemetry, notifications, production deployment, screen-reader audit or Core Web Vitals field measurements were tested. The software does not claim production readiness for real building control.

## Palette revision

Applied the supplied #111522, #1E263B, #303D59, #536684, #98A9C4 and #DCE3EF palette to navigation, login, workspace surfaces, shadcn/ui tokens, charts, focus states and mobile navigation. White and pale slate tints support the light theme; amber and red remain semantic alarm colors. Appearance preferences and application behavior are preserved.
