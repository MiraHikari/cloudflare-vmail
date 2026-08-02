import type { EmailSummary } from 'database/dao'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { actions } from 'astro:actions'
import { AlertCircle, CheckCheck, Mail, RefreshCw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ClaimMailboxDialog } from './ClaimMailboxDialog'
import { MailboxStats } from './MailboxStats'
import MailItem from './MailItem'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './ui/empty'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './ui/input-group'
import { Skeleton } from './ui/skeleton'

// Create a singleton query client for better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: true,
    },
  },
})

interface InboxProps {
  mails: EmailSummary[]
  mailboxAddress: string
  isClaimed: boolean
}

function MailListSkeleton({ count = 3 }: { count?: number }) {
  const itemKeys = Array.from({ length: count }, (_, index) => `skeleton-${index + 1}`)
  return (
    <div className="space-y-2">
      {itemKeys.map((key) => (
        <div key={key} className="flex items-start gap-3 bg-card p-3 ring-1 ring-foreground/10">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Inbox({ mails, mailboxAddress, isClaimed }: InboxProps) {
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const previousEmailCount = useRef(mails.length)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    data: emails,
    isFetching,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['emails', mailboxAddress],
    queryFn: async () => {
      const result = await actions.getEmailsByMessageToWho()
      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch emails')
      }
      return result.data ?? []
    },
    initialData: mails,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!mailboxAddress,
  })

  // Detect new emails
  useEffect(() => {
    if (emails.length > previousEmailCount.current) {
      const newEmailsCount = emails.length - previousEmailCount.current
      const newEmails = emails.slice(0, newEmailsCount)

      // Show toast for new emails
      if (newEmailsCount === 1 && newEmails[0]) {
        const email = newEmails[0]
        toast('📬 New email received', {
          description: `From: ${email.from?.name || email.from?.address || 'Unknown'}`,
        })
      } else if (newEmailsCount > 1) {
        toast(`📬 ${newEmailsCount} new emails received`, {
          description: 'Check your inbox',
        })
      }
    }

    previousEmailCount.current = emails.length
  }, [emails])

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      toast.error('Failed to refresh emails', {
        description: queryError instanceof Error ? queryError.message : 'Please try again later',
      })
    }
  }, [queryError])

  // Keyboard shortcut: Ctrl/Cmd + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['emails', mailboxAddress],
    })
  }, [mailboxAddress])

  const handleClearSearch = useCallback(() => {
    setSearchTerm('')
    searchInputRef.current?.focus()
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    setIsMarkingAllRead(true)

    try {
      await actions.markAllAsRead()

      // Refresh email list
      queryClient.invalidateQueries({
        queryKey: ['emails', mailboxAddress],
      })

      toast('All emails marked as read', {
        description: `${emails.length} ${emails.length === 1 ? 'email' : 'emails'} marked as read`,
      })
    } catch {
      toast.error('Failed to mark all as read', {
        description: 'Please try again',
      })
    } finally {
      setIsMarkingAllRead(false)
    }
  }, [emails.length, mailboxAddress])

  // Filter emails based on search term
  const filteredEmails = useMemo(() => {
    if (!searchTerm.trim()) return emails

    const lowerSearch = searchTerm.toLowerCase()

    return emails.filter((email) => {
      const subject = email.subject?.toLowerCase() || ''
      const fromName = email.from?.name?.toLowerCase() || ''
      const fromAddress = email.from?.address?.toLowerCase() || ''
      const text = email.text?.toLowerCase() || ''

      return (
        subject.includes(lowerSearch) ||
        fromName.includes(lowerSearch) ||
        fromAddress.includes(lowerSearch) ||
        text.includes(lowerSearch)
      )
    })
  }, [emails, searchTerm])

  const hasUnreadEmails = emails.some((email) => !email.isRead)
  const unreadCount = emails.filter((email) => !email.isRead).length

  // Show error state if query failed and we have no data
  if (queryError && emails.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Failed to load emails</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          <p>{queryError instanceof Error ? queryError.message : 'Please try again later'}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Panel */}
      {emails.length > 0 && <MailboxStats />}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-base font-medium">Inbox</h2>
          {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
          {emails.length > 0 && unreadCount === 0 && (
            <span className="text-xs text-muted-foreground">
              {searchTerm
                ? `${filteredEmails.length} of ${emails.length} emails`
                : `${emails.length} ${emails.length === 1 ? 'email' : 'emails'}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isClaimed && mailboxAddress && <ClaimMailboxDialog mailboxAddress={mailboxAddress} />}
          {hasUnreadEmails && emails.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead}
            >
              <CheckCheck className={isMarkingAllRead ? 'animate-pulse' : undefined} />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={isFetching}
            title="Refresh emails"
          >
            <RefreshCw className={isFetching ? 'animate-spin' : undefined} />
            <span className="sr-only">Refresh emails</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {emails.length > 0 && (
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchInputRef}
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <InputGroupAddon align="inline-end">
            {searchTerm ? (
              <InputGroupButton onClick={handleClearSearch} aria-label="Clear search">
                <X />
              </InputGroupButton>
            ) : (
              <kbd className="hidden select-none items-center gap-1 border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            )}
          </InputGroupAddon>
        </InputGroup>
      )}

      {/* Loading State */}
      {isLoading && emails.length === 0 && <MailListSkeleton count={3} />}

      {/* Email List */}
      {!isLoading && emails.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Mail />
            </EmptyMedia>
            <EmptyTitle>Waiting for emails...</EmptyTitle>
            <EmptyDescription>
              Your temporary mailbox is ready. Use this address to sign up for services and new
              emails will appear here automatically.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filteredEmails.length > 0 ? (
        <div className="space-y-2">
          {filteredEmails.map((mail) => (
            <MailItem key={mail.id} mail={mail} />
          ))}
        </div>
      ) : searchTerm ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>No results found</EmptyTitle>
            <EmptyDescription>
              No emails match &quot;
              <span className="font-medium text-foreground">{searchTerm}</span>
              &quot;
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={handleClearSearch}>
              Clear search
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}
    </div>
  )
}

export default function InboxWithQuery({ mails, mailboxAddress, isClaimed }: InboxProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Inbox mails={mails} mailboxAddress={mailboxAddress} isClaimed={isClaimed} />
    </QueryClientProvider>
  )
}
