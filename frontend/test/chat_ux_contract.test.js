import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const chat = readFileSync(resolve(here, '../src/components/Chat.jsx'), 'utf8')
const styles = readFileSync(resolve(here, '../src/components/ChatPhase3.css'), 'utf8')

test('assistant replies expose an accessible copy action', () => {
  assert.match(chat, /Copy MindCare response/)
  assert.match(chat, /navigator\.clipboard\?\.writeText/)
  assert.match(chat, /Response copied/)
  assert.match(chat, /copiedMessageId === msg\.id/)
  assert.match(styles, /\.chat-message-action:focus-visible/)
})

test('chat preserves user line breaks and resizes the composer after draft changes', () => {
  assert.match(styles, /\.from-user \.chat-bubble\s*\{\s*white-space:\s*pre-wrap;/)
  assert.match(chat, /useEffect\(\(\) => \{\s*const textarea = inputRef\.current/)
  assert.match(chat, /\[input\]\)/)
  assert.doesNotMatch(chat, /event\.target\.style\.height/)
})

test('chat only auto-scrolls while the reader is near the latest message', () => {
  assert.match(chat, /shouldAutoScrollRef\.current\) return/)
  assert.match(chat, /scrollHeight - scrollTop - clientHeight < 120/)
  assert.match(chat, /shouldAutoScrollRef\.current = true/)
})
