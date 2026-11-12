import { execFileSync, spawn } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import { resolve } from 'node:path';

const database = resolve('tests/e2e.sqlite');
closeSync(openSync(database, 'w'));
const env = { ...process.env, APP_ENV: 'local', APP_URL: 'http://127.0.0.1:8010', DB_CONNECTION: 'sqlite', DB_DATABASE: database, BMS_DEMO: 'true' };
execFileSync('php', ['artisan', 'migrate', '--seed', '--force', '--no-interaction'], { env, stdio: 'pipe' });
const server = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8010', '--no-reload'], { env, stdio: 'inherit', windowsHide: true });
process.on('SIGTERM', () => server.kill());
process.on('SIGINT', () => server.kill());
server.on('exit', (code) => process.exit(code ?? 0));
