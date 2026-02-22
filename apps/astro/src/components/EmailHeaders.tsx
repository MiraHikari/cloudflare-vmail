import { format } from 'date-fns'
import { Check, ChevronDown, ChevronUp, Copy, Database } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { copyToClipboard } from '@/lib/email-utils'
import { Button } from './ui/button'

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
  const { toast } = useToast()

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleCopy = async (text: string, fieldName: string) => {
    const success = await copyToClipboard(text)

    if (success) {
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
      toast({
        title: 'Copied to clipboard',
        description: `${fieldName} copied successfully`,
      })
    }
  }

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
    <div className="space-y-4">
      {/* Modern Card-based Primary Headers */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          {/* From Section */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                From
              </div>
              <div className="flex items-center gap-2">
                <div className="text-base font-semibold text-foreground break-all flex-1">
                  {formatAddress(email.from)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 hover:bg-primary/10"
                  onClick={() => handleCopy(formatAddress(email.from), 'From')}
                  title="Copy sender address"
                >
                  {copiedField === 'From' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* To Section */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                To
              </div>
              <div className="flex items-center gap-2">
                <div className="text-base font-semibold text-foreground break-all flex-1">
                  {email.messageTo || 'Unknown'}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 hover:bg-blue-500/10"
                  onClick={() => handleCopy(email.messageTo || 'Unknown', 'To')}
                  title="Copy recipient address"
                >
                  {copiedField === 'To' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Subject Section */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Subject
              </div>
              <div className="flex items-center gap-2">
                <div className="text-base font-semibold text-foreground break-all flex-1">
                  {email.subject || '(No subject)'}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 hover:bg-purple-500/10"
                  onClick={() => handleCopy(email.subject || '(No subject)', 'Subject')}
                  title="Copy subject"
                >
                  {copiedField === 'Subject' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Date Section */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Date
              </div>
              <div className="text-base font-medium text-foreground">
                {email.date
                  ? format(new Date(email.date), 'PPpp')
                  : email.createdAt
                    ? format(new Date(email.createdAt), 'PPpp')
                    : 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Options - Collapsible */}
      <div className="bg-muted/20 rounded-lg border border-border overflow-hidden">
        <CollapsibleSection
          title="Advanced Information"
          sectionId="metadata"
          expanded={expandedSection === 'metadata'}
          onToggle={() => toggleSection('metadata')}
          icon={<Database className="h-4 w-4 text-muted-foreground" />}
        >
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
        </CollapsibleSection>

        {/* Raw Headers - Collapsible */}
        {email.headers && email.headers.length > 0 && (
          <CollapsibleSection
            title={`Raw SMTP Headers (${email.headers.length})`}
            sectionId="raw-headers"
            expanded={expandedSection === 'raw-headers'}
            onToggle={() => toggleSection('raw-headers')}
          >
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {email.headers.map((header, index) => (
                <div key={index} className="text-xs font-mono">
                  {Object.entries(header).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[150px_1fr] gap-2 py-1">
                      <div className="text-muted-foreground font-semibold truncate">{key}:</div>
                      <div className="text-foreground break-all">{value}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  )
}

interface CollapsibleSectionProps {
  title: string
  sectionId: string
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
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border bg-muted/20">
          <div className="pt-3 space-y-3">{children}</div>
        </div>
      )}
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
    <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="flex items-start gap-2 min-w-0">
        <div className="text-sm text-foreground break-all flex-1 font-mono">{value}</div>
        {copyable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={onCopy}
            title={`Copy ${label}`}
          >
            {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  )
}
