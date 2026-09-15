import { spawn } from 'node:child_process'

if (!process.env.RENDER_API_KEY) {
  console.error('RENDER_API_KEY is missing from .env.local')
  process.exit(1)
}

const child = spawn('npx', [
  '-y',
  'mcp-remote',
  'https://mcp.render.com/mcp',
  '--transport',
  'http-only',
  '--header',
  'Authorization:${RENDER_AUTH_HEADER}',
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    RENDER_AUTH_HEADER: `Bearer ${process.env.RENDER_API_KEY}`,
  },
})

child.on('exit', code => process.exit(code ?? 1))
child.on('error', error => {
  console.error(error.message)
  process.exit(1)
})
