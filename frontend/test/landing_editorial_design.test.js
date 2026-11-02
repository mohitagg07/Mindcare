import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const read = path => readFileSync(resolve(here, path), 'utf8')

test('landing hero keeps the approved original headline and working auth actions', () => {
  const jsx = read('../src/pages/Landing.jsx')
  assert.ok(jsx.includes('Give your thoughts a little <em>room.</em>'))
  assert.ok(jsx.includes('onClick={onGetStarted}'))
  assert.ok(jsx.includes('handleSignIn?.()'))
  assert.ok(jsx.includes('mc-hero-trust-row'))
  assert.ok(jsx.includes('mc-hero-side-note'))
})

test('hero keeps the existing forest photograph and editorial type system', () => {
  const html = read('../index.html')
  const css = read('../src/pages/Landing.css')
  assert.ok(!html.includes('fonts.googleapis.com'))
  assert.ok(!html.includes('fonts.gstatic.com'))
  assert.ok(css.includes('--serif: "Iowan Old Style"'))
  assert.ok(css.includes('--sans: -apple-system'))
  assert.ok(css.includes('photos/28146959/pexels-photo-28146959.jpeg'))
  assert.ok(css.includes('text-wrap: balance'))
  assert.ok(css.includes('font-kerning: normal'))
})

test('hero layout has deliberate compact-height and responsive breakpoints', () => {
  const css = read('../src/pages/Landing.css')
  assert.ok(css.includes('@media (max-height: 760px) and (min-width: 761px)'))
  assert.ok(css.includes('@media (max-width: 760px)'))
  assert.ok(css.includes('@media (max-width: 420px)'))
  assert.ok(css.includes('@media (max-width: 760px) and (max-height: 560px)'))
})

test('hero interactive controls have visible focus, pressed, and reduced-motion states', () => {
  const css = read('../src/pages/Landing.css')
  assert.ok(css.includes(':focus-visible'))
  assert.ok(css.includes('.mc-landing .mc-hero .mc-button:active'))
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'))
  assert.ok(css.includes('transition: none !important'))
})

test('interactive sample conversation and its no-send guarantee remain intact', () => {
  const jsx = read('../src/pages/Landing.jsx')
  assert.ok(jsx.includes('mc-demo-section'))
  assert.ok(jsx.includes('<ProductPreview />'))
  assert.ok(jsx.includes('aria-pressed={item.id === activeId}'))
  assert.ok(jsx.includes('Nothing is sent or saved.'))
})

test('remaining landing sections and legal notices remain intact', () => {
  const jsx = read('../src/pages/Landing.jsx')
  assert.ok(jsx.includes('mc-approach'))
  assert.ok(jsx.includes('mc-how-section'))
  assert.ok(jsx.includes('mc-care-section'))
  assert.ok(jsx.includes('mc-faq-section'))
  assert.ok(jsx.includes("setLegalView('privacy')"))
  assert.ok(jsx.includes("setLegalView('terms')"))
})
