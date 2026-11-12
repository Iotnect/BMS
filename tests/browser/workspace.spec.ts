import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Open demo workspace' }).click();
    await expect(page.getByRole('heading', { name: 'Building overview' })).toBeVisible();
});

test('all workspace pages render without browser errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.screenshot({ path: 'test-results/overview-desktop.png', fullPage: true });
    for (const [path, title] of [
        ['analytics', 'Energy & analytics'],
        ['equipment', 'Equipment'],
        ['alarms', 'Alarm management'],
        ['schedules', 'Operating schedules'],
        ['reports', 'Reports'],
        ['activity', 'Activity log'],
        ['preferences', 'Workspace settings'],
        ['integrations', 'Integrations'],
    ]) {
        await page.goto('/' + path);
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'HVAC 5 equipment 1 attention' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(5);
    await expect(page.locator('tbody')).toContainText('CH-01');
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Level 02 1/2' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(page.locator('tbody')).toContainText('EM-02');
});

test('equipment filtering, inspection and setpoint persistence', async ({ page }) => {
    await page.goto('/equipment');
    await page.getByLabel('Find equipment').fill('AHU-01');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'Inspect AHU-01' }).click();
    await page.getByLabel('Setpoint (°C)').fill('24.5');
    await page.getByRole('button', { name: 'Save demo setpoint' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await page.getByLabel('Find equipment').fill('AHU-01');
    await expect(page.locator('tbody')).toContainText('24.5°C');
    await page.getByRole('button', { name: 'Inspect AHU-01' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Inspect AHU-01' })).toBeFocused();
    await page.getByLabel('Find equipment').fill('no-such-device');
    await expect(page.getByText('No matching results')).toBeVisible();
    await page.route('**/equipment', (route) => route.abort());
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('The server could not be reached');
    await page.unroute('**/equipment');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
});

test('alarm acknowledgment keeps active condition and records activity', async ({ page }) => {
    await page.goto('/alarms');
    await page.getByRole('button', { name: 'Review Supply air temperature high' }).click();
    await page.getByLabel('Operator response').fill('Inspecting chilled water valve in the plant room.');
    await page.getByRole('button', { name: 'Acknowledge alarm' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('tbody tr').filter({ hasText: 'Supply air temperature high' })).toContainText('Acknowledged');
    await expect(page.locator('tbody tr').filter({ hasText: 'Supply air temperature high' })).toContainText('Active');
    await page.goto('/activity');
    await expect(page.locator('tbody')).toContainText('Alarm acknowledged');
});

test('weekly schedule create, edit and delete', async ({ page }) => {
    await page.goto('/schedules');
    await page.getByRole('button', { name: 'Add schedule' }).click();
    await page.getByLabel('Schedule name').fill('Browser test ventilation');
    await page.getByRole('button', { name: 'Save schedule' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    let row = page.locator('tbody tr').filter({ hasText: 'Browser test ventilation' });
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Schedule name').fill('Updated ventilation');
    await page.getByRole('button', { name: 'Save schedule' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    row = page.locator('tbody tr').filter({ hasText: 'Updated ventilation' });
    await row.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Delete schedule', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('tbody')).not.toContainText('Updated ventilation');
});

test('report period changes the export and CSV downloads', async ({ page }) => {
    await page.goto('/reports');
    await page.getByLabel('Reporting period').click();
    await page.getByRole('option', { name: 'Last 7 days' }).click();
    await expect(page.getByText('CSV format · 168 hourly records · demonstration data')).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download CSV' }).click()]);
    expect(download.suggestedFilename()).toBe('bms-energy-7d.csv');
});

test('theme, units and compact tables persist; responsive pages have no horizontal leak', async ({ page }) => {
    await page.goto('/preferences');
    await page.getByLabel('Appearance').click();
    await page.getByRole('option', { name: 'Dark workspace' }).click();
    await page.getByLabel('Temperature unit').click();
    await page.getByRole('option', { name: 'Fahrenheit (°F)' }).click();
    await page.getByLabel('Compact tables').click();
    await page.getByRole('button', { name: 'Save preferences' }).click();
    await expect(page.locator('html')).toHaveClass('dark');
    await page.goto('/dashboard');
    await expect(page.locator('.metrics')).toContainText('°F');
    await page.screenshot({ path: 'test-results/overview-dark.png', fullPage: true });
    for (const width of [375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const path of ['dashboard', 'equipment', 'alarms', 'schedules', 'preferences']) {
            await page.goto('/' + path);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        }
    }
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Equipment', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Equipment', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('/dashboard');
    await page.screenshot({ path: 'test-results/overview-mobile.png', fullPage: true });
});
