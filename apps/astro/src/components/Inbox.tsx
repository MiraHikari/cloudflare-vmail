import type { Email } from 'database/schema'
import { Icon } from '@iconify/react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { actions } from 'astro:actions'
import { MailIcon } from 'lucide-react'
import MailItem from './MailItem'
import Loader from './ui/loader'

const queryClient = new QueryClient()

export function Inbox({ mails }: { mails: Email[] }) {
  const { data, isFetching } = useQuery({
    queryKey: ['emails'],
    queryFn: async () => {
      const res = (await actions.getEmailsByMessageToWho()).data!

      return res
    },
    initialData: mails,
    refetchInterval: 20000, // refetch every 20 seconds
  })

  return (
    <>
      <div className="rounded-md border border-border">
        <div className="w-full rounded-t-md p-2 flex items-center bg-muted text-primary gap-2">
          <div className="flex items-center justify-start gap-2 font-bold">
            <MailIcon className="size-6" />
            Inbox
            {data.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-primary bg-background rounded-full">
                {data.length}
              </span>
            )}
          </div>
          <button
            className="rounded ml-auto p-1"
            title="refresh"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ['emails'],
              })}
          >
            <Icon
              icon="mdi:refresh"
              className={
                isFetching
                  ? 'animate-spin'
                  : ''
                    + ' size-6 hover:animate-spin active:opacity-20 transition-all duration-300'
              }
            />
          </button>
        </div>

        <div className="grids flex flex-col flex-1 h-[488px] overflow-y-auto p-2">
          {data.length === 0 && (
            <div className="w-full items-center h-[488px] flex-col justify-center flex">
              <Loader />
              <p className="text-zinc-400 mt-6">Waiting for emails.</p>
            </div>
          )}

          {data.map((mail: Email) => (
            <MailItem mail={mail} key={mail.id} />
          ))}
        </div>
      </div>
    </>
  )
}

export default function InboxWithQuery({ mails }: { mails: Email[] }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Inbox mails={mails} />
    </QueryClientProvider>
  )
}
