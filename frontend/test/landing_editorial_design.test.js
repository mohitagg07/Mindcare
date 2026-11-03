import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const read = path => readFileSync(resolve(here, path), 'utf8')
const hero = () => {
  const jsx = read('../src/pages/Landing.jsx')
  const start = jsx.indexOf('<section className="mc-hero mc-hero-reference"')
  const end = jsx.indexOf('</section>', start) + '</section>'.length
  return jsx.slice(start, end)
}
const heroCss = () => read('../src/pages/LandingHero.css')

test('hero uses the approved headline and simple, natural wording', () => {
  const section = hero()
  for (const value of [
    'A calmer space for your mind',
    'Give your thoughts',
    'a little <em>room.</em>',
    'Talk it out, reflect and check on your mood at your own pace.',
    'Start a conversation',
    'href="#approach">Explore MindCare</a>',
    'onClick={onGetStarted}',
    'A safe space',
    'to talk',
    'Gentle',
    'check ins',
    'Your choices',
    'stay private',
  ]) assert.ok(section.includes(value), `missing hero copy: ${value}`)
  assert.ok(!section.includes('—'), 'hero copy should not use dash punctuation')
  assert.ok(!section.includes('check-ins'), 'avoid hyphenated trust copy')
})

test('hero uses the face-free Pexels reading nook photo with responsive image sources', () => {
  const section = hero()
  assert.ok(section.includes('images.pexels.com/photos/39972487/pexels-photo-39972487.jpeg'))
  assert.ok(!section.includes('19291526'))
  assert.ok(!section.includes('/mindcare-hero.avif'))
  assert.ok(section.includes('srcSet='))
  assert.ok(section.includes('width="6000"'))
  assert.ok(section.includes('height="4000"'))
  assert.equal((section.match(/<img\b/g) || []).length, 1)
})

test('desktop hero is full bleed with a dark left text field and natural photography', () => {
  const css = heroCss()
  for (const value of [
    'min-height: 100svh',
    'position: absolute',
    'inset: 0',
    'object-fit: cover',
    'object-position: 58% 52%',
    'linear-gradient(90deg',
    'rgba(6, 22, 14, .94)',
    'font-size: clamp(60px, 6vw, 91px)',
    'border-radius: 999px',
    'background: linear-gradient(135deg, #22a85f 0%, #07834e 100%)',
  ]) assert.ok(css.includes(value), `missing hero style: ${value}`)
  assert.ok(!css.includes('scaleX(-1)'), 'the landscape photo should not be flipped')
})

test('navigation keeps its transparent desktop header and functional mobile menu', () => {
  const jsx = read('../src/pages/Landing.jsx')
  const css = heroCss()
  assert.ok(jsx.includes('aria-label="Main navigation"'))
  assert.ok(jsx.includes('setMobileNavOpen'))
  for (const value of [
    'position: absolute',
    'color: rgba(255, 253, 246, .96)',
    '@media (max-width: 940px)',
    '.mc-site-nav.is-open',
    '.mc-mobile-menu-toggle',
    'border-radius: 999px',
  ]) assert.ok(css.includes(value), `missing navigation style: ${value}`)
})

test('trust row is legible on desktop and compact mobile', () => {
  const css = heroCss()
  for (const value of [
    '.mc-hero-trust-row',
    'grid-template-columns: repeat(3, minmax(0, 1fr))',
    '@media (max-width: 600px)',
    'font-size: 10px',
    'safe-area-inset-bottom',
  ]) assert.ok(css.includes(value), `missing trust row style: ${value}`)
})

test('old ivory panel remains transparent and the photo covers the entire hero', () => {
  const css = heroCss()
  const inner = css.match(/\.mc-landing \.mc-hero\.mc-hero-reference \.mc-hero-inner \{[\s\S]*?\n\}/)?.[0] || ''
  assert.ok(inner.includes('background: transparent'))
  assert.ok(inner.includes('box-shadow: none'))
  assert.ok(css.includes('object-fit: cover'))
  assert.ok(css.includes('inset: 0'))
})

test('all other landing sections and legal flows remain unchanged and present', () => {
  const jsx = read('../src/pages/Landing.jsx')
  for (const value of [
    'mc-demo-section',
    '<ProductPreview />',
    'mc-approach',
    'mc-how-section',
    'mc-care-section',
    'mc-faq-section',
    "setLegalView('privacy')",
    "setLegalView('terms')",
  ]) assert.ok(jsx.includes(value), `existing landing functionality missing: ${value}`)
})
