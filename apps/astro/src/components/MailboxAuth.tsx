import { actions } from 'astro:actions'
import { KeyRound, Lock, LogIn, Mail } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'

export function MailboxAuth() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: loginError } = await actions.loginMailbox({
        address: email,
        password,
      })

      if (loginError) {
        setError(loginError.message)
      } else {
        // Success - reload page
        window.location.href = '/'
      }
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      // Reset form when closing
      setEmail('')
      setPassword('')
      setError('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Have a Claimed Mailbox?</h3>
          <p className="text-sm text-muted-foreground">
            Access your protected mailbox with your password
          </p>
        </div>

        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">
            <LogIn className="h-4 w-4 mr-2" />
            Login to Mailbox
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Login to Mailbox</DialogTitle>
          <DialogDescription className="text-center">
            Enter your claimed mailbox credentials to access your emails
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
