import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const read = path => readFileSync(resolve(here, path), 'utf8')

test('authenticated startup restores the full profile in one request on the happy path', () => {
  const auth = read('../src/context/AuthContext.jsx')
  const restore = auth.slice(auth.indexOf('async function restoreSession()'), auth.indexOf('restoreSession()\n'))
  assert.match(restore, /api\/auth\/profile/)
  assert.match(restore, /setProfileStatus\('ready'\)/)
  assert.match(restore, /refreshAuthSession\(\)/)
  assert.match(restore, /api\/auth\/me/)
  assert.match(restore, /profileResponse\?\.ok/)
})

test('landing code is split out of the authenticated startup bundle', () => {
  const app = read('../src/App.jsx')
  assert.match(app, /const Landing = lazy\(\(\) => import\('\.\/pages\/Landing'\)\)/)
  assert.match(app, /<Suspense fallback={<LoadingScreen \/>}>\s*<Landing/)
  assert.doesNotMatch(app, /import Landing from '\.\/pages\/Landing'/)
})

test('loading screen uses the correct MindCare wordmark and a lightweight animated scene', () => {
  const app = read('../src/App.jsx')
  const css = read('../src/index.css')
  assert.match(app, />MindCare<span>\.<\/span>/)
  assert.match(app, /mc-loading-glass-card/)
  assert.match(app, /mc-loading-progress/)
  assert.doesNotMatch(app, /mc-loading-orbit|mc-loading-glow/)
  assert.match(css, /backdrop-filter: blur\(22px\)/)
  assert.match(css, /mc-loading-progress-sweep/)
  assert.doesNotMatch(css, /mc-loading-orbit|mc-loading-float/)
  assert.match(css, /prefers-reduced-motion: reduce/)
})

test('landing photograph is not globally preloaded for authenticated visitors', () => {
  const html = read('../index.html')
  assert.doesNotMatch(html, /images\.pexels\.com/)
  assert.match(html, /<title>MindCare/)
})
