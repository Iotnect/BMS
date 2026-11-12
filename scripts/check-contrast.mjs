import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../resources/css/bms.css', import.meta.url), 'utf8');
const tokens = (selector) =>
    Object.fromEntries(
        [...css.match(new RegExp(`${selector} \\{([^}]+)\\}`))[1].matchAll(/(--[\w-]+):\s*(#[a-f\d]{6})/gi)].map((match) => [match[1], match[2]]),
    );
const luminance = (hex) => {
    const rgb = hex
        .match(/[a-f\d]{2}/gi)
        .map((part) => parseInt(part, 16) / 255)
        .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const pairs = [
    ['--foreground', '--card'],
    ['--foreground', '--background'],
    ['--muted-foreground', '--card'],
    ['--muted-foreground', '--muted'],
    ['--primary-foreground', '--primary'],
    ['--secondary-foreground', '--secondary'],
    ['--positive', '--good-bg'],
    ['--danger-text', '--danger-bg'],
    ['--warning-text', '--warning-bg'],
];
const checks = [];
for (const theme of [':root', '.dark']) {
    const colors = tokens(theme.replace('.', '\\.'));
    for (const [text, background] of pairs)
        checks.push({ name: `${theme} ${text} / ${background}`, ratio: ratio(colors[text], colors[background]), minimum: 4.5 });
    for (const token of ['--input', '--ring', '--chart-actual', '--chart-baseline'])
        checks.push({ name: `${theme} ${token} / card`, ratio: ratio(colors[token], colors['--card']), minimum: 3 });
}
const navigation = tokens(':root');
for (const [name, text, background] of [
    ['Sidebar text', navigation['--nav-foreground'], navigation['--nav-background']],
    ['Sidebar labels', navigation['--nav-muted'], navigation['--nav-background']],
    ['Sidebar hover', navigation['--nav-foreground'], navigation['--nav-hover']],
    ['Sidebar selected', navigation['--nav-foreground'], navigation['--nav-selected']],
    ['Sidebar count', '#693b14', '#ffdcbb'],
])
    checks.push({ name, ratio: ratio(text, background), minimum: 4.5 });
for (const check of checks)
    console.log(`${check.ratio >= check.minimum ? 'PASS' : 'FAIL'} ${check.name}: ${check.ratio.toFixed(2)}:1 (minimum ${check.minimum}:1)`);
if (checks.some((check) => check.ratio < check.minimum)) process.exitCode = 1;
