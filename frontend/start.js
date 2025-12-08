import { spawn } from 'child_process';

const port = process.env.PORT || '3000';
const host = '0.0.0.0';

console.log(`Starting preview server on ${host}:${port}...`);

const viteProcess = spawn('npx', ['vite', 'preview', '--host', host, '--port', port], {
  stdio: 'inherit',
  shell: true,
});

viteProcess.on('error', error => {
  console.error('Error starting preview server:', error);
  process.exit(1);
});

viteProcess.on('exit', code => {
  process.exit(code || 0);
});
