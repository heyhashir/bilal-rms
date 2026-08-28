import { spawnSync } from 'node:child_process';

const project = process.argv[2];
const extraPlaywrightArgs = process.argv.slice(3);
if (!project) {
  throw new Error('Usage: node scripts/run-qa-e2e.mjs <qa-smoke|qa-regression|qa-live>');
}

const prefix = `qa-${project.replace(/^qa-/, '')}-${Date.now().toString(36)}`;
const baseUrl = process.env.QA_BASE_URL?.trim() || 'http://127.0.0.1:5000';
const hostname = new URL(baseUrl).hostname;
const isLocalTarget = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';
if (!isLocalTarget && process.env.QA_ALLOW_REMOTE_WRITE !== '1') {
  throw new Error('Write-enabled QA is restricted to localhost. Use the read-only live smoke for remote environments.');
}
if (!isLocalTarget && !process.env.QA_DATABASE_URL?.trim()) {
  throw new Error('Remote write-enabled QA requires QA_DATABASE_URL so cleanup targets the same database.');
}

const env = {
  ...process.env,
  QA_RUN_PREFIX: prefix,
  QA_BASE_URL: baseUrl,
  ...(process.env.QA_DATABASE_URL?.trim() ? { DATABASE_URL: process.env.QA_DATABASE_URL.trim() } : {}),
};
delete env.NO_COLOR;

const quote = (value) => (/^[A-Za-z0-9_./:=+-]+$/.test(value) ? value : `"${value.replaceAll('"', '\\"')}"`);

const run = (args) => {
  if (process.platform === 'win32') {
    return spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npx ${args.map(quote).join(' ')}`], {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    });
  }

  return spawnSync('npx', args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });
};

let testStatus = 1;
try {
  const result = run(['playwright', 'test', '--config', 'playwright.qa.config.ts', `--project=${project}`, ...extraPlaywrightArgs]);
  if (result.error) {
    throw result.error;
  }
  testStatus = result.status ?? 1;
} finally {
  const cleanup = run(['tsx', 'backend/src/tests/cleanup-qa.ts', prefix]);
  if (cleanup.error) {
    console.error(cleanup.error);
    testStatus = 1;
  } else if (cleanup.status !== 0) {
    testStatus = cleanup.status ?? 1;
  }
}

process.exit(testStatus);
