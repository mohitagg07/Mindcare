import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const dashboard = readFileSync(resolve(here, '../src/components/Dashboard.jsx'), 'utf8')
const styles = readFileSync(resolve(here, '../src/components/Dashboard.css'), 'utf8')

test('Home offers three explicit starting points with different conversation prompts', () => {
  assert.match(dashboard, /Talk it through/)
  assert.match(dashboard, /Get some clarity/)
  assert.match(dashboard, /Find a next step/)
  assert.match(dashboard, /STARTING_POINTS\.find/)
  assert.match(dashboard, /setPendingChatPrompt/)
  assert.match(dashboard, /startSelectedConversation/)
})

test('guided check-in remains directly reachable from Home', () => {
  assert.match(dashboard, /Prefer guided questions\? Take a check-in/)
  assert.match(dashboard, /setActivePage\('assessment'\)/)
})

test('recent activity retains loading, retry, and empty states', () => {
  assert.match(dashboard, /mcd-activity-skeleton/)
  assert.match(dashboard, /Try again/)
  assert.match(dashboard, /Nothing to pick up yet/)
  assert.match(dashboard, /resume\(item\.session\)/)
})

test('Home choices expose selected state and keep responsive keyboard affordances', () => {
  assert.match(dashboard, /aria-pressed=\{selected\}/)
  assert.match(styles, /\.mcd-intent-option\.is-selected/)
  assert.match(styles, /focus-visible/)
  assert.match(styles, /@media\s*\(max-width:\s*760px\)/)
  assert.match(styles, /prefers-reduced-motion/)
})


test('Home keeps a restrained surface system rather than adding a decorative hero treatment', () => {
  assert.doesNotMatch(dashboard, /mcd-welcome-hero|mcd-welcome-art|mcd-orbit|mcd-float-chip/)
  assert.doesNotMatch(styles, /backdrop-filter|\.mcd-welcome-hero|\.mcd-float-chip/)
  assert.match(styles, /\.mcd-start-card, \.mcd-activity-card/)
  assert.match(styles, /\.mcd-intent-option:hover/)
  assert.match(styles, /\.mcd-activity-row:hover/)
})


test('the frontend loads two type families and keeps page routes lazy-loaded', () => {
  const html = readFileSync(resolve(here, '../index.html'), 'utf8')
  const app = readFileSync(resolve(here, '../src/App.jsx'), 'utf8')
  const globalCss = readFileSync(resolve(here, '../src/index.css'), 'utf8')
  assert.match(html, /family=DM\+Sans/)
  assert.match(html, /family=Fraunces/)
  assert.doesNotMatch(html, /family=(?:Lora|Manrope)/)
  assert.doesNotMatch(globalCss, /Lora|Manrope/)
  for (const route of ['Chat', 'Assessment', 'EmotionDetector', 'Dashboard', 'Metrics', 'Profile']) {
    assert.match(app, new RegExp('const ' + route + ' = lazy'))
  }
})


test('Profile and Insights CSS are route-owned instead of global', () => {
  const globalCss = readFileSync(resolve(here, '../src/index.css'), 'utf8')
  const profileCss = readFileSync(resolve(here, '../src/components/Profile.css'), 'utf8')
  const metricsCss = readFileSync(resolve(here, '../src/components/Metrics.css'), 'utf8')
  const profileSource = readFileSync(resolve(here, '../src/components/Profile.jsx'), 'utf8')
  const metricsSource = readFileSync(resolve(here, '../src/components/Metrics.jsx'), 'utf8')
  assert.doesNotMatch(globalCss, /\.profile-page|\.profile-main-grid|\.insights-page|\.insights-chart-card/)
  assert.match(profileCss, /\.profile-page/)
  assert.doesNotMatch(profileCss, /\.insights-page|\.insights-chart-card/)
  assert.match(metricsCss, /\.insights-page|\.insights-chart-card/)
  assert.doesNotMatch(metricsCss, /\.profile-page|\.profile-main-grid/)
  assert.match(profileSource, /Profile\.css/)
  assert.match(metricsSource, /Metrics\.css/)
})


test('Chat page styles load with the lazy Chat component rather than the global stylesheet', () => {
  const globalCss = readFileSync(resolve(here, '../src/index.css'), 'utf8')
  const chatCss = readFileSync(resolve(here, '../src/components/ChatPhase3.css'), 'utf8')
  const chatSource = readFileSync(resolve(here, '../src/components/Chat.jsx'), 'utf8')
  assert.doesNotMatch(globalCss, /\.chat-mode-bar|\.chat-welcome|\.chat-notice|\.chat-checkin-invite/)
  assert.match(chatCss, /\.chat-mode-bar/)
  assert.match(chatCss, /\.chat-welcome/)
  assert.match(chatSource, /ChatPhase3\.css/)
})


test('the global stylesheet excludes retired Home/Overview visual systems', () => {
  const globalCss = readFileSync(resolve(here, '../src/index.css'), 'utf8')
  const dashboard = readFileSync(resolve(here, '../src/components/Dashboard.jsx'), 'utf8')
  assert.doesNotMatch(globalCss, /\.overview-hero|\.overview-action-card|\.home-hero|\.home-tool-card|@keyframes homeOrbit/)
  assert.match(dashboard, /mcd-home-grid/)
})
