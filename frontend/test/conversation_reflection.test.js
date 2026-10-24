import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const chat = readFileSync(resolve(here, '../src/components/Chat.jsx'), 'utf8')
const client = readFileSync(resolve(here, '../src/api/client.js'), 'utf8')
const styles = readFileSync(resolve(here, '../src/index.css'), 'utf8')

test('reflection is an explicit action, not an automatic popup', () => {
  assert.match(chat, /Wrap up & reflect/)
  assert.match(chat, /onClick=\{handleToggleReflection\}/)
  assert.doesNotMatch(chat, /addMessage\(\{[^}]*reflection/s)
})

test('reflection draft is editable in three bounded fields and save is a separate action', () => {
  assert.match(chat, /What I shared/)
  assert.match(chat, /What I noticed/)
  assert.match(chat, /One possible next step/)
  assert.match(chat, /maxLength=\{600\}/)
  assert.match(chat, /maxLength=\{400\}/)
  assert.match(chat, /onClick=\{handleSaveReflection\}/)
  assert.match(chat, /Nothing is saved until you choose Save reflection/)
})

test('reflection uses conversation-scoped storage instead of chat-memory endpoints', () => {
  for (const name of ['generateReflectionDraft', 'getConversationReflection', 'saveConversationReflection', 'deleteConversationReflection']) assert.match(client, new RegExp(name))
  assert.match(chat, /deleteConversationReflection\(sessionId\)/)
  assert.doesNotMatch(chat, /createChatMemory\(/)
})

test('reflection card has responsive layout, visible focus, and reduced-motion support', () => {
  assert.match(styles, /\.chat-reflection-card/)
  assert.match(styles, /chat-reflection-actions button:focus-visible/)
  assert.match(styles, /@media\(max-width:760px\)[\s\S]*chat-reflection-launch/)
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)[\s\S]*chat-reflection-actions/)
})


test('reflection action is hidden when this conversation has a safety follow-up flag', () => {
  assert.match(chat, /conversationNeedsSafetyFollowUp/)
  assert.match(chat, /!conversationNeedsSafetyFollowUp && messages\.some/)
  assert.match(chat, /reflectionOpen && !conversationNeedsSafetyFollowUp/)
  assert.match(chat, /if \(conversationNeedsSafetyFollowUp\) return/)
})
