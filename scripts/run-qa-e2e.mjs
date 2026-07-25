import { spawnSync } from 'node:child_process';

const project = process.argv[2];
if (!project) {
  throw new Error('Usage: node scripts/run-qa-e2e.mjs <qa-smoke|qa-regression|qa-live>');
}

const prefix = `qa-${project.replace(/^qa-/, '')}-${Date.now().toString(36)}`;
const env = { ...process.env, QA_RUN_PREFIX: prefix };

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
  const result = run(['playwright', 'test', '--config', 'playwright.qa.config.ts', '--project', project]);
  if (result.error) {
    throw result.error;
  }
  testStatus = result.status ?? 1;
} finally {
  const cleanup = run(['ts-node', 'backend/src/tests/cleanup-qa.ts', prefix]);
  if (cleanup.error) {
    console.error(cleanup.error);
    testStatus = 1;
  } else if (cleanup.status !== 0) {
    testStatus = cleanup.status ?? 1;
  }
}

process.exit(testStatus);
