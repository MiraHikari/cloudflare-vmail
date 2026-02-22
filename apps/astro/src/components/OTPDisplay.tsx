import { Check, Copy, Key } from 'lucide-react'
import { useState } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface OTPDisplayProps {
  codes: string[]
}

export function OTPDisplay({ codes }: OTPDisplayProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  if (codes.length === 0) return null

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
          <Key className="h-5 w-5 text-amber-600 dark:text-amber-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
            Verification Code Detected
          </h3>

          <div className="flex flex-wrap gap-2">
            {codes.map((code, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white dark:bg-amber-950/50 rounded-lg p-2 border border-amber-200 dark:border-amber-800"
              >
                <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                  {code}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => copyCode(code)}
                >
                  {copiedCode === code ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
            Click to copy the verification code
          </p>
        </div>
      </div>
    </div>
  )
}
