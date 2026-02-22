'use client'
import { motion } from 'framer-motion'
import { Code, FileText, Github, Home, Info, Moon, Shield, Sun } from 'lucide-react'
import React from 'react'
import { cn } from '@/lib/utils'

export function Dock() {
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>('light')
  const [activeHref, setActiveHref] = React.useState<string>('')

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setTheme(isDarkMode ? 'dark' : 'light')
    setActiveHref(window.location.pathname)

    // Update active href on navigation
    const handleNavigation = () => {
      setActiveHref(window.location.pathname)
    }

    document.addEventListener('astro:page-load', handleNavigation)
    return () => document.removeEventListener('astro:page-load', handleNavigation)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.classList[newTheme === 'dark' ? 'add' : 'remove']('dark')
    localStorage.setItem('theme', newTheme)
  }

  const dockItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'API Docs', href: '/docs/api-docs', icon: Code },
    { label: 'About', href: '/docs/about', icon: Info },
    { label: 'Privacy', href: '/docs/privacy', icon: Shield },
    { label: 'Terms', href: '/docs/terms', icon: FileText },
    {
      label: 'GitHub',
      href: 'https://github.com/MiraHikari/cloudflare-vmail',
      icon: Github,
      external: true,
    },
  ]

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex items-center gap-1 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl px-3 py-3 shadow-lg"
      >
        {/* Navigation Items */}
        <div className="flex items-center gap-1">
          {dockItems.map((item) => (
            <DockItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              external={item.external}
              isActive={activeHref === item.href}
            />
          ))}
        </div>

        {/* Theme Toggle */}
        <div className="ml-1 pl-3 border-l border-border/50">
          <motion.button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            title="Toggle theme"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

interface DockItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  external?: boolean
  isActive?: boolean
}

function DockItem({ href, icon: Icon, label, external, isActive }: DockItemProps) {
  const [showTooltip, setShowTooltip] = React.useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <motion.a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={cn(
          'flex items-center justify-center p-2.5 rounded-xl transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )}
        title={label}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Icon className="h-5 w-5" />
      </motion.a>

      {/* Tooltip */}
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.15 }}
          className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none"
        >
          {label}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
        </motion.div>
      )}
    </div>
  )
}
