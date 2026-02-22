import { useState } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface SelectDomainProps {
  domains: string[]
  name?: string
}

export function SelectDomain({ domains, name = 'domain' }: SelectDomainProps) {
  const [selected, setSelected] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  if (!domains || domains.length === 0) {
    return (
      <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-sm text-destructive">
        No domains available. Please contact support.
      </div>
    )
  }

  // If only one domain, show it as read-only
  if (domains.length === 1) {
    return (
      <div className="relative">
        <input type="hidden" name={name} value={domains[0]} />
        <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50 text-sm">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{domains[0]}</span>
          <span className="text-xs text-muted-foreground ml-auto">(only available)</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected} />
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn('w-full justify-between h-10 px-3', !selected && 'text-muted-foreground')}
          >
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0" />
              <span className="truncate">{selected || 'Select a domain for your mailbox'}</span>
            </span>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
          {domains.map((domain) => (
            <DropdownMenuItem
              key={domain}
              onClick={() => setSelected(domain)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                {domain}
              </span>
              {selected === domain && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {!selected && (
        <p className="text-xs text-muted-foreground mt-1.5">Please select a domain to continue</p>
      )}
    </div>
  )
}
