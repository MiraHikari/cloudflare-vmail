import type { Email } from 'database/schema';
import { formatDistanceToNow } from 'date-fns'

export default function MailItem({ mail: item }: { mail: Email }) {
  return (
    <a
      href={`/mails/${item.id}`}
      key={item.id}
      className="flex flex-col items-start text-primary gap-2 mb-1 rounded-lg border border-border p-3 text-left text-sm transition-all hover:bg-primary-foreground"
    >
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center">
          <div className="flex items-center gap-2">
            <div className="font-semibold">{item.from.name}</div>
          </div>
          <div className="ml-auto text-xs">
            {formatDistanceToNow(new Date(item.date || item.createdAt), {
              addSuffix: true,
            })}
          </div>
        </div>
        <div className="text-xs font-medium">{item.subject}</div>
      </div>
      <div className="line-clamp-2 text-xs text-primary font-normal w-full">
        {item.text || item.html || ''.substring(0, 300)}
      </div>
    </a>
  )
}
