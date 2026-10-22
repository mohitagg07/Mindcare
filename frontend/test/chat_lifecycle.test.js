import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canDeleteConversation,
  deleteConversationAndStartFresh,
  startNewConversation,
} from '../src/chat/conversationLifecycle.js'

test('starting a new conversation resets transient UI state and creates a new session only', () => {
  const events = []
  const result = startNewConversation({
    resetTransientState: () => events.push('reset-ui'),
    createNewSession: () => {
      events.push('create-session')
      return 'new-session-id'
    },
  })

  assert.equal(result, 'new-session-id')
  assert.deepEqual(events, ['reset-ui', 'create-session'])
})

test('explicit deletion is confirmed by the server before clearing UI or creating a new session', async () => {
  const events = []
  const result = await deleteConversationAndStartFresh({
    sessionId: 'old-session-id',
    deleteSession: async id => events.push(`delete:${id}`),
    resetTransientState: () => events.push('reset-ui'),
    createNewSession: () => {
      events.push('create-session')
      return 'new-session-id'
    },
  })

  assert.equal(result, 'new-session-id')
  assert.deepEqual(events, ['delete:old-session-id', 'reset-ui', 'create-session'])
})

test('failed deletion preserves the current local conversation and does not create a new one', async () => {
  const events = []
  await assert.rejects(deleteConversationAndStartFresh({
    sessionId: 'old-session-id',
    deleteSession: async () => {
      events.push('delete')
      const error = new Error('network unavailable')
      error.status = 503
      throw error
    },
    resetTransientState: () => events.push('reset-ui'),
    createNewSession: () => events.push('create-session'),
  }), /network unavailable/)

  assert.deepEqual(events, ['delete'])
})

test('delete is disabled for an empty session or an unresolved failed turn', () => {
  assert.equal(canDeleteConversation([], null), false)
  assert.equal(canDeleteConversation([{ role: 'assistant', content: 'Welcome' }], null), false)
  assert.equal(canDeleteConversation([{ role: 'user', content: 'Hi' }], { clientTurnId: 'turn-1' }), false)
  assert.equal(canDeleteConversation([{ role: 'user', content: 'Hi' }], null), true)
})
