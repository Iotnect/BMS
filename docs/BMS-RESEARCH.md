# BMS research and implementation scope

Reviewed 7 November 2026. Project engineering assessment updated 12 November 2026.

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

## Project engineering assessment

| Workspace area | What works | Gap for project or operations use |
| --- | --- | --- |
| Overview | System and floor shortcuts provide quick equipment context. | Live status needs validated point quality and source freshness. The dashboard now shows hourly trend coverage and links directly to alarms awaiting acknowledgment. |
| Equipment | Tags, locations, protocol, units and last sample are available. | Add mapped controller and point identifiers, quality flags and point-level trends when the site point list is available. Verify overrides and relinquishment in the controller before enabling field writes. |
| Alarms | Response notes and the separate condition and acknowledgment states are sound. | The queue now prioritizes active conditions, severity, acknowledgment and age. Returned events have their own view and timestamp. Alarm routing, delays, nuisance suppression and escalation depend on site alarm policy and validated sequences. |
| Energy and analytics | Time windows, indoor conditions and baseline comparisons support investigation. | Charts now show gaps and period comparisons require complete hourly coverage. Actual savings claims need an agreed measurement boundary, baseline and adjustment method. |
| Schedules | Weekly local programs are editable and audited. | Site use needs calendar exceptions, overnight operation, and verification of the actual controller schedule and operating state. |
| Commissioning | The new register tracks findings from inspections, tests and alarms, with ownership, due dates and verified closeout. | A formal handover still needs the approved test scripts, signed results, retained evidence and owner acceptance. |
| Reports | Raw CSV contains units, MYT timestamps and sample labels. | The report preview now quantifies hourly coverage. Handover reports would also benefit from project references and issue export. |
| Activity | Operator changes and before/after details are available. | Commissioning changes now join that log. Define retention and access to durable audit history for a production deployment. |
| Settings and integrations | Personal display settings and clear disconnected status suit a demo. | Adopt site-approved roles, gateway connectivity, point mapping, and reconciliation with the vendor interface before field monitoring. |

### Basis for the implemented changes

- **Commissioning register.** WBDG identifies issue description, date, responsible party, issuing agent and status as typical log fields. GSA also calls for recording actions and final resolution. The local register captures the reporter automatically, supports overdue filtering in Malaysia time, and requires correction and retest evidence before resolution. Changes to an issue do not change the source alarm. [WBDG commissioning documents](https://legacy.wbdg.org/building-commissioning/commissioning-documents), [GSA Commissioning Guide](https://www.wbdg.org/FFC/GSA/gsa_commissioning_guide_2020.pdf), [ASHRAE commissioning standards and guidelines](https://www.ashrae.org/technical-resources/bookstore/commissioning)
- **Alarm triage.** Schneider WebStation supports sorting by priority and exposing acknowledgment details. Iotnect BMS uses active-first ordering followed by Critical, Warning and Info, then unacknowledged first and oldest first within a priority. This ordering is a workspace decision. The operator can switch to newest first. [Schneider WebStation alarm sorting](https://ecostruxure-building-help.se.com/bms/topics/show?id=12394&locale=en-US&productversion=7.0), [ASHRAE Guideline 36 committee scope](https://tpc.ashrae.org/?cmtKey=d536fedd-5057-4fc6-be3a-808233902f4c)
- **Trend coverage.** ASHRAE identifies trend review as a way to find scheduling, equipment and sensor faults. The demo archive expects one reading on the hour. Iotnect BMS counts expected, missing and off-cadence records in the selected window ending at the latest archived hour. Missing readings break hourly plots and omit affected daily aggregates. Period baseline and target comparisons require complete coverage, while CSV preserves the original readings. The archive-relative check does not measure live gateway freshness. Production savings verification requires a separate M&V plan. [ASHRAE Handbook, Fundamentals of Control](https://handbook.ashrae.org/Handbooks/F25/IP/f25_Ch07/f25_Ch07_ip.aspx), [U.S. DOE FEMP M&V guidelines](https://www.energy.gov/cmei/femp/articles/mv-guidelines-measurement-and-verification-performance-based-contracts-version-0)

The next field milestone is a read-only pilot against the approved site gateway. Confirm the equipment and point map, sample timing and quality, meter boundaries, and alarm mapping against the vendor workstation. Confirm operator and reviewer roles and the OT network boundary with site IT before adding writes or escalation. [Schneider WebStation capabilities](https://ecostruxure-building-help.se.com/bms/topics/show?id=8792&locale=en-US&prerelease=false&productversion=7.0), [NIST SP 800-82 Rev. 3](https://csrc.nist.gov/pubs/sp/800/82/r3/final)
