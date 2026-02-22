import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './ui/button'

const STORAGE_KEY = 'domain-notice-dismissed-v1'

export function DomainNoticeBanner() {
  const [show, setShow] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has dismissed this notice
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      setShow(true)
      // Trigger animation after mount
      requestAnimationFrame(() => setIsVisible(true))
    }
  }, [])

  const handleHide = () => {
    setIsVisible(false)
    // Wait for animation to complete before unmounting
    setTimeout(() => {
      setShow(false)
      localStorage.setItem(STORAGE_KEY, 'true')
    }, 300)
  }

  const handleViewDomains = () => {
    const mailboxForm = document.querySelector('[data-mailbox-form]')
    if (mailboxForm) {
      mailboxForm.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Highlight the form briefly
      mailboxForm.classList.add('ring-2', 'ring-primary', 'ring-offset-2')
      setTimeout(() => {
        mailboxForm.classList.remove('ring-2', 'ring-primary', 'ring-offset-2')
      }, 2000)
    }
  }

  if (!show) return null

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 
        dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/20
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Service Notice
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200/80 leading-relaxed">
              Some domains are no longer in service. Please use other available domains.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDomains}
                className="h-8 bg-white/50 dark:bg-black/20 border-amber-200 dark:border-amber-800 hover:bg-white dark:hover:bg-black/30"
              >
                View Available Domains
              </Button>
              <a
                href="/about"
                className="text-sm text-amber-700 dark:text-amber-300 hover:underline"
              >
                Learn more
              </a>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleHide}
            className="flex-shrink-0 h-8 w-8 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar for auto-dismiss (optional visual indicator) */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-200 dark:bg-amber-800">
        <div
          className="h-full bg-amber-400 dark:bg-amber-600 animate-[shrink_10s_linear_forwards]"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}
