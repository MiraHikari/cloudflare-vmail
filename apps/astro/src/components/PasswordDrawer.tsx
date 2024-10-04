import { useToast } from '@/hooks/use-toast'
import { Icon } from '@iconify/react'
import { actions } from 'astro:actions'
import { navigate } from 'astro:transitions/client'
import { useState } from 'react'
import { Button } from './ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer'
import { Input } from './ui/input'
import { ToastAction } from './ui/toast'

export default function PasswordDrawer() {
  const [id, setId] = useState('')
  const { toast } = useToast()

  return (
    <Drawer>
      <DrawerTrigger className="mt-4 text-sm text-cyan-600 cursor-pointer">
        <span><Icon icon="ph:password-bold" className="h-6 w-6 text-cyan-600 mx-3 inline-block"></Icon></span>
        Log in a existing mailbox by a email id
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Log in by ID</DrawerTitle>
            <DrawerDescription>
              Please save one of your known email IDs to retrieve your email account.
              {' '}
              <span className="text-destructive">If the ID is lost, you will not be able to use the previously generated email account again!</span>
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <Input required type="text" className="py-2.5 border-border rounded-md w-full hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-500max-w-[300px]" value={id} onChange={e => setId(e.target.value)} placeholder="Email ID" />
          </div>
          <DrawerFooter>
            <Button onClick={async () => {
              const { error, data } = await actions.getEmailByIdOfAEmail({
                id,
              })

              if (error) {
                return toast({
                  variant: 'destructive',
                  title: 'Uh oh! Something went wrong.',
                  description: error.message,
                })
              }

              return toast({
                title: 'Logged in',
                description: `You can now use the email account: ${data}`,
                action: (
                  <ToastAction altText="Reload page to receive emails" onClick={() => navigate('/')}>Reload Page</ToastAction>
                ),
              })
            }}
            >
              Submit

            </Button>
            <DrawerClose>
              <Button variant="outline" className="w-full">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
