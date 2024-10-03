import { actions } from 'astro:actions'
import { navigate } from 'astro:transitions/client'
import { Button } from './ui/button'

export default function ExitButton() {
  return (
    <Button
      variant="default"
      onClick={async () => {
        await actions.exit()
        navigate('/')
      }}
      className="py-2.5 rounded-md w-full hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-500max-w-[300px]"
    >
      Exit
    </Button>
  )
}
