const { spawnSync } = require('node:child_process');
const executable = process.platform === 'win32' ? 'py' : 'python3';
const result = spawnSync(executable, process.argv.slice(2), { stdio: 'inherit', shell: false });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
