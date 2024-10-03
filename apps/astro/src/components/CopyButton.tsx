import { Icon } from '@iconify/react'
import { type ButtonHTMLAttributes, type DetailedHTMLProps, useState } from 'react'
import { Button } from './ui/button'

interface CopyButtonProps
  extends DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {
  content: string
}

export default function CopyButton({ content, ...props }: CopyButtonProps) {
  const [status, setStatus] = useState<keyof typeof icons>('idle')

  const icons = {
    idle: <Icon icon="ph:copy" className="" />,
    error: <Icon icon="mdi:exclamation" className="text-red-500" />,
    success: <Icon icon="mdi:check" className="text-green-500" />,
  }

  function copy() {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(content)
        .then(() => setStatus('success'))
        .catch(() => setStatus('error'))
        .finally(() => setTimeout(() => setStatus('idle'), 1000))
    }
    else {
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  return (
    <Button variant="ghost" {...props} onClick={copy}>
      {icons[status]}
    </Button>
  )
}
