import { actions } from 'astro:actions'
import { AlertCircle, Lock, Shield } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface ClaimMailboxDialogProps {
  mailboxAddress: string
}

export function ClaimMailboxDialog({ mailboxAddress }: ClaimMailboxDialogProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClaim = async () => {
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error: claimError } = await actions.claimMailbox({
        address: mailboxAddress,
        password,
      })

      if (claimError) {
        setError(claimError.message)
      } else {
        setOpen(false)
        window.location.reload()
      }
    } catch {
      setError('Failed to claim mailbox. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="h-4 w-4 mr-2" />
          Claim This Mailbox
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Your Mailbox</DialogTitle>
          <DialogDescription>
            Set a password to claim this mailbox and access it anytime. Your mailbox will be
            protected and accessible for 30 days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mailbox">Mailbox Address</Label>
            <Input id="mailbox" value={mailboxAddress} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Once claimed, this mailbox will require your password to access. Make sure to remember
              it!
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleClaim} disabled={loading}>
            {loading ? 'Claiming...' : 'Claim Mailbox'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
