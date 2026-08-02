import Prism from 'prismjs'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import '@/styles/prism-theme.css'

interface CodeBlockProps {
  code: string
  language: string
  className?: string
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current)
    }
  }, [code, language])

  return (
    <pre className={cn('overflow-x-auto rounded-lg border border-border bg-muted p-4', className)}>
      <code ref={codeRef} className={`language-${language} text-sm font-mono`}>
        {code}
      </code>
    </pre>
  )
}
