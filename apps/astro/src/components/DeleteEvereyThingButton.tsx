import { toast } from '@/hooks/use-toast'
import { actions } from 'astro:actions'
import { navigate } from 'astro:transitions/client'
import { Button } from './ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer'

export default function DeleteEveryThingButton() {
  return (
    <Drawer>
      <DrawerTrigger className="w-full">
        <Button
          variant="destructive"
          className="mt-4 py-2.5 rounded-md w-full hover:opacity-90 disabled:cursor-not-allowed"
        >
          Delete All Emails
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>
              Are you sure
              <span className="text-destructive"> to delete all emails?</span>
            </DrawerTitle>
            <DrawerDescription>
              The datas cannot
              <span className="text-destructive"> be recovered</span>
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button onClick={async () => {
              const { error } = await actions.deleteAllEmailsByMessageTo()

              if (error) {
                return toast({
                  variant: 'destructive',
                  title: 'Uh oh! Something went wrong.',
                  description: error.message,
                })
              }

              toast({
                title: 'Deleted',
                description: `All datas deleted`,
              })

              navigate('/')
            }}
            >
              Confirm

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
