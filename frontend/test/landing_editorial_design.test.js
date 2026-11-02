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
  assert.ok(section.includes('You don’t need the right words. Start with what’s on your mind.'))
  assert.ok(section.includes('onClick={onGetStarted}'))
  assert.ok(section.includes('See how it works'))
  assert.ok(section.includes('mc-hero-link-icon'))
  assert.ok(section.includes('fetchPriority="high"'))
})

test('hero removes redundant template decoration while preserving the original photograph', () => {
  const section = hero()
  const css = read('../src/pages/Landing.css')
  assert.ok(section.includes('mc-hero-photo'))
  assert.ok(section.includes('A little room to think'))
  assert.ok(!section.includes('mc-hero-side-note'))
  assert.ok(!section.includes('mc-hero-trust-row'))
  assert.ok(!section.includes('mc-hero-bottomline'))
  assert.ok(section.includes('photos/3915672/pexels-photo-3915672.jpeg'))
  assert.ok(section.includes('srcSet="https://images.pexels.com/photos/3915672'))
  assert.ok(section.includes('fetchPriority="high"'))
})

test('hero type and layout are tuned for desktop, tablet, phone, and short viewports', () => {
  const css = read('../src/pages/Landing.css')
  assert.ok(css.includes('text-wrap: balance'))
  assert.ok(css.includes('font-kerning: normal'))
  assert.ok(css.includes('@media (max-width: 1100px) and (min-width: 761px)'))
  assert.ok(css.includes('@media (max-width: 390px)'))
  assert.ok(css.includes('@media (max-height: 720px) and (min-width: 761px)'))
  assert.ok(css.includes('@media (max-width: 760px) and (max-height: 700px)'))
})

test('hero controls keep accessible focus and reduced-motion behavior', () => {
  const css = read('../src/pages/Landing.css')
  assert.ok(css.includes(':focus-visible'))
  assert.ok(css.includes('.mc-landing .mc-hero .mc-button-dark:hover'))
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


test('hero uses the approved palette, typography, and exact responsive type scale', () => {
  const css = read('../src/pages/Landing.css')
  const html = read('../index.html')
  assert.ok(css.includes('--mc-hero-forest: #0F2D24'))
  assert.ok(css.includes('--mc-hero-accent: #25634A'))
  assert.ok(css.includes('--mc-hero-sage: #A9C3A1'))
  assert.ok(css.includes('--mc-hero-ivory: #F6F4EC'))
  assert.ok(css.includes('"Playfair Display"'))
  assert.ok(css.includes('"Inter"'))
  assert.ok(css.includes('font-size: clamp(58px, 5.25vw, 72px)'))
  assert.ok(css.includes('font-size: 40px'))
  assert.ok(css.includes('font-size: 18px'))
  assert.ok(css.includes('font-size: 16px'))
  assert.ok(html.includes('family=Inter'))
  assert.ok(html.includes('family=Playfair+Display'))
})

test('hero is full viewport on Android and uses no glass panels', () => {
  const css = read('../src/pages/Landing.css')
  assert.match(css, /\.mc-landing \.mc-hero \{[^}]*min-height: 100svh/s)
  assert.match(css, /\.mc-landing \.mc-hero-inner \{[^}]*min-height: 100svh/s)
  assert.ok(css.includes('min-height: 100dvh'))
  assert.ok(css.includes('env(safe-area-inset-bottom)'))
  const approvedBlock = css.slice(css.indexOf('/* MindCare approved hero design system'))
  assert.ok(approvedBlock.includes('background: transparent'))
  assert.ok(approvedBlock.includes('-webkit-backdrop-filter: none'))
  assert.ok(!approvedBlock.includes('backdrop-filter: blur'))
  assert.match(approvedBlock, /@media \(max-width: 760px\)/)
  assert.match(approvedBlock, /@media \(max-width: 390px\)/)
})


test('hero small text is dark, copy sits on ivory, and buttons use current proportions', () => {
  const css = read('../src/pages/Landing.css')
  const block = css.slice(css.indexOf('/* MindCare — natural editorial hero'))
  assert.ok(block.includes('color: #17221B'))
  assert.ok(block.includes('color: #344139'))
  assert.ok(block.includes('background: var(--mc-hero-ivory)'))
  assert.ok(block.includes('border-radius: 11px'))
  assert.ok(block.includes('min-height: 50px'))
})

test('Android hero stacks the photograph and complete copy inside the dynamic viewport', () => {
  const css = read('../src/pages/Landing.css')
  const block = css.slice(css.indexOf('/* MindCare — natural editorial hero'))
  assert.ok(block.includes('height: calc(100dvh - 62px)'))
  assert.ok(block.includes('grid-template-rows: minmax(150px, 31%) minmax(0, 69%)'))
  assert.ok(block.includes('@media (max-width: 390px)'))
  assert.ok(block.includes('@media (max-width: 760px) and (max-height: 680px)'))
  assert.ok(block.includes('env(safe-area-inset-bottom)'))
})
