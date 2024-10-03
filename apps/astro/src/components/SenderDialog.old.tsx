import { toast } from '@/hooks/use-toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { actions } from 'astro:actions'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

export interface SenderDialogProps extends React.ComponentProps<'div'> {
  defaultTo?: string
  defaultSubject?: string

}

const SendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  content: z.string(),
  bcc: z.string().optional(),
  cc: z.string().optional(),
  name: z.string(),
})

export default function SenderDialog({ children }: SenderDialogProps) {
  const form = useForm<z.infer<typeof SendEmailSchema>>({
    resolver: zodResolver(SendEmailSchema),
  })

  async function onSubmit(values: z.infer<typeof SendEmailSchema>) {
    const { error } = await actions.sendEmail(values)

    if (error) {
      return toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message,
      })
    }

    toast({
      title: 'OK',
      description: `The email is sent to "${values.to}"`,
    })
  }

  return (
    <Dialog>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent className="min-w-[40%]">
        <DialogHeader>
          <DialogTitle>Send an Email</DialogTitle>
          <DialogDescription>
            Complete the form, and we will send email to your target.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="name..." {...field} />
                  </FormControl>
                  <FormDescription>
                    The name of the sender.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="a email address...." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carbon Copy</FormLabel>
                  <FormControl>
                    <Input placeholder="cc..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bcc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blind Carbon Copy</FormLabel>
                  <FormControl>
                    <Input placeholder="bcc..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="subject..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea placeholder="something...." {...field} />
                  </FormControl>
                  <FormDescription>Support for HTML / Plaintext</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="text-right">Submit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
