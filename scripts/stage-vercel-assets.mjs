import { cp, mkdir } from 'node:fs/promises';

const publicDirectory = new URL('../public/', import.meta.url);
const outputDirectory = new URL('../.vercel/static/', import.meta.url);

await mkdir(outputDirectory, { recursive: true });
await cp(new URL('build/assets', publicDirectory), new URL('build/assets', outputDirectory), { recursive: true });

await Promise.all(
    ['favicon.ico', 'logo.svg', 'robots.txt'].map((file) =>
        cp(new URL(file, publicDirectory), new URL(file, outputDirectory)),
    ),
);
