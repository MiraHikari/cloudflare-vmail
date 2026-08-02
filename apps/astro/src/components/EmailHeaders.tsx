import type { LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import {
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Database,
  Mail,
  MessageSquare,
  User,
} from 'lucide-react'
import { Fragment, useState } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/email-utils'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'

interface Address {
  address: string
  name?: string
}

type Header = Record<string, string>

interface EmailHeadersProps {
  email: {
    id?: string
    messageFrom?: string
    messageTo?: string
    headers?: Header[]
    from?: Address
    sender?: Address | null
    replyTo?: Address[] | null
    deliveredTo?: string | null
    returnPath?: string | null
    to?: Address[] | null
    cc?: Address[] | null
    bcc?: Address[] | null
    subject?: string | null
    messageId?: string | null
    inReplyTo?: string | null
    references?: string | null
    date?: string | null
    createdAt?: Date | string | null
    updatedAt?: Date | string | null
    isRead?: boolean
    readAt?: Date | string | null
    priority?: string
  }
}

interface HeaderItem {
  label: string
  value: string
  copyable?: boolean
}

// Helper function to format addresses
function formatAddress(addr: Address | undefined | null): string {
  if (!addr) return 'N/A'
  return addr.name ? `${addr.name} <${addr.address}>` : addr.address
}

export function EmailHeaders({ email }: EmailHeadersProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleCopy = async (text: string, fieldName: string) => {
    const success = await copyToClipboard(text)

    if (success) {
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
      toast('Copied to clipboard', {
        description: `${fieldName} copied successfully`,
      })
    }
  }

  // Primary envelope metadata
  const primaryRows: { label: string; icon: LucideIcon; value: string; copyable: boolean }[] = [
    {
      label: 'From',
      icon: User,
      value: formatAddress(email.from),
      copyable: true,
    },
    {
      label: 'To',
      icon: Mail,
      value: email.messageTo || 'Unknown',
      copyable: true,
    },
    {
      label: 'Subject',
      icon: MessageSquare,
      value: email.subject || '(No subject)',
      copyable: true,
    },
    {
      label: 'Date',
      icon: Calendar,
      value: email.date
        ? format(new Date(email.date), 'PPpp')
        : email.createdAt
          ? format(new Date(email.createdAt), 'PPpp')
          : 'Unknown',
      copyable: false,
    },
  ]

  // Database Metadata
  const metadataHeaders: HeaderItem[] = [
    {
      label: 'Email ID',
      value: email.id || 'N/A',
      copyable: true,
    },
    {
      label: 'Message From',
      value: email.messageFrom || 'N/A',
      copyable: true,
    },
    {
      label: 'Message To',
      value: email.messageTo || 'N/A',
      copyable: true,
    },
    {
      label: 'Priority',
      value: email.priority || 'normal',
      copyable: false,
    },
    {
      label: 'Read Status',
      value: email.isRead ? 'Read' : 'Unread',
      copyable: false,
    },
    {
      label: 'Read At',
      value: email.readAt ? format(new Date(email.readAt), 'PPpp') : 'Not read yet',
      copyable: false,
    },
    {
      label: 'Created At',
      value: email.createdAt ? format(new Date(email.createdAt), 'PPpp') : 'N/A',
      copyable: false,
    },
    {
      label: 'Updated At',
      value: email.updatedAt ? format(new Date(email.updatedAt), 'PPpp') : 'N/A',
      copyable: false,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Message Details</CardTitle>
        <CardAction className="flex items-center gap-1">
          {email.priority && email.priority !== 'normal' && (
            <Badge variant="outline">{email.priority}</Badge>
          )}
          <Badge variant={email.isRead ? 'secondary' : 'default'}>
            {email.isRead ? 'Read' : 'Unread'}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        {primaryRows.map((row, index) => (
          <Fragment key={row.label}>
            {index > 0 && <Separator />}
            <div className="flex items-start gap-3">
              <row.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {row.label}
                </div>
                <div className="mt-1 flex items-start gap-1">
                  <span className="min-w-0 flex-1 break-all text-sm font-medium text-foreground">
                    {row.value}
                  </span>
                  {row.copyable && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleCopy(row.value, row.label)}
                      title={`Copy ${row.label.toLowerCase()}`}
                    >
                      {copiedField === row.label ? <Check className="text-primary" /> : <Copy />}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Fragment>
        ))}
      </CardContent>

      {/* Advanced Options - Collapsible */}
      <CollapsibleSection
        title="Advanced Information"
        expanded={expandedSection === 'metadata'}
        onToggle={() => toggleSection('metadata')}
        icon={<Database className="size-4 text-muted-foreground" />}
      >
        <div className="space-y-2.5">
          {metadataHeaders.map((header) => (
            <HeaderRow
              key={header.label}
              label={header.label}
              value={header.value}
              copyable={header.copyable}
              copied={copiedField === header.label}
              onCopy={() => handleCopy(header.value, header.label)}
            />
          ))}
        </div>
      </CollapsibleSection>

      {/* Raw Headers - Collapsible */}
      {email.headers && email.headers.length > 0 && (
        <CollapsibleSection
          title={`Raw SMTP Headers (${email.headers.length})`}
          expanded={expandedSection === 'raw-headers'}
          onToggle={() => toggleSection('raw-headers')}
        >
          <div className="max-h-80 space-y-1.5 overflow-y-auto font-mono text-xs">
            {email.headers.map((header) => (
              <div key={JSON.stringify(header)}>
                {Object.entries(header).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[7rem_1fr] gap-2 py-0.5 sm:grid-cols-[10rem_1fr]"
                  >
                    <div className="truncate font-medium text-muted-foreground">{key}:</div>
                    <div className="break-all text-foreground">{value}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </Card>
  )
}

interface CollapsibleSectionProps {
  title: string
  expanded: boolean
  onToggle: () => void
  icon?: React.ReactNode
  children: React.ReactNode
}

function CollapsibleSection({
  title,
  expanded,
  onToggle,
  icon,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {title}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && <div className="border-t border-border bg-muted/30 px-4 py-3">{children}</div>}
    </div>
  )
}

interface HeaderRowProps {
  label: string
  value: string
  copyable?: boolean
  copied?: boolean
  onCopy?: () => void
}

function HeaderRow({ label, value, copyable, copied, onCopy }: HeaderRowProps) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-2">
      <div className="pt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex min-w-0 items-start gap-1">
        <div className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{value}</div>
        {copyable && (
          <Button variant="ghost" size="icon-xs" onClick={onCopy} title={`Copy ${label}`}>
            {copied ? <Check className="text-primary" /> : <Copy />}
          </Button>
        )}
      </div>
    </div>
  )
}
