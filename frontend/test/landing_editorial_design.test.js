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
const heroCss = () => { const css = read('../src/pages/Landing.css'); return css.slice(css.lastIndexOf('/* MindCare reference hero:')) }

test('hero keeps the approved copy, both CTAs and working conversation action', () => {
  const section = hero()
  for (const text of ['A calmer space for your mind','Give your thoughts','a little <em>room.</em>','Talk it through. Reflect. Check in on your mood.','Find a small next step — at your own pace.','Start a conversation','href="#approach">Explore MindCare</a>','onClick={onGetStarted}']) assert.ok(section.includes(text))
})
test('trust row and handwritten note are actual DOM content', () => {
  const section = hero()
  for (const text of ['A safe space','to talk','Gentle','check-ins','Your choices','stay yours','Your pace.','Your choice.']) assert.ok(section.includes(text))
  assert.equal((section.match(/<img\b/g)||[]).length,1)
})
test('desktop hero has a full-bleed photo, editorial typography and paired pill buttons', () => {
  const css = heroCss()
  for (const text of ['min-height:100dvh','linear-gradient(90deg','font-size:clamp(58px,6.05vw,91px)','border-radius:999px','mc-hero-side-note::after','Caveat']) assert.ok(css.includes(text))
})
test('mobile hero remains a photo-backed full-height scene and uses compact responsive details', () => {
  const css = heroCss()
  for (const text of ['@media (max-width:760px)','object-position:75% center','repeat(3,minmax(0,1fr))','env(safe-area-inset-top)','env(safe-area-inset-bottom)','@media (max-width:390px)','@media (prefers-reduced-motion:reduce)']) assert.ok(css.includes(text))
})
test('all previous landing sections, legal flows and mobile menu remain available', () => {
  const jsx = read('../src/pages/Landing.jsx')
  for (const text of ['aria-label="Main navigation"','setMobileNavOpen','mc-demo-section','<ProductPreview />','mc-approach','mc-how-section','mc-care-section','mc-faq-section',"setLegalView('privacy')","setLegalView('terms')"]) assert.ok(jsx.includes(text))
})
test('Caveat is loaded for the handwritten note', () => { assert.ok(read('../index.html').includes('family=Caveat:wght@500;600')) })
