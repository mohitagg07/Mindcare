import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const read = path => readFileSync(resolve(here, path), 'utf8')
const hero = () => {
  const jsx = read('../src/pages/Landing.jsx')
  const start = jsx.indexOf('<section className="mc-hero mc-hero-editorial"')
  const end = jsx.indexOf('</section>', start) + '</section>'.length
  return jsx.slice(start, end)
}

test('hero keeps the approved original headline, natural copy, and working start action', () => {
  const jsx = read('../src/pages/Landing.jsx')
  const section = hero()
  assert.ok(section.includes('Give your thoughts a little <em>room.</em>'))
  assert.ok(section.includes('You don’t need to have it figured out before you begin.'))
  assert.ok(section.includes('onClick={onGetStarted}'))
  assert.ok(section.includes('How MindCare works'))
})

test('hero removes redundant template decoration while preserving the original photograph', () => {
  const section = hero()
  const css = read('../src/pages/Landing.css')
  assert.ok(section.includes('mc-hero-photo'))
  assert.ok(!section.includes('mc-eyebrow'))
  assert.ok(!section.includes('mc-hero-side-note'))
  assert.ok(!section.includes('mc-hero-trust-row'))
  assert.ok(!section.includes('mc-hero-bottomline'))
  assert.ok(css.includes('photos/28146959/pexels-photo-28146959.jpeg'))
})

test('hero type and layout are tuned for desktop, tablet, phone, and short viewports', () => {
  const css = read('../src/pages/Landing.css')
  assert.ok(css.includes('text-wrap: balance'))
  assert.ok(css.includes('font-kerning: normal'))
  assert.ok(css.includes('@media (max-width: 1100px) and (min-width: 761px)'))
  assert.ok(css.includes('@media (max-width: 420px)'))
  assert.ok(css.includes('@media (max-height: 720px) and (min-width: 761px)'))
  assert.ok(css.includes('@media (max-width: 760px) and (max-height: 560px)'))
})

test('hero controls keep accessible focus and reduced-motion behavior', () => {
  const css = read('../src/pages/Landing.css')
  assert.ok(css.includes(':focus-visible'))
  assert.ok(css.includes('.mc-landing .mc-hero .mc-button:hover'))
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'))
  assert.ok(css.includes('transition: none !important'))
})

test('sample conversation, remaining sections, and legal notices remain intact', () => {
  const jsx = read('../src/pages/Landing.jsx')
  assert.ok(jsx.includes('mc-demo-section'))
  assert.ok(jsx.includes('<ProductPreview />'))
  assert.ok(jsx.includes('aria-pressed={item.id === activeId}'))
  assert.ok(jsx.includes('Nothing is sent or saved.'))
  assert.ok(jsx.includes('mc-approach'))
  assert.ok(jsx.includes('mc-how-section'))
  assert.ok(jsx.includes('mc-care-section'))
  assert.ok(jsx.includes('mc-faq-section'))
  assert.ok(jsx.includes("setLegalView('privacy')"))
  assert.ok(jsx.includes("setLegalView('terms')"))
})
