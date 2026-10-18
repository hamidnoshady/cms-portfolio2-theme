/**
 * Record a short mosaic-to-project reveal to recordings/project-reveal.webm.
 *
 * The recording keeps the mosaic in frame briefly, selects the long-title
 * project, lets the vertical reveal settle, then catches the marquee's first
 * gentle movement. The server is started automatically if it is not already
 * running.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173';
const captureDir = resolve(root, 'recordings', '.capture');
const rawOutput = resolve(captureDir, 'raw.webm');
const output = resolve(root, 'recordings', 'project-reveal.webm');

async function waitForServer(url, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
      if (response.ok) return true;
    } catch {
      /* server is not ready yet */
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  return false;
}

async function ensureServer() {
  if (await waitForServer(base, 1200)) return null;
  const port = new URL(base).port || '4173';
  const server = spawn('node', ['tools/serve.mjs', port], { cwd: root, stdio: 'ignore' });
  if (!(await waitForServer(base))) throw new Error(`Could not start the preview on ${base}`);
  return server;
}

const server = await ensureServer();
const browser = await launchBrowser();
mkdirSync(dirname(output), { recursive: true });

const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: resolve(root, 'recordings', '.capture'),
    size: { width: 1280, height: 800 },
  },
});
const page = await context.newPage();
page.on('pageerror', (error) => console.error(`[record] ${error.message}`));

await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForSelector('.tile');
await page.waitForTimeout(500);
await page.locator('.tile').nth(1).click();

await page.waitForFunction(
  () => {
    const root = document.querySelector('[data-project]');
    const title = document.querySelector('[data-title]');
    const stage = document.querySelector('[data-stage]');
    return (
      root &&
      !root.hidden &&
      !root.classList.contains('is-armed') &&
      title?.getAnimations().length === 0 &&
      stage?.getAnimations().length === 0
    );
  },
  null,
  { timeout: 7000 },
);

// Let the post-reveal pause and the first part of the marquee ramp read on
// camera. This is intentionally a short recording, not a full page tour.
await page.waitForTimeout(1850);
const video = page.video();
await context.close();
await video.saveAs(rawOutput);

// The first frame can be captured before headless Chromium has applied the
// requested viewport, leaving a brief undersized frame in the video. Trim that
// startup frame and re-encode to a clean, consistently sized WebM.
let ffmpeg = process.env.FFMPEG_PATH ?? 'ffmpeg';
try {
  ffmpeg = resolve(dirname(require.resolve('@ffmpeg-installer/linux-x64/package.json')), 'ffmpeg');
} catch {
  /* use the system ffmpeg when the Linux package is not installed */
}
execFileSync(
  ffmpeg,
  [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    '0.65',
    '-i',
    rawOutput,
    '-map',
    '0:v:0',
    '-an',
    '-c:v',
    'libvpx-vp9',
    '-crf',
    '33',
    '-b:v',
    '0',
    output,
  ],
  { stdio: 'inherit' },
);
rmSync(captureDir, { recursive: true, force: true });
await browser.close();
if (server) server.kill();
console.log(`recorded ${output}`);
