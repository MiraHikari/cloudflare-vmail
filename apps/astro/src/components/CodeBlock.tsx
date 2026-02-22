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
    <pre
      className={cn(
        'bg-[#1e1e1e] dark:bg-[#0d1117] border border-border rounded-lg p-4 overflow-x-auto',
        className
      )}
    >
      <code ref={codeRef} className={`language-${language} text-sm font-mono`}>
        {code}
      </code>
    </pre>
  )
}
