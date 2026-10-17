import test from 'node:test'
import assert from 'node:assert/strict'
import { readChatEventStream } from '../src/api/sse.js'

function responseFrom(text, chunkSize = 7) {
  const bytes = new TextEncoder().encode(text)
  const chunks = []
  for (let index = 0; index < bytes.length; index += chunkSize) chunks.push(bytes.slice(index, index + chunkSize))
  return {
    body: new ReadableStream({
      start(controller) {
        chunks.forEach(chunk => controller.enqueue(chunk))
        controller.close()
      },
    }),
  }
}

test('parses fragmented CRLF events and returns only after save confirmation', async () => {
  const wire = [
    `data: ${JSON.stringify({ type: 'delta', text: 'A human ' })}\r\n\r\n`,
    `data: ${JSON.stringify({ type: 'delta', text: 'sounding reply.' })}\r\n\r\n`,
    `data: ${JSON.stringify({ type: 'done', data: { session_id: 'session-1', saved: true } })}\r\n\r\n`,
  ].join('')
  const deltas = []
  const result = await readChatEventStream(responseFrom(wire), text => deltas.push(text))
  assert.deepEqual(deltas, ['A human ', 'sounding reply.'])
  assert.deepEqual(result.data, { session_id: 'session-1', saved: true })
})

test('surfaces server stream errors without treating partial text as saved', async () => {
  const wire = `data: ${JSON.stringify({ type: 'delta', text: 'Partial text' })}\n\n` +
    `data: ${JSON.stringify({ type: 'error', message: 'Could not save this reply.' })}\n\n`
  const deltas = []
  await assert.rejects(readChatEventStream(responseFrom(wire), text => deltas.push(text)), /Could not save this reply/)
  assert.deepEqual(deltas, ['Partial text'])
})

test('rejects a stream that ends before persistence is confirmed', async () => {
  const wire = `data: ${JSON.stringify({ type: 'delta', text: 'Still writing' })}\n\n`
  await assert.rejects(readChatEventStream(responseFrom(wire), () => {}), /confirmed the conversation was saved/)
})

test('rejects malformed server events', async () => {
  await assert.rejects(readChatEventStream(responseFrom('data: {broken}\n\n'), () => {}), /stream was incomplete/)
})
