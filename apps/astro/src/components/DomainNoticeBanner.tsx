import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'

const STORAGE_KEY = 'domain-notice-dismissed-v1'

export function DomainNoticeBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check if user has dismissed this notice
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true)
    }
  }, [])

  const handleHide = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setShow(false)
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
    <Alert>
      <AlertTriangle />
      <AlertTitle>Service Notice</AlertTitle>
      <AlertDescription className="col-start-2">
        <p>Some domains are no longer in service. Please use other available domains.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleViewDomains}>
            View Available Domains
          </Button>
          <a href="/docs/about">Learn more</a>
        </div>
      </AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="icon-xs" onClick={handleHide} aria-label="Dismiss notice">
          <X />
        </Button>
      </AlertAction>
    </Alert>
  )
}
