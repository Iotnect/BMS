import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { closeSync, openSync } from 'node:fs';
import { resolve } from 'node:path';

const database = resolve('tests/e2e.sqlite');
closeSync(openSync(database, 'w'));
const env = {
    ...process.env,
    APP_ENV: 'local',
    APP_KEY: `base64:${randomBytes(32).toString('base64')}`,
    APP_URL: 'http://127.0.0.1:8010',
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: database,
    DB_URL: '',
    BMS_DEMO: 'true',
};
execFileSync('php', ['artisan', 'migrate', '--seed', '--force', '--no-interaction'], { env, stdio: 'pipe' });
const router = resolve('vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php');
const server = spawn('php', ['-S', '127.0.0.1:8010', router], { cwd: resolve('public'), env, stdio: 'inherit', windowsHide: true });
process.on('SIGTERM', () => server.kill());
process.on('SIGINT', () => server.kill());
server.on('exit', (code) => process.exit(code ?? 0));
