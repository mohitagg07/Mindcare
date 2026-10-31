import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const read = path => readFileSync(resolve(here, path), 'utf8')
const compact = value => value.replaceAll(' ', '').replaceAll('\n', '').replaceAll('\t', '').replaceAll('\r', '')

test('shared workspace type tokens and reduced-motion support are present', () => {
  const css = read('../src/index.css')
  assert.ok(css.includes('--text-3:  #4F5F53'))
  assert.ok(css.includes('--text-4:  #5D6B60'))
  assert.ok(css.includes('--mc-ink-copy: #425448'))
  assert.ok(css.includes('prefers-reduced-motion: reduce'))
  assert.ok(css.includes('@keyframes mc-page-enter'))
})

test('functional small copy is darker across the main routes', () => {
  const checks = [
    ['../src/pages/Landing.css', '.mc-landing .mc-faq-item p', 'color: #4c5b4f;', 'font-size: 12px'],
    ['../src/components/IdentityOnboarding.css', '.mc-identity-help', 'color: #536257;', 'font-size: 11.5px'],
    ['../src/components/Sidebar.css', '.mc-side-user-email', 'color: #dce8dc;', 'font-size: 10.5px'],
    ['../src/components/Dashboard.css', '.mcd-intent-copy small', 'color: #4d5d50;', 'font-size: 12px'],
    ['../src/components/ChatPhase3.css', '.chat-mode-option', 'color: #43574a;', 'min-height: 40px'],
    ['../src/components/Assessment.css', '.assessment-choice-meta', 'color: #4c5d50;', 'font-size: 11.5px'],
    ['../src/components/Metrics.css', '.insights-footer-note', 'color: #4e5f52;', 'font-size: 11.5px'],
    ['../src/components/Profile.css', '.profile-field small', 'color: #4d5f52;', 'font-size: 11.5px'],
    ['../src/components/ProfileMemory.css', '.profile-memory-editor small', 'color: #4d5f52;', 'font-size: 11.5px'],
  ]
  for (const [path, selector, color, size] of checks) {
    const css = compact(read(path))
    assert.ok(css.includes(compact(selector)), path + ' selector')
    assert.ok(css.includes(compact(color)), path + ' contrast')
    assert.ok(css.includes(compact(size)), path + ' size')
  }
})

test('mobile-facing chrome avoids expensive backdrop blur', () => {
  const checks = [
    ['../src/pages/Landing.css', '.mc-landing .mc-header-inner', ['-webkit-backdrop-filter: none;', 'backdrop-filter: none;']],
    ['../src/components/IdentityOnboarding.css', '.mc-identity-brandbar', ['backdrop-filter: none;', '-webkit-backdrop-filter: none;']],
    ['../src/components/ChatPhase3.css', '.chat-panel-header', ['backdrop-filter: none;', '-webkit-backdrop-filter: none;']],
    ['../src/components/Profile.css', '.profile-savebar', ['backdrop-filter: none;', '-webkit-backdrop-filter: none;']],
  ]
  for (const [path, selector, declarations] of checks) {
    const css = compact(read(path))
    assert.ok(css.includes(compact(selector)), path + ' selector')
    for (const declaration of declarations) assert.ok(css.includes(compact(declaration)), path + ' blur removal')
  }
})

test('expression estimate reuses shared animation and camera status has a single solid surface', () => {
  const emotion = read('../src/components/EmotionDetector.jsx')
  assert.equal(emotion.includes('<style>{'), false)
  assert.ok(emotion.includes("fontSize:10.5, color:'var(--text-3)'"))
  assert.ok(emotion.includes("background:'rgba(255,255,255,.97)'"))
  assert.equal((emotion.match(/background:'rgba\(255,255,255/g) || []).length, 1)
})

test('insights graph axis labels are dark and large enough to read', () => {
  const metrics = read('../src/components/Metrics.jsx')
  assert.equal(metrics.split("fill: '#526257', fontSize: 11").length - 1, 4)
})
