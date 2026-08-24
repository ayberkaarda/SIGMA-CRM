// "Elif yazıyor…" / "Elif ve Mert yazıyor…" / 3+ için "Birkaç kişi yazıyor…".
// `typingUsers` `ChatUser[]` — boşsa hiçbir şey render edilmez.
import type { ChatUser } from '../types'

export type TypingIndicatorProps = {
  users: ChatUser[]
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null

  let text: string
  if (users.length === 1) {
    text = `${users[0].name} yazıyor…`
  } else if (users.length === 2) {
    text = `${users[0].name} ve ${users[1].name} yazıyor…`
  } else {
    text = 'Birkaç kişi yazıyor…'
  }

  return (
    <div className="px-4 pb-1 text-xs text-fg-muted" role="status" aria-live="polite">
      {text}
    </div>
  )
}
