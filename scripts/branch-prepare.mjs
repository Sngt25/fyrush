// Gate cf-branch-wrangler to Cloudflare Worker builds only.
// Never mutates the local wrangler.jsonc during ordinary dev builds.
const branch =
  process.env.WORKERS_CI_BRANCH ||
  process.env.CF_PAGES_BRANCH ||
  process.env.CF_BRANCH
const productionBranch = process.env.CF_PRODUCTION_BRANCH || 'master'

if (!branch || branch === productionBranch) {
  console.log('branch-prepare: skipping branch provisioning (localhost or production branch)')
  process.exit(0)
}

const { spawnSync } = await import('node:child_process')

// CF_PRODUCTION_BRANCH defaults to "main" upstream; this repo's prod branch is "master".
const run = (cmd, args, env = {}) => {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } })
  if (res.error || res.status !== 0) {
    console.error(`branch-prepare: "${cmd} ${args.join(' ')}" failed`, res.error ?? `exit ${res.status}`)
    process.exit(res.status ?? 1)
  }
}

console.log(`branch-prepare: provisioning isolated resources for branch "${branch}"`)
run('npx', ['cf-branch-wrangler'], {
  CF_PRODUCTION_BRANCH: productionBranch,
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || ''
})

// Branch D1 is brand new; apply NuxtHub SQL migrations against it via wrangler.
run('npx', ['wrangler', 'd1', 'migrations', 'apply', 'DB', '--remote'], {})