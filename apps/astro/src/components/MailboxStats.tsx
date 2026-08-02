import { useQuery } from '@tanstack/react-query'
import { actions } from 'astro:actions'
import { Mail, MailOpen, MailPlus } from 'lucide-react'
import { Card, CardContent } from './ui/card'

export function MailboxStats() {
  const { data: stats } = useQuery({
    queryKey: ['mailbox-stats'],
    queryFn: async () => {
      const res = await actions.getMailboxStats()
      return res.data
    },
    refetchInterval: 30000,
  })

  if (!stats) return null

  const items = [
    { label: 'Total', value: stats.total, icon: Mail, valueClass: 'text-foreground' },
    { label: 'Unread', value: stats.unread, icon: MailPlus, valueClass: 'text-primary' },
    { label: 'Read', value: stats.read, icon: MailOpen, valueClass: 'text-muted-foreground' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ label, value, icon: Icon, valueClass }) => (
        <Card key={label} size="sm">
          <CardContent className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className={`font-heading text-lg font-semibold tabular-nums ${valueClass}`}>
                {value}
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <Icon className="size-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
