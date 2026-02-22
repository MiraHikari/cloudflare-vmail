import { Check, Code2, Copy, FileText, Maximize2, Shield } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { buildRawMime, copyToClipboard, sanitizeHtml } from '@/lib/email-utils'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

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
  const { toast } = useToast()

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
      const iframe = iframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(`
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
        `)
        iframeDoc.close()
      }
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
      toast({
        title: 'Copied to clipboard',
        description: `${mode.toUpperCase()} content copied successfully`,
      })
    } else {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  return (
    <div
      className={cn(
        'space-y-4',
        isFullscreen && 'fixed inset-0 z-50 bg-background p-6 overflow-auto'
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-muted/30 rounded-lg p-3 border border-border">
        {/* Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={mode === 'html' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('html')}
            disabled={!email.html}
            className="transition-all"
          >
            <Shield className="h-4 w-4 mr-2" />
            HTML View
          </Button>
          <Button
            variant={mode === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('text')}
            disabled={!email.text}
            className="transition-all"
          >
            <FileText className="h-4 w-4 mr-2" />
            Text View
          </Button>
          <Button
            variant={mode === 'raw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('raw')}
            className="transition-all"
          >
            <Code2 className="h-4 w-4 mr-2" />
            Raw MIME
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="transition-all">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>

          {mode === 'html' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="transition-all"
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      {mode === 'html' && email.html && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Secure HTML Rendering
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-xs">
                Email is displayed in a sandboxed iframe. All scripts, forms, and potentially
                dangerous content have been sanitized. External links open in new tabs.
              </p>
            </div>
          </div>
        </div>
      )}

      {mode === 'text' && email.text && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Plain Text View
              </p>
              <p className="text-green-700 dark:text-green-300 text-xs">
                Viewing the plain text version - most reliable for extracting codes and reading
                content without formatting.
              </p>
            </div>
          </div>
        </div>
      )}

      {mode === 'raw' && (
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Code2 className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                Raw MIME Source
              </p>
              <p className="text-purple-700 dark:text-purple-300 text-xs">
                Viewing the reconstructed MIME source - useful for debugging email delivery issues
                and exporting.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Display */}
      <div
        className={cn(
          'rounded-lg border-2 border-border overflow-hidden transition-all shadow-sm',
          'bg-card'
        )}
      >
        {mode === 'html' && email.html ? (
          <iframe
            ref={iframeRef}
            title="Email HTML Content"
            sandbox="allow-same-origin allow-popups"
            className="w-full min-h-[500px] bg-white dark:bg-gray-900"
            style={{ height: isFullscreen ? 'calc(100vh - 300px)' : '600px' }}
          />
        ) : mode === 'html' && !email.html ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No HTML content available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try viewing the plain text version instead
            </p>
          </div>
        ) : null}

        {mode === 'text' && email.text ? (
          <pre className="whitespace-pre-wrap text-sm p-6 font-mono leading-relaxed text-foreground overflow-auto max-h-[600px]">
            {email.text}
          </pre>
        ) : mode === 'text' && !email.text ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No plain text content available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try viewing the HTML version instead
            </p>
          </div>
        ) : null}

        {mode === 'raw' && (
          <div className="relative">
            <pre className="whitespace-pre text-xs p-6 font-mono bg-muted/50 overflow-auto max-h-[600px] text-foreground">
              {rawSource}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 border border-border">
        <div className="flex items-center gap-4">
          {mode === 'html' && email.html && (
            <span>HTML: {(email.html.length / 1024).toFixed(2)} KB</span>
          )}
          {mode === 'text' && email.text && (
            <span>Text: {(email.text.length / 1024).toFixed(2)} KB</span>
          )}
          {mode === 'raw' && <span>Raw: {(rawSource.length / 1024).toFixed(2)} KB</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Content loaded</span>
        </div>
      </div>
    </div>
  )
}
