import { Check, ChevronDown, Globe } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from './ui/alert'
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
      <Alert variant="destructive">
        <AlertDescription>No domains available. Please contact support.</AlertDescription>
      </Alert>
    )
  }

  // If only one domain, show it as read-only
  if (domains.length === 1) {
    return (
      <div className="relative">
        <input type="hidden" name={name} value={domains[0]} />
        <div className="flex h-8 items-center gap-2 border border-input bg-muted/50 px-2.5 text-xs">
          <Globe className="size-4 text-muted-foreground" />
          <span className="font-medium">{domains[0]}</span>
          <span className="ml-auto text-muted-foreground">(only available)</span>
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
            className={cn('w-full justify-between', !selected && 'text-muted-foreground')}
          >
            <span className="flex items-center gap-2">
              <Globe className="shrink-0" />
              <span className="truncate">{selected || 'Select a domain for your mailbox'}</span>
            </span>
            <ChevronDown className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')} />
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
                <Globe className="size-3.5 text-muted-foreground" />
                {domain}
              </span>
              {selected === domain && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {!selected && (
        <p className="mt-1.5 text-xs text-muted-foreground">Please select a domain to continue</p>
      )}
    </div>
  )
}
