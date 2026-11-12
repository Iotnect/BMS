# Meridian BMS

A Laravel 12 application with React 19, TypeScript, Inertia, Tailwind CSS 4, shadcn/ui and Recharts. Created in `C:\laragon\www\BMS`.

The workspace uses Schneider EcoStruxure Building Operation's familiar monitoring concepts: equipment, alarms, schedules and trends. It is an independent development application with explicitly labelled demonstration data.

## Open the installed application

Run in PowerShell from the project directory:

```powershell
php artisan serve --host=127.0.0.1 --port=8000 --no-reload
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000), then select **Open demo workspace**. Production assets have already been built, so Vite does not need to run to preview the application.

For development with automatic frontend updates, stop the standalone server and run:

```powershell
composer run dev
```

This starts Laravel and Vite. The development command is compatible with Windows and does not require PCNTL.

## Install on another machine

Verified with PHP 8.5, Composer 2, Node.js 24 and npm 11, with SQLite enabled in PHP.

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
New-Item database/database.sqlite -ItemType File -ErrorAction SilentlyContinue
php artisan migrate --seed
npm ci
npm run build
php artisan serve --host=127.0.0.1 --port=8000 --no-reload
```

The default database is SQLite at `database/database.sqlite`. Demo seeding is idempotent and preserves subsequent edits. The sample data contains 12 equipment records, four alarm events, three schedules and 720 hourly measurements. Refresh reloads the saved snapshot; it does not generate new telemetry.

Laragon's Apache/Nginx can also serve the application: configure the virtual host document root as `C:/laragon/www/BMS/public`, enable Laravel's rewrite rules, and update `APP_URL` in `.env` to match the host. Never use the repository root as the web document root.

## Deploy to Vercel

Import the repository with root directory `./` and the **Other** preset. Leave the install, build, and output overrides unset so `vercel.json` can build the static assets and route Laravel requests to the PHP function.

Set `APP_KEY` in Vercel using a new key from `php artisan key:generate --show` and keep it stable across deployments. Set `APP_URL` to the public HTTPS URL.

The build creates a SQLite database with the demo data. Each PHP function instance copies it into writable temporary storage. Demo edits, registrations, and sessions are specific to that instance and can reset when Vercel starts a new instance or deploys a new version.

Open `/up` to check that Laravel boots. Visit `/login` and select **Open demo workspace** to verify the seeded dashboard.

## Workspace pages

- Overview: energy consumption, environmental readings, equipment availability, alarm attention list and floor summaries.
- Energy & analytics: 24-hour, seven-day and thirty-day trends, hourly coverage and gap indicators, baseline comparison, indoor temperature and humidity.
- Equipment: searchable inventory, filters, inspection and local simulated HVAC setpoint changes.
- Alarms: priority triage and returned-event history, with independent condition and acknowledgment states, response notes and operator identity.
- Schedules: weekly program creation, editing, enabling, pausing and deletion. Same-day operating periods use Malaysia time.
- Commissioning: equipment- or alarm-linked issues, responsible parties, due dates, overdue filters, and documented verification and closeout.
- Reports: hourly CSV exports, units, timestamps, a preview and an hourly coverage check.
- Activity log: recorded operator changes with before/after details where applicable.
- Settings: account-specific display name, light/dark appearance, Celsius/Fahrenheit, compact tables and energy target.
- Integrations: disconnected BACnet/Modbus status and the information required for commissioning.

Demo access is available in the local environment and the Vercel SQLite deployment when `BMS_DEMO=true`. It creates a demo operator with a random password; no fixed password is stored in source. Standard account registration is available at `/register`. All workspace pages and changes require authentication. This first version is one shared building workspace; it does not implement tenant isolation or granular operational roles.

For an existing installation, run `php artisan migrate` and `npm run build` to enable the commissioning register and updated screens. Use sample findings in shared demo deployments.

## Verification

```powershell
php artisan test --compact
npm run build
npm audit
npx playwright install chromium
npm run test:e2e
```

Browser tests use an isolated SQLite database at `tests/e2e.sqlite` and a temporary server at port 8010. They do not change the development database. Screenshots are written to `test-results/`.

See [BMS research](docs/BMS-RESEARCH.md), [design decisions](DESIGN.md) and [verification results](docs/VERIFICATION.md).

## Field integration scope

No live Schneider, BACnet, Modbus or MQTT connector is implemented. Equipment readings, alarms and energy data are demonstration snapshots. Setpoint changes update SQLite only; schedules are stored configuration and do not execute commands. No external notification service is connected. Connecting the real building requires the client's installed product/version, approved interface, credentials and point map. Production use also requires role-based authorization, integration-specific command controls and operational deployment configuration.
