import { Icon } from '@iconify/react'
import { actions } from 'astro:actions'
import { navigate } from 'astro:transitions/client'
import { useState } from 'react'
import { Button } from './ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer'
import { Input } from './ui/input'
import { toast } from "sonner"

export default function PasswordDrawer() {
  const [id, setId] = useState('')

  return (
    <Drawer>
      <DrawerTrigger className="mt-4 text-sm text-cyan-600 cursor-pointer">
        <span><Icon icon="ph:password-bold" className="h-6 w-6 text-cyan-600 mx-3 inline-block"></Icon></span>
        Retrieve mailbox using Email ID
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Retrieve Mailbox by ID</DrawerTitle>
            <DrawerDescription>
              Enter your Email ID to retrieve your previously generated mailbox.
              {' '}
              <span className="text-destructive">Without this ID, you cannot access your generated email account again!</span>
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <Input required type="text" className="py-2.5 border-border rounded-md w-full hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-500max-w-[300px]" value={id} onChange={e => setId(e.target.value)} placeholder="Email ID" />
          </div>
          <DrawerFooter>
            <Button onClick={async () => {
              const { error, data } = await actions.getMailboxOfEmail({
                id,
              })

              if (error) {
                return toast.error('Uh oh! Something went wrong.', {
                  description: error.message,
                })
              }

              return toast.success(`Your email account has been recovered: ${data}`, {
                action: (
                  <Button variant="outline" onClick={() => navigate('/')}>Reload Page</Button>
                ),
              })
            }}
            >
              Retrieve

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
