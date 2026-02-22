import type { Email } from 'database/schema'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { actions } from 'astro:actions'
import { CheckCheck, Mail, RefreshCw, Search, Sparkles, X, InboxIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { ClaimMailboxDialog } from './ClaimMailboxDialog'
import { MailboxStats } from './MailboxStats'
import MailItem from './MailItem'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ErrorState, SkeletonList } from './ui/loading-state'

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
  mails: Email[]
  mailboxAddress: string
  isClaimed: boolean
}

export function Inbox({ mails, mailboxAddress, isClaimed }: InboxProps) {
  const { toast } = useToast()
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
        toast({
          title: '📬 New email received',
          description: `From: ${email.from?.name || email.from?.address || 'Unknown'}`,
        })
      } else if (newEmailsCount > 1) {
        toast({
          title: `📬 ${newEmailsCount} new emails received`,
          description: 'Check your inbox',
        })
      }
    }

    previousEmailCount.current = emails.length
  }, [emails, toast])

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      toast({
        title: 'Failed to refresh emails',
        description: queryError instanceof Error ? queryError.message : 'Please try again later',
        variant: 'destructive',
      })
    }
  }, [queryError, toast])

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

      toast({
        title: 'All emails marked as read',
        description: `${emails.length} ${emails.length === 1 ? 'email' : 'emails'} marked as read`,
      })
    } catch {
      toast({
        title: 'Failed to mark all as read',
        description: 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setIsMarkingAllRead(false)
    }
  }, [emails.length, mailboxAddress, toast])

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
      <ErrorState
        title="Failed to load emails"
        message={queryError instanceof Error ? queryError.message : 'Please try again later'}
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Panel */}
      {emails.length > 0 && <MailboxStats />}

      {/* Search Bar */}
      {emails.length > 0 && (
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            ref={searchInputRef}
            placeholder="Search emails (Ctrl+K)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-20 transition-all focus-visible:ring-primary"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm ? (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearSearch}>
                <X className="h-3 w-3" />
              </Button>
            ) : (
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
              <InboxIcon className="h-5 w-5 text-primary" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Inbox</h2>
            {emails.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchTerm
                  ? `${filteredEmails.length} of ${emails.length} emails`
                  : `${emails.length} ${emails.length === 1 ? 'email' : 'emails'}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isClaimed && mailboxAddress && <ClaimMailboxDialog mailboxAddress={mailboxAddress} />}
          {hasUnreadEmails && emails.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead}
              className="h-9"
            >
              <CheckCheck className={`h-4 w-4 mr-2 ${isMarkingAllRead ? 'animate-pulse' : ''}`} />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-9 px-2.5"
            title="Refresh emails"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && emails.length === 0 && <SkeletonList count={3} />}

      {/* Email List */}
      {!isLoading && emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center ring-1 ring-border">
              <Mail className="h-12 w-12 text-muted-foreground/60" />
            </div>
            <div className="absolute -top-2 -right-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-2">Waiting for emails...</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8 text-sm leading-relaxed">
            Your temporary mailbox is ready! Use this email address to sign up for services, and new
            emails will appear here automatically.
          </p>

          {/* Usage Guide */}
          <div className="w-full max-w-sm bg-muted/30 rounded-xl p-5 border border-border/50">
            <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-semibold">
                ?
              </span>
              How to use your temporary mailbox
            </h4>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {[
                'Copy your email address from the left panel',
                'Paste it on any website that requires email',
                'Return here to check for verification emails',
                'Complete verification and delete the mailbox',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-medium">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : filteredEmails.length > 0 ? (
        <div className="space-y-2">
          {filteredEmails.map((mail: Email) => (
            <MailItem key={mail.id} mail={mail} />
          ))}
        </div>
      ) : searchTerm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            No emails match &quot;<span className="font-medium text-foreground">{searchTerm}</span>
            &quot;
          </p>
          <Button variant="outline" size="sm" onClick={handleClearSearch}>
            Clear search
          </Button>
        </div>
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
