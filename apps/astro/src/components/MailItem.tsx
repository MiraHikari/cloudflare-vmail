import type { EmailSummary } from 'database/dao'
import { actions } from 'astro:actions'
import { formatDistanceToNow } from 'date-fns'
import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

interface MailItemProps {
  mail: EmailSummary
}

export default function MailItem({ mail: item }: MailItemProps) {
  const [isRead, setIsRead] = useState(item.isRead)
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = useCallback(async () => {
    if (isRead || isLoading) return

    setIsLoading(true)
    // Optimistically update UI
    setIsRead(true)

    try {
      const result = await actions.markEmailAsRead({ id: item.id })
      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch {
      // Revert on error
      setIsRead(false)
    } finally {
      setIsLoading(false)
    }
  }, [isRead, isLoading, item.id])

  // Get sender initial safely
  const senderInitial =
    item.from?.name?.charAt(0)?.toUpperCase() || item.from?.address?.charAt(0)?.toUpperCase() || '?'

  // Get sender display name safely
  const senderName = item.from?.name || item.from?.address || 'Unknown'

  // Get preview text safely
  const previewText =
    item.text?.slice(0, 200) || item.html?.replace(/<[^>]*>/g, '').slice(0, 200) || 'No content'

  // Format date safely
  const dateStr = item.date || item.createdAt
  const formattedDate = dateStr
    ? formatDistanceToNow(new Date(dateStr), { addSuffix: true })
    : 'Unknown date'

  return (
    <a
      href={`/mails/${item.id}`}
      onClick={handleClick}
      className={cn(
        'group flex items-start gap-3 bg-card p-3 ring-1 ring-foreground/10 transition-colors',
        'hover:bg-muted/50',
        !isRead && 'bg-primary/[0.04] ring-primary/20 hover:bg-primary/[0.08]'
      )}
    >
      {/* Avatar */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {senderInitial}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              'truncate text-xs',
              isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'
            )}
          >
            {senderName}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {!isRead && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}
            <time className="text-xs text-muted-foreground tabular-nums">{formattedDate}</time>
          </span>
        </div>

        {/* Content */}
        <h4
          className={cn(
            'line-clamp-1 text-xs',
            isRead ? 'font-normal text-foreground' : 'font-medium text-foreground'
          )}
        >
          {item.subject || 'No subject'}
        </h4>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{previewText}</p>
      </div>
    </a>
  )
}
