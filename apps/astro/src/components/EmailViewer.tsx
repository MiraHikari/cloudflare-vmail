import { Check, Code2, Copy, FileText, Maximize2, Shield } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { buildRawMime, copyToClipboard, sanitizeHtml } from '@/lib/email-utils'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { ButtonGroup } from './ui/button-group'
import { Card, CardContent, CardFooter, CardHeader } from './ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './ui/empty'

interface EmailViewerProps {
  email: {
    id?: string
    from?: { name?: string; address: string }
    messageTo?: string
    subject?: string | null
    date?: string | null
    messageId?: string
    text?: string | null
    html?: string | null
  }
}

type ViewMode = 'html' | 'text' | 'raw'

export function EmailViewer({ email }: EmailViewerProps) {
  const [mode, setMode] = useState<ViewMode>(() => {
    // Default to text if HTML is not available or prefer text for better reliability
    return email.html ? 'html' : 'text'
  })
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const safeHtml = useMemo(() => {
    if (!email.html) return ''
    return sanitizeHtml(email.html)
  }, [email.html])

  const rawSource = useMemo(() => {
    return buildRawMime(email)
  }, [email])

  // Update iframe content when HTML changes
  useEffect(() => {
    if (mode === 'html' && iframeRef.current && safeHtml) {
      iframeRef.current.srcdoc = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                  line-height: 1.6;
                  color: #1f2937;
                  margin: 0;
                  padding: 1.5rem;
                  background: transparent;
                }
                img {
                  max-width: 100%;
                  height: auto;
                }
                a {
                  color: #3b82f6;
                  text-decoration: underline;
                }
                table {
                  border-collapse: collapse;
                  width: 100%;
                }
                td, th {
                  padding: 8px;
                  text-align: left;
                }
                @media (prefers-color-scheme: dark) {
                  body {
                    color: #e5e7eb;
                  }
                  a {
                    color: #60a5fa;
                  }
                }
              </style>
            </head>
            <body>
              ${safeHtml}
            </body>
          </html>
        `
    }
  }, [mode, safeHtml])

  const handleCopy = async () => {
    let textToCopy = ''

    switch (mode) {
      case 'html':
        textToCopy = email.html || ''
        break
      case 'text':
        textToCopy = email.text || ''
        break
      case 'raw':
        textToCopy = rawSource
        break
    }

    const success = await copyToClipboard(textToCopy)

    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast('Copied to clipboard', {
        description: `${mode.toUpperCase()} content copied successfully`,
      })
    } else {
      toast.error('Copy failed', {
        description: 'Could not copy to clipboard',
      })
    }
  }

  return (
    <div className={cn(isFullscreen && 'fixed inset-0 z-50 overflow-auto bg-background p-4')}>
      <Card>
        {/* Toolbar: segmented view switcher + actions */}
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <ButtonGroup>
            <Button
              type="button"
              variant={mode === 'html' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setMode('html')}
              disabled={!email.html}
            >
              <Shield />
              HTML
            </Button>
            <Button
              type="button"
              variant={mode === 'text' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setMode('text')}
              disabled={!email.text}
            >
              <FileText />
              Text
            </Button>
            <Button
              type="button"
              variant={mode === 'raw' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setMode('raw')}
            >
              <Code2 />
              Raw
            </Button>
          </ButtonGroup>

          <ButtonGroup>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="text-primary" /> : <Copy />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            {mode === 'html' && email.html && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 />
                {isFullscreen ? 'Exit' : 'Fullscreen'}
              </Button>
            )}
          </ButtonGroup>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Sandbox notice for HTML view */}
          {mode === 'html' && email.html && (
            <Alert>
              <Shield />
              <AlertTitle>Secure HTML rendering</AlertTitle>
              <AlertDescription>
                Displayed in a sandboxed iframe. Scripts, forms, and other dangerous content are
                sanitized, and external links open in a new tab.
              </AlertDescription>
            </Alert>
          )}

          {/* Content Display */}
          {mode === 'html' &&
            (email.html ? (
              <iframe
                ref={iframeRef}
                title="Email HTML Content"
                sandbox="allow-same-origin allow-popups"
                className="min-h-[500px] w-full rounded-md border border-border bg-card"
                style={{ height: isFullscreen ? 'calc(100vh - 220px)' : '600px' }}
              />
            ) : (
              <Empty className="min-h-[280px]">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Shield />
                  </EmptyMedia>
                  <EmptyTitle>No HTML content</EmptyTitle>
                  <EmptyDescription>
                    This email has no HTML part. Try the plain text view instead.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ))}

          {mode === 'text' &&
            (email.text ? (
              <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground">
                {email.text}
              </pre>
            ) : (
              <Empty className="min-h-[280px]">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText />
                  </EmptyMedia>
                  <EmptyTitle>No plain text content</EmptyTitle>
                  <EmptyDescription>
                    This email has no text part. Try the HTML view instead.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ))}

          {mode === 'raw' && (
            <pre className="max-h-[600px] overflow-auto whitespace-pre rounded-md border border-border bg-muted/50 p-4 font-mono text-xs text-foreground">
              {rawSource}
            </pre>
          )}
        </CardContent>

        {/* Footer Stats */}
        <CardFooter className="justify-between text-xs text-muted-foreground">
          <span>
            {mode === 'html' && email.html && `HTML · ${(email.html.length / 1024).toFixed(2)} KB`}
            {mode === 'text' && email.text && `Text · ${(email.text.length / 1024).toFixed(2)} KB`}
            {mode === 'raw' && `Raw MIME · ${(rawSource.length / 1024).toFixed(2)} KB`}
          </span>
          <span className="uppercase">{mode} view</span>
        </CardFooter>
      </Card>
    </div>
  )
}
