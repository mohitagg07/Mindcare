import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(here, '../src/components/Sidebar.jsx'), 'utf8')
const css = readFileSync(resolve(here, '../src/components/Sidebar.css'), 'utf8')

test('sidebar uses one plain label per destination, without duplicate headings and microcopy', () => {
  assert.doesNotMatch(source, /Your space|WORKSPACE|A CALMER YOU, EVERYDAY|Need a moment\?|mc-nav-detail/)
  for (const label of ['Home', 'Talk', 'Check-in', 'Reflect', 'Insights', 'Profile']) assert.match(source, new RegExp(label))
})
test('sidebar keeps account and privacy details in a quiet footer', () => {
  assert.match(source, /mc-side-user/)
  assert.match(source, /Private to your account/)
  assert.doesNotMatch(source, /Private by default|Sparkles|ArrowUpRight/)
})
test('active navigation is clear without gradient tiles or translational animation', () => {
  assert.match(css, /\.mc-side-item\.is-active/)
  assert.match(css, /border-left:\s*3px solid/)
  assert.doesNotMatch(css, /linear-gradient|translateX|translateY/)
})
