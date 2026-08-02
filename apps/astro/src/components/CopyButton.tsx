import type { ButtonHTMLAttributes, DetailedHTMLProps } from 'react'
import { Check, Copy, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

interface CopyButtonProps extends DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> {
  content: string
}

export default function CopyButton({ content, className, ...props }: CopyButtonProps) {
  const [status, setStatus] = useState<keyof typeof icons>('idle')

  const icons = {
    idle: <Copy className="size-4" />,
    error: <TriangleAlert className="size-4 text-destructive" />,
    success: <Check className="size-4 text-primary" />,
  }

  const tooltips = {
    idle: 'Copy to clipboard',
    error: 'Failed to copy',
    success: 'Copied!',
  }

  async function copy() {
    // Validate content
    if (!content || typeof content !== 'string') {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
      toast.error('Failed to copy', {
        description: 'Nothing to copy',
      })
      return
    }

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content)
        setStatus('success')
        setTimeout(() => setStatus('idle'), 2000)
        toast.success('Copied to clipboard')
        return
      }

      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea')
      textArea.value = content
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      textArea.setAttribute('aria-hidden', 'true')
      document.body.appendChild(textArea)

      try {
        textArea.focus()
        textArea.select()
        // `execCommand` remains the fallback for insecure contexts and older browsers.
        const legacyDocument = document as unknown as {
          execCommand: (commandId: string) => boolean
        }
        const successful = legacyDocument.execCommand('copy')
        document.body.removeChild(textArea)

        if (successful) {
          setStatus('success')
          toast.success('Copied to clipboard')
        } else {
          setStatus('error')
          toast.error('Failed to copy', {
            description: 'Please copy it manually',
          })
        }
      } catch (err) {
        document.body.removeChild(textArea)
        throw err
      }
    } catch {
      setStatus('error')
      toast.error('Failed to copy', {
        description: 'Please copy it manually',
      })
    } finally {
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      {...props}
      onClick={copy}
      title={tooltips[status]}
      className={cn(
        'transition-colors',
        status === 'success' && 'bg-primary/10',
        status === 'error' && 'bg-destructive/10',
        className
      )}
    >
      {icons[status]}
    </Button>
  )
}
