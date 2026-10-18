/**
 * Browser launcher for the verification and recording scripts.
 *
 * Prefers a normal Playwright Chromium. When the browser download is not
 * reachable (CI sandboxes often block the CDN), it falls back to the
 * self-contained Chromium build from `@sparticuz/chromium` and unpacks the
 * shared libraries it needs.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = resolve(here, '..', '.cache', 'chromium');
const require = createRequire(import.meta.url);

/** Walk up from the package entry point until the directory that holds `bin/`. */
function findPackageRoot(entry) {
  let dir = dirname(entry);
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(resolve(dir, 'bin', 'al2023.tar.br'))) return dir;
    dir = dirname(dir);
  }
  return null;
}

function unpackSparticuzLibraries(packageRoot) {
  const libDir = resolve(cacheDir, 'lib');
  if (existsSync(resolve(libDir, 'libnspr4.so'))) return libDir;

  mkdirSync(cacheDir, { recursive: true });
  const archive = resolve(packageRoot, 'bin', 'al2023.tar.br');
  const tarball = resolve(cacheDir, 'al2023.tar');

  writeFileSync(tarball, zlib.brotliDecompressSync(readFileSync(archive)));
  execFileSync('tar', ['-xf', tarball, '-C', cacheDir]);
  return libDir;
}

/**
 * Playwright's video recorder looks for its own ffmpeg cache entry. The
 * npm-published Linux binary is already bundled as a dev dependency, so link
 * it into that cache rather than downloading from Playwright's blocked CDN.
 */
function installBundledFfmpeg() {
  if (process.platform !== 'linux' || process.arch !== 'x64') return;

  let binary;
  let playwrightRoot;
  try {
    binary = resolve(dirname(require.resolve('@ffmpeg-installer/linux-x64/package.json')), 'ffmpeg');
    playwrightRoot = dirname(require.resolve('playwright-core/package.json'));
  } catch {
    return;
  }
  if (!existsSync(binary)) return;

  const browsersJson = JSON.parse(readFileSync(resolve(playwrightRoot, 'browsers.json'), 'utf8'));
  const revision = browsersJson.browsers.find((browser) => browser.name === 'ffmpeg')?.revision;
  if (!revision) return;

  const configuredPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const registry = configuredPath === '0'
    ? resolve(playwrightRoot, '.local-browsers')
    : configuredPath
      ? resolve(process.env.INIT_CWD ?? process.cwd(), configuredPath)
      : resolve(homedir(), '.cache', 'ms-playwright');
  const directory = resolve(registry, `ffmpeg-${revision}`);
  const executable = resolve(directory, 'ffmpeg-linux');

  if (existsSync(executable)) return;
  mkdirSync(directory, { recursive: true });
  symlinkSync(binary, executable);
}

export async function launchBrowser(options = {}) {
  installBundledFfmpeg();
  const { chromium } = await import('playwright');

  try {
    return await chromium.launch({ headless: true, ...options });
  } catch (error) {
    console.warn(`[browser] the bundled Chromium is unavailable (${error.message.split('\n')[0]})`);
  }

  const sparticuz = (await import('@sparticuz/chromium')).default;
  const executablePath = await sparticuz.executablePath();
  const packageRoot = findPackageRoot(require.resolve('@sparticuz/chromium'));
  const libDir = unpackSparticuzLibraries(packageRoot);
  process.env.LD_LIBRARY_PATH = [libDir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');

  // The Lambda-tuned flags run the browser in a single process, which makes
  // it unstable as soon as a second context is opened.
  const args = sparticuz.args.filter(
    (arg) => arg !== '--single-process' && arg !== '--no-zygote' && arg !== '--in-process-gpu',
  );

  return chromium.launch({
    executablePath,
    args,
    headless: true,
    ...options,
  });
}
