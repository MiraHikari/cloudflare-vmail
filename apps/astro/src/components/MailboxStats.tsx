import { useQuery } from '@tanstack/react-query'
import { actions } from 'astro:actions'
import { Circle, Mail, MailOpen } from 'lucide-react'
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

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Total</p>
            </div>
            <Mail className="h-5 w-5 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-amber-600">{stats.unread}</div>
              <p className="text-xs text-muted-foreground mt-1">Unread</p>
            </div>
            <Circle className="h-5 w-5 text-amber-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.read}</div>
              <p className="text-xs text-muted-foreground mt-1">Read</p>
            </div>
            <MailOpen className="h-5 w-5 text-green-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
