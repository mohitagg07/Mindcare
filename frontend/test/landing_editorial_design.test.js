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
const heroCss = () => {
  const css = read('../src/pages/Landing.css')
  return css.slice(css.lastIndexOf('/* MindCare hero — one real photograph'))
}

test('hero keeps the approved copy, one local photo, and the real start action', () => {
  const section = hero()
  assert.ok(section.includes('Give your thoughts a little <em>room.</em>'))
  assert.ok(section.includes('You don’t need the right words. Start with what’s on your mind.'))
  assert.ok(section.includes('onClick={onGetStarted}'))
  assert.ok(section.includes('How it works'))
  assert.ok(section.includes('src="/mindcare-hero.avif"'))
  assert.equal((section.match(/<img\b/g) || []).length, 1)
  assert.ok(section.includes('fetchPriority="high"'))
  assert.ok(!section.includes('mindcare-hero-1.avif'))
  assert.ok(!section.includes('mindcare-hero-2.avif'))
  assert.ok(!section.includes('mindcare-hero-3.avif'))
})

test('desktop hero uses the supplied image once as a full-bleed photograph', () => {
  const css = heroCss()
  assert.ok(css.includes('position: absolute;'))
  assert.ok(css.includes('inset: 0;'))
  assert.ok(css.includes('object-fit: cover;'))
  assert.ok(css.includes('linear-gradient(90deg'))
  assert.ok(css.includes('height: calc(100dvh - 72px)'))
})

test('mobile uses the full 16:9 image above readable copy within the dynamic viewport', () => {
  const css = heroCss()
  assert.ok(css.includes('height: calc(100dvh - 62px)'))
  assert.ok(css.includes('grid-template-rows: minmax(0, 56.25vw) minmax(0, 1fr)'))
  assert.ok(css.includes('aspect-ratio: 16 / 9'))
  assert.ok(css.includes('color: #111A14'))
  assert.ok(css.includes('background: var(--mc-hero-ivory)'))
  assert.ok(css.includes('env(safe-area-inset-bottom)'))
  assert.ok(css.includes('@media (max-width: 390px)'))
})

test('buttons use restrained pill proportions and retain keyboard and reduced-motion support', () => {
  const css = heroCss()
  assert.ok(css.includes('border-radius: 999px'))
  assert.ok(css.includes('min-height: 51px'))
  assert.ok(css.includes(':focus-visible') || read('../src/pages/Landing.css').includes(':focus-visible'))
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'))
})

test('all remaining landing-page sections and legal interactions stay intact', () => {
  const jsx = read('../src/pages/Landing.jsx')
  assert.ok(jsx.includes('mc-demo-section'))
  assert.ok(jsx.includes('<ProductPreview />'))
  assert.ok(jsx.includes('mc-approach'))
  assert.ok(jsx.includes('mc-how-section'))
  assert.ok(jsx.includes('mc-care-section'))
  assert.ok(jsx.includes('mc-faq-section'))
  assert.ok(jsx.includes("setLegalView('privacy')"))
  assert.ok(jsx.includes("setLegalView('terms')"))
})
