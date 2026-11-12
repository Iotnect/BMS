# BMS research and implementation scope

Reviewed 7 November 2026.

A building management system supervises building services from one workspace. Typical objectives include occupant comfort, energy management and faster fault diagnosis. Sensors measure conditions; controllers run local logic and operate actuators; automation servers collect points, trends and alarms; the supervisory interface lets operators inspect equipment and adjust approved settings. The controller remains responsible for local control even when a web dashboard is unavailable.

Schneider's architecture includes automation servers, room and plant controllers, sensors and operator interfaces. Its platform supports BACnet, Modbus and other protocols, with MQTT and web service integration options. The correct adapter depends on the client's installed products, enabled interfaces and point mapping.

Source: [Schneider Electric: Building Management System](https://www.se.com/uk/en/work/products/product-launch/building-management-system/).

WebStation organizes daily work around graphics, dashboards, alarms, schedules and trends. Location and equipment context help operators locate a fault. Alarm views support filtering and acknowledgment; operator actions can be recorded. These workflows inform this application's sidebar and pages, rather than reproducing Schneider branding.

Source: [Schneider Electric: WebStation](https://ecostruxure-building-help.se.com/bms/topics/show?id=8792&locale=en-US&prerelease=false&productversion=7.0).

## Implemented development scope

- Overview: equipment availability, environmental readings, energy trend, floor selector and alarm attention list.
- Analytics: 24-hour, seven-day and thirty-day consumption, baseline comparison, temperature and humidity trends.
- Equipment: searchable inventory, system/floor/status filters, detail dialog and simulated HVAC setpoint adjustment.
- Alarms: severity and lifecycle filters, operator note, acknowledgment timestamp and identity. Acknowledgment and return-to-normal are independent.
- Schedules: validated weekly program creation, editing and deletion. Saved programs are configuration only; there is no controller scheduler.
- Reports: CSV export with timestamp, units and demonstration labels.
- Activity: server-recorded changes. It is an application log, not a tamper-proof compliance archive.
- Settings: per-user building display name, theme, temperature units, energy target and table density.
- Integrations: explicitly disconnected protocol inventory and commissioning checklist.

## Before connecting the client's building

Confirm the EcoStruxure product/version and architecture; export the equipment hierarchy and point list; identify the supported API or gateway, network path and credentials; map units, engineering ranges, quality and timestamps; agree polling intervals, retention, roles and alarm routing. Start with a read-only connector and verify values against WebStation. Field writes need object-level authorization, bounds, command priority and relinquish behavior, confirmation from the controller and rollback handling. Life-safety systems should retain their certified control paths.

This repository has no field connector, live polling, external notifications or real control execution. Thirty days of seeded hourly measurements exist for UI development. These data are snapshots and do not claim to represent a real site.
