// Explicit maintainer command: update only this repository's public About fields.
// Credentials stay in memory, come from the configured Git helper and are never logged.
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { strict: assert } = require('node:assert');
const repo = 'CosmoNetinfo/cosmonet-browser';

async function main() {
  const metadata = JSON.parse(readFileSync(require('node:path').join(__dirname, 'github-metadata.json'), 'utf8'));
  assert.ok(metadata.description.length <= 350);
  const remote = spawnSync('git', ['remote', 'get-url', 'origin'], {encoding:'utf8'});
  assert.match(remote.stdout.trim(), /^https:\/\/github\.com\/CosmoNetinfo\/cosmonet-browser(?:\.git)?$/i);
  const credentials = spawnSync('git', ['credential', 'fill'], {
    input:`protocol=https\nhost=github.com\npath=${repo}.git\n\n`,
    encoding:'utf8', env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}
  });
  if (credentials.status !== 0) throw Error('No stored GitHub credentials available.');
  const password = credentials.stdout.split(/\r?\n/).find(line => line.startsWith('password='))?.slice(9);
  if (!password) throw Error('Git credential helper returned no token.');
  async function api(method, suffix, data) {
    const response = await fetch(`https://api.github.com/repos/${repo}${suffix}`, {
      method, headers:{Authorization:`Bearer ${password}`,Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
      ...(data ? {body:JSON.stringify(data)} : {}), signal:AbortSignal.timeout(30000)
    });
    if (!response.ok) throw Error(`GitHub API ${method} failed with HTTP ${response.status}.`);
    return response.json();
  }
  await api('PATCH', '', {description:metadata.description,homepage:metadata.homepage});
  await api('PUT', '/topics', {names:metadata.topics});
  const verified = await api('GET', '');
  assert.equal(verified.description, metadata.description);
  assert.equal(verified.homepage, metadata.homepage);
  assert.deepEqual([...verified.topics].sort(), [...metadata.topics].sort());
  console.log(`Verified repository description, homepage and ${metadata.topics.length} topics: ${verified.html_url}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
