import { spawnSync } from 'node:child_process';

const env = { ...process.env };
delete env.NO_COLOR;

const command = ['playwright', 'test', '--config', 'playwright.live.config.ts', '--project', 'live-readonly'];
const result = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npx ${command.join(' ')}`], {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    })
  : spawnSync('npx', command, { cwd: process.cwd(), env, stdio: 'inherit' });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
