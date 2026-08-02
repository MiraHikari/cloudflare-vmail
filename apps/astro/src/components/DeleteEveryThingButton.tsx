import { actions } from 'astro:actions'
import { navigate } from 'astro:transitions/client'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog'
import { Button } from './ui/button'

export default function DeleteEveryThingButton({ isDisabled }: { isDisabled: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isDisabled} className="w-full">
          <Trash2 aria-hidden="true" />
          Delete All Emails
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete all emails?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete every email in this mailbox. The data cannot be recovered.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              const { error } = await actions.deleteAllEmailsByMessageTo()

              if (error) {
                return toast.error('Uh oh! Something went wrong.', {
                  description: error.message,
                })
              }

              return toast('Deleted', {
                description: 'All data deleted',
                action: {
                  label: 'Reload Page',
                  onClick: () => navigate('/'),
                },
              })
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
