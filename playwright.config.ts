import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    timeout: 30000,
    use: { baseURL: 'http://127.0.0.1:8010', viewport: { width: 1440, height: 1100 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
    webServer: {
        command: 'node tests/browser/server.mjs',
        url: 'http://127.0.0.1:8010/login',
        reuseExistingServer: false,
        timeout: 90000,
    },
});
