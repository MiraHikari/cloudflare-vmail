import type { Email } from 'database/schema'
import { actions } from 'astro:actions'
import { formatDistanceToNow } from 'date-fns'
import { Circle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

interface MailItemProps {
  mail: Email
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
        'group block p-4 rounded-xl border transition-all duration-200',
        'hover:shadow-sm hover:-translate-y-0.5',
        isRead
          ? 'bg-card border-border/50 hover:bg-muted/30'
          : 'bg-primary/[0.03] border-primary/20 hover:bg-primary/[0.06]'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        <div className="mt-2 flex-shrink-0">
          {isRead ? (
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          ) : (
            <div className="relative">
              <Circle className="h-2 w-2 fill-primary text-primary" />
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar */}
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                  'bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-medium text-sm'
                )}
              >
                {senderInitial}
              </div>
              {/* Sender name */}
              <div
                className={cn(
                  'text-sm truncate',
                  isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'
                )}
              >
                {senderName}
              </div>
            </div>
            {/* Date */}
            <time className="text-xs text-muted-foreground shrink-0 tabular-nums">
              {formattedDate}
            </time>
          </div>

          {/* Content */}
          <div className="space-y-1 pl-11">
            <h4
              className={cn(
                'text-sm line-clamp-1',
                isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'
              )}
            >
              {item.subject || 'No subject'}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {previewText}
            </p>
          </div>
        </div>
      </div>
    </a>
  )
}
