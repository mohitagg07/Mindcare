export async function readChatEventStream(response, onDelta) {
  if (!response.body?.getReader) throw new Error('This browser cannot receive a streamed response. Please reload and try again.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = null

  const dispatch = block => {
    const payload = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
    if (!payload) return
    let event
    try { event = JSON.parse(payload) } catch { throw new Error('The response stream was incomplete. Please try again.') }
    if (event.type === 'delta' && typeof event.text === 'string') onDelta?.(event.text)
    else if (event.type === 'error') throw new Error(event.message || 'MindCare could not complete this response. Please retry.')
    else if (event.type === 'done' && event.data && typeof event.data === 'object') completed = event.data
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    buffer = buffer.replace(/\r\n/g, '\n')
    let boundary
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      dispatch(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
    }
    if (done) break
  }
  if (buffer.trim()) dispatch(buffer)
  if (!completed) throw new Error('The response ended before MindCare confirmed the conversation was saved. Retry to check the saved reply.')
  return { data: completed }
}
