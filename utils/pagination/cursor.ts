export interface CursorPayload {
  created_at: string
  id: string | number
}

export function encodeCursor(payload: CursorPayload): string {
  const compact = `${payload.created_at}::${payload.id}`
  return Buffer.from(compact).toString('base64')
}

export function decodeCursor(cursor: string | null | undefined): CursorPayload | null {
  if (!cursor) return null
  try {
    const raw = Buffer.from(cursor, 'base64').toString('utf8')
    const [created_at, id] = raw.split('::')
    if (!created_at || !id) return null
    return { created_at, id }
  } catch {
    return null
  }
}


