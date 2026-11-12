# Meridian BMS workspace

Schneider reference: EcoStruxure Building Operation WebStation's location hierarchy, alarm views, dashboards, schedules and trend charts. This application is independent and does not use Schneider logos or claim affiliation.

- Energy 1, rhythm 2, motion 1: an operator workspace for repeated daily use. Interaction feedback only.
- The supplied palette is #111522, #1E263B, #303D59, #536684, #98A9C4 and #DCE3EF. Midnight navy anchors navigation; slate surfaces distinguish selected items and equipment panels; mist blue highlights readings, links and keyboard focus. Amber and red remain reserved for alarm conditions, always paired with labels.
- Light mode uses #DCE3EF for the workspace with white panels and pale slate tints for secondary surfaces. Dark mode uses #111522 behind #1E263B panels with #303D59 elevated surfaces and #DCE3EF text. Existing per-user appearance preferences are preserved.
- Segoe UI uses the native Windows typeface familiar to Laragon's operators, with tabular numerals for sensor readings. No remote font dependency.
- A 248px desktop sidebar separates monitoring, operations and administration. Mobile uses a labelled Menu button and a shadcn Sheet.
- Four compact summary readings precede the main energy chart; equipment status and alarms stay beside or immediately below it. Tables support comparison; cards isolate genuinely different instruments.
- shadcn/ui supplies Button, Input, Label, Dialog, Sheet, Select, Tabs, Switch, Checkbox and Textarea. Recharts supplies accessible responsive trend plots. Lucide icons identify equipment categories and navigation actions already represented by text.
- Compact radii, subtle panel borders and a single dialog shadow establish hierarchy without decorative effects. No image assets are needed for equipment telemetry.
- All telemetry is seeded demonstration data. An acknowledgment records an operator response and never clears the physical alarm condition. Setpoints only change the local database.

## Verification

Check build, TypeScript, backend behavior, browser interactions, narrow layouts, both themes, keyboard dialog focus and text/background contrast before delivery. Record actual outcomes in docs/VERIFICATION.md.
