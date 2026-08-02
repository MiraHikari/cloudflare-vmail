import { Check, Copy, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'

interface OTPDisplayProps {
  codes: string[]
}

export function OTPDisplay({ codes }: OTPDisplayProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const uniqueCodes = [...new Set(codes)]

  if (codes.length === 0) return null

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
      toast.success('Verification code copied', {
        description: code,
      })
    } catch {
      toast.error('Failed to copy code', {
        description: 'Please copy it manually',
      })
    }
  }

  return (
    <Card size="sm" className="mb-4 bg-primary/[0.04] ring-primary/20">
      <CardContent className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <KeyRound className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-sm font-medium">Verification code detected</h3>

          <div className="mt-2 flex flex-wrap gap-2">
            {uniqueCodes.map((code) => (
              <Badge
                key={code}
                asChild
                variant="outline"
                className="h-auto cursor-pointer gap-2 border-primary/30 bg-card px-3 py-1.5 font-mono text-base font-semibold tracking-widest hover:bg-primary/10"
              >
                <button
                  type="button"
                  onClick={() => copyCode(code)}
                  aria-label={`Copy verification code ${code}`}
                >
                  {code}
                  {copiedCode === code ? (
                    <Check aria-hidden="true" className="size-4 text-primary" />
                  ) : (
                    <Copy aria-hidden="true" className="size-3.5 text-muted-foreground" />
                  )}
                </button>
              </Badge>
            ))}
          </div>

          <p className="mt-2 text-xs text-muted-foreground">Click a code to copy it</p>
        </div>
      </CardContent>
    </Card>
  )
}
