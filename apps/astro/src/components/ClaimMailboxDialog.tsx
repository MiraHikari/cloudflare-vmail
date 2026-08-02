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
import { Field, FieldDescription, FieldGroup, FieldLabel } from './ui/field'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'

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

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
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
          <Shield />
          Claim mailbox
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

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="mailbox">Mailbox Address</FieldLabel>
            <Input id="mailbox" value={mailboxAddress} disabled />
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldDescription>Must be at least 8 characters long.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
        </FieldGroup>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert>
          <Lock />
          <AlertDescription>
            Once claimed, this mailbox will require your password to access. Make sure to remember
            it!
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleClaim} disabled={loading}>
            {loading && <Spinner />}
            {loading ? 'Claiming...' : 'Claim Mailbox'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
