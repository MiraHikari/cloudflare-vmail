import { Cross2Icon } from '@radix-ui/react-icons'
import * as React from 'react'
import { cn } from '@/lib/utils'

function Grid({
  cellSize = 12,
  strokeWidth = 1,
  patternOffset = [0, 0],
  className,
}: {
  cellSize?: number
  strokeWidth?: number
  patternOffset?: [number, number]
  className?: string
}) {
  const id = React.useId()

  return (
    <svg
      className={cn('pointer-events-none absolute inset-0 text-muted-foreground/10', className)}
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id={`grid-${id}`}
          x={patternOffset[0] - 1}
          y={patternOffset[1] - 1}
          width={cellSize}
          height={cellSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect fill={`url(#grid-${id})`} width="100%" height="100%" />
    </svg>
  )
}

interface BannerProps {
  show: boolean
  onHide: () => void
  icon?: React.ReactNode
  title: React.ReactNode
  action: {
    label: string
    onClick: () => void
  }
  learnMoreUrl?: string
  variant?: 'default' | 'warning' | 'destructive'
}

export function Banner({
  show,
  onHide,
  icon,
  title,
  action,
  learnMoreUrl: _learnMoreUrl,
  variant = 'default',
}: BannerProps) {
  if (!show) return null

  const variants = {
    default: {
      container: 'border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10',
      iconContainer: 'border-primary/30 bg-background/80',
      text: 'text-foreground',
      link: 'text-muted-foreground hover:text-foreground',
      button: 'border-primary/30 text-foreground hover:bg-primary/10',
      closeButton: 'text-muted-foreground hover:text-foreground',
      grid: 'text-muted-foreground/20',
    },
    warning: {
      container:
        'border-amber-500/20 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 dark:from-amber-950/20 dark:to-yellow-950/20',
      iconContainer: 'border-amber-500/30 bg-background/80',
      text: 'text-foreground',
      link: 'text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300',
      button:
        'border-amber-500/30 text-amber-800 hover:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20',
      closeButton:
        'text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300',
      grid: 'text-amber-500/20',
    },
    destructive: {
      container: 'border-destructive/20 bg-gradient-to-r from-destructive/5 to-destructive/10',
      iconContainer: 'border-destructive/30 bg-background/80',
      text: 'text-foreground',
      link: 'text-destructive hover:text-destructive/80',
      button: 'border-destructive/30 text-destructive hover:bg-destructive/10',
      closeButton: 'text-destructive hover:text-destructive/80',
      grid: 'text-destructive/20',
    },
  }

  const variantStyles = variants[variant]

  return (
    <div
      className={cn(
        'relative isolate flex flex-col justify-between gap-3 overflow-hidden rounded-lg border py-3 pl-4 pr-12 sm:flex-row sm:items-center sm:py-2',
        variantStyles.container
      )}
    >
      <Grid
        cellSize={13}
        patternOffset={[0, -1]}
        className={cn(
          'mix-blend-overlay [mask-image:linear-gradient(to_right,black,transparent)] md:[mask-image:linear-gradient(to_right,black_60%,transparent)]',
          variantStyles.grid
        )}
      />

      <div className="flex items-center gap-3">
        {icon && (
          <div
            className={cn(
              'hidden rounded-full border p-1 shadow-sm sm:block',
              variantStyles.iconContainer
            )}
          >
            {icon}
          </div>
        )}
        <p className={cn('text-sm', variantStyles.text)}>{title}</p>
      </div>

      <div className="flex items-center sm:-my-1">
        <button
          type="button"
          className={cn(
            'whitespace-nowrap rounded-md border px-3 py-1 text-sm transition-colors',
            variantStyles.button
          )}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      </div>

      <button
        type="button"
        className={cn(
          'absolute inset-y-0 right-2.5 p-1 text-sm transition-colors',
          variantStyles.closeButton
        )}
        onClick={onHide}
      >
        <Cross2Icon className="h-[18px] w-[18px]" />
      </button>
    </div>
  )
}
