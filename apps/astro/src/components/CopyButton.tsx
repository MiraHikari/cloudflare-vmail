import type { ButtonHTMLAttributes, DetailedHTMLProps } from 'react'
import { Icon } from '@iconify/react'
import { useState } from 'react'
import { Button } from './ui/button'

interface CopyButtonProps
  extends DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> {
  content: string
}

export default function CopyButton({ content, ...props }: CopyButtonProps) {
  const [status, setStatus] = useState<keyof typeof icons>('idle')

  const icons = {
    idle: <Icon icon="ph:copy" className="h-4 w-4" />,
    error: <Icon icon="mdi:exclamation" className="h-4 w-4 text-red-500" />,
    success: <Icon icon="mdi:check" className="h-4 w-4 text-green-500" />,
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
      return
    }

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content)
        setStatus('success')
        setTimeout(() => setStatus('idle'), 2000)
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
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (successful) {
          setStatus('success')
        } else {
          setStatus('error')
        }
      } catch (err) {
        document.body.removeChild(textArea)
        throw err
      }
    } catch {
      setStatus('error')
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
      className={`transition-all ${status === 'success' ? 'bg-green-500/10' : status === 'error' ? 'bg-red-500/10' : ''} ${props.className || ''}`}
    >
      {icons[status]}
    </Button>
  )
}
