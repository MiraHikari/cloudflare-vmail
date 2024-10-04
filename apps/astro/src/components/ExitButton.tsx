import { useToast } from '@/hooks/use-toast'
import { actions } from 'astro:actions'
import { navigate } from 'astro:transitions/client'
import { Button } from './ui/button'
import { ToastAction } from './ui/toast'

export default function ExitButton() {
  const { toast } = useToast()

  return (
    <Button
      variant="default"
      onClick={async () => {
        await actions.exit()
        return toast({
          title: 'Exited',
          description: `Please reload page to update the state.`,
          action: (
            <ToastAction altText="Reload page to exit" onClick={() => navigate('/')}>Reload Page</ToastAction>
          ),
        })
      }}
      className="py-2.5 rounded-md w-full hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-500max-w-[300px]"
    >
      Exit
    </Button>
  )
}
