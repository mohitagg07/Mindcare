import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const chat = readFileSync(resolve(here, '../src/components/Chat.jsx'), 'utf8')
const styles = readFileSync(resolve(here, '../src/components/ChatPhase3.css'), 'utf8')

test('chat consumes the server stream and renders partial text before completion', () => {
  assert.match(chat, /sendChatStream/)
  assert.match(chat, /onDelta:\s*\(delta\) => setStreamedResponse/)
  assert.match(chat, /StreamingMessage content=\{streamedResponse\}/)
  assert.match(chat, /setStreamedResponse\(''\)/)
})

test('chat can stop an active response and preserves same-turn retry semantics', () => {
  assert.match(chat, /new AbortController\(\)/)
  assert.match(chat, /streamControllerRef\.current\?\.abort\(\)/)
  assert.match(chat, /aria-label="Stop response"/)
  assert.match(chat, /clientTurnId, text, assessmentFollowUpId, conversationMode/)
  assert.match(chat, /Retry the same message/)
  assert.match(styles, /\.chat-stop-button:focus-visible/)
})

test('the UI does not expose partial assistant text as a saved response after a failed stream', () => {
  assert.match(chat, /Partial streamed text is never treated as a completed\/saved assistant message/)
  assert.match(chat, /setStreamedResponse\(''\)\s*setFailedTurn/)
  assert.match(chat, /setStreamedResponse\(''\)\s*\n\s*setFailedTurn/)
})
