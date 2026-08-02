import { actions } from 'astro:actions'
import { navigate } from 'astro:transitions/client'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'

export default function ExitButton() {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await actions.exit()
        return toast('Exited', {
          description: 'Please reload page to update the state.',
          action: {
            label: 'Reload Page',
            onClick: () => navigate('/'),
          },
        })
      }}
      className="w-full"
    >
      <LogOut aria-hidden="true" />
      Exit
    </Button>
  )
}
