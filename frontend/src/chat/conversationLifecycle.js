/**
 * Small, testable conversation lifecycle operations.
 *
 * Starting a new chat intentionally has no deletion dependency; saved history is
 * retained and can be resumed from Recent activity. Deletion is explicit and only
 * starts a fresh local session after the server confirms deletion.
 */
export function startNewConversation({ createNewSession, resetTransientState }) {
  resetTransientState()
  return createNewSession()
}

export async function deleteConversationAndStartFresh({
  sessionId,
  deleteSession,
  createNewSession,
  resetTransientState,
}) {
  await deleteSession(sessionId)
  resetTransientState()
  return createNewSession()
}

export function canDeleteConversation(messages, failedTurn) {
  return !failedTurn &&
    Array.isArray(messages) &&
    messages.some(message => message?.role === 'user')
}
