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

test('hero uses the approved headline, supporting copy and functional calls to action', () => {
  const section = hero()
  for (const value of [
    'A calmer space for your mind',
    'Give your thoughts',
    'a little <em>room.</em>',
    'Talk it through. Reflect. Check in on your mood.',
    'Find a small next step — at your own pace.',
    'onClick={onGetStarted}',
    'Start a conversation',
    'href="#approach">Explore MindCare</a>',
  ]) assert.ok(section.includes(value), `missing hero content: ${value}`)
})

test('hero image is a remote Pexels landscape rather than the old framed AVIF', () => {
  const section = hero()
  assert.ok(section.includes('images.pexels.com/photos/19291526/pexels-photo-19291526.jpeg'))
  assert.ok(!section.includes('/mindcare-hero.avif'))
  assert.equal((section.match(/<img\b/g) || []).length, 1)
  assert.ok(!section.includes('mc-hero-side-note'), 'clipped handwritten note has been removed')
})

test('desktop hero photo fills the viewport and leaves a dark, readable text area', () => {
  const css = heroCss()
  for (const value of [
    'min-height: 100svh',
    'position: absolute',
    'inset: 0',
    'object-fit: cover',
    'scaleX(-1)',
    'linear-gradient(90deg',
    'rgba(9, 24, 17',
    'font-size: clamp(56px, 5.8vw, 84px)',
    'background: #087a53',
  ]) assert.ok(css.includes(value), `missing desktop hero style: ${value}`)
})

test('navigation uses white-on-dark contrast, with a usable mobile menu', () => {
  const css = heroCss()
  for (const value of [
    'position: absolute',
    'color: rgba(255, 252, 244, .96)',
    '@media (max-width: 940px)',
    '.mc-site-nav.is-open',
    '.mc-mobile-menu-toggle',
  ]) assert.ok(css.includes(value), `missing navigation style: ${value}`)
})

test('trust row stays in the hero layout and fits smaller screens', () => {
  const css = heroCss()
  for (const value of [
    '.mc-hero-trust-row',
    'grid-template-columns: repeat(3, minmax(0, 1fr))',
    '@media (max-width: 600px)',
    'font-size: 10px',
    'max-height: 700px',
  ]) assert.ok(css.includes(value), `missing responsive trust style: ${value}`)
})

test('legacy product sections, navigation, legal flows and the mobile toggle remain intact', () => {
  const jsx = read('../src/pages/Landing.jsx')
  for (const value of [
    'aria-label="Main navigation"',
    'setMobileNavOpen',
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

test('legacy split-layout background cannot cover the full-bleed hero photo', () => {
  const css = heroCss()
  const inner = css.match(/\.mc-landing \.mc-hero\.mc-hero-reference \.mc-hero-inner \{[\s\S]*?\n\}/)?.[0] || ''
  assert.ok(inner.includes('background: transparent'))
  assert.ok(inner.includes('grid-column: auto'))
  assert.ok(inner.includes('grid-row: auto'))
  assert.ok(inner.includes('box-shadow: none'))
  assert.ok(css.includes('inset: 0'))
  assert.ok(css.includes('object-fit: cover'))
})

test('hero copy and trust row stay high contrast over the photograph', () => {
  const css = heroCss()
  assert.ok(css.includes('color: #fffdf6'))
  assert.ok(css.includes('color: rgba(255, 253, 246, .9)'))
  assert.ok(css.includes('border-color: rgba(255, 252, 244, .78)'))
  assert.ok(css.includes('background: rgba(10, 25, 18, .18)'))
  assert.ok(css.includes('rgba(9, 24, 17, .94)'))
})
