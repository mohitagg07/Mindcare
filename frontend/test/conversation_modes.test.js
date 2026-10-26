import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const chat = readFileSync(resolve(here, '../src/components/Chat.jsx'), 'utf8')
const context = readFileSync(resolve(here, '../src/context/AppContext.jsx'), 'utf8')
const styles = readFileSync(resolve(here, '../src/components/ChatPhase3.css'), 'utf8')

test('chat shows four accessible conversation modes', () => {
  for (const label of ['Just listen', 'Explore', 'Next step', 'Reflect']) assert.match(chat, new RegExp(label))
  assert.match(chat, /aria-pressed=\{conversationMode === id\}/)
  assert.match(chat, /role="group" aria-label="Choose a conversation approach"/)
})

test('selected mode is sent to the backend with every user turn', () => {
  assert.match(chat, /conversation_mode: selectedConversationMode/)
  assert.match(chat, /retryTurn\?\.conversationMode/)
  assert.match(context, /const \[conversationMode, setConversationMode\] = useState\('listen'\)/)
  assert.match(context, /setConversationMode\('listen'\)/)
})

test('mode controls disable during send, history loading, and unresolved retries', () => {
  assert.match(chat, /disabled=\{loading \|\| historyLoading \|\| Boolean\(failedTurn\)\}/)
  assert.match(chat, /conversationMode: selectedConversationMode/)
})

test('mode selector has responsive layout, keyboard focus and reduced motion support', () => {
  assert.match(styles, /\.chat-mode-bar/)
  assert.match(styles, /\.chat-mode-option:focus-visible/)
  assert.match(styles, /@media \(max-width: 760px\)/)
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
})
