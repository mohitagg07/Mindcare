import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const read = path => readFileSync(resolve(here, path), 'utf8')

test('landing hero uses the editorial MindCare wording and preserves auth actions', () => {
  const jsx = read('../src/pages/Landing.jsx')
  assert.ok(jsx.includes('A softer place to <em>untangle</em> what’s on your mind.'))
  assert.ok(jsx.includes('onClick={onGetStarted}'))
  assert.ok(jsx.includes('handleSignIn?.()'))
  assert.ok(jsx.includes('mc-hero-trust-row'))
})

test('interactive sample conversation remains available below the photo hero', () => {
  const jsx = read('../src/pages/Landing.jsx')
  assert.ok(jsx.includes('mc-demo-section'))
  assert.ok(jsx.includes('<ProductPreview />'))
  assert.ok(jsx.includes('aria-pressed={item.id === activeId}'))
  assert.ok(jsx.includes('Nothing is sent or saved.'))
})

test('landing page keeps the remaining sections and legal notices intact', () => {
  const jsx = read('../src/pages/Landing.jsx')
  assert.ok(jsx.includes('mc-approach'))
  assert.ok(jsx.includes('mc-how-section'))
  assert.ok(jsx.includes('mc-care-section'))
  assert.ok(jsx.includes("setLegalView('privacy')"))
  assert.ok(jsx.includes("setLegalView('terms')"))
})

test('editorial fonts and responsive forest-photo hero are configured', () => {
  const html = read('../index.html')
  const css = read('../src/pages/Landing.css')
  assert.ok(!html.includes('fonts.googleapis.com'))
  assert.ok(!html.includes('fonts.gstatic.com'))
  assert.ok(css.includes('--serif: "Iowan Old Style"'))
  assert.ok(css.includes('--sans: -apple-system'))
  assert.ok(css.includes('mc-hero-photo'))
  assert.ok(css.includes('mc-hero-photo'))
  assert.ok(css.includes('@media(max-width:760px)'))
  assert.ok(css.includes('prefers-reduced-motion:reduce'))
})


test('hero refinement keeps the approved editorial copy and polished responsive treatment', () => {
  const jsx = read('../src/pages/Landing.jsx')
  const css = read('../src/pages/Landing.css')
  assert.ok(jsx.includes('A softer place to <em>untangle</em> what’s on your mind.'))
  assert.ok(css.includes('Hero refinement — sharper art direction'))
  assert.ok(css.includes('prefers-reduced-motion: reduce'))
  assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'))
})
