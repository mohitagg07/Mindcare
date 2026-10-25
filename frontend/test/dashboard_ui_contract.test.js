import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(here, '../src/components/Dashboard.jsx'), 'utf8')
const css = readFileSync(resolve(here, '../src/components/Dashboard.css'), 'utf8')

test('Home has a semantic light-glass welcome hero with real account-aware copy', () => {
  assert.match(source, /className="mcd-welcome-hero"/)
  assert.match(source, /aria-labelledby="mcd-welcome-title"/)
  assert.match(source, /greeting\(timezone\)/)
  assert.match(source, /className="mcd-welcome-art" aria-hidden="true"/)
  assert.match(css, /\.mcd-welcome-hero/)
  assert.match(css, /backdrop-filter:\s*blur\(28px\)/)
})

test('Home keeps existing conversation selection and persisted activity wiring', () => {
  assert.match(source, /aria-pressed=\{selected\}/)
  assert.match(source, /onClick=\{startSelectedConversation\}/)
  assert.match(source, /Promise\.allSettled\(\[api\.mySessions\(\), getAssessmentHistory\(\)\]\)/)
  assert.match(source, /allActivityRequestsFailed/)
  assert.match(source, /someActivityRequestFailed/)
})

test('Home motion respects the user reduced-motion preference', () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
  assert.match(css, /mcd-orbit-middle, \.mcd-float-chip-one, \.mcd-float-chip-two \{ animation: none; \}/)
})
