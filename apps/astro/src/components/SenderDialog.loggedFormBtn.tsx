import SenderDialog from './SenderDialog'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

function LoggedFormBtn() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" className="py-2.5 mt-4 rounded-md hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-500max-w-[300px]">Send an email</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>WIP... It's not work now.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default LoggedFormBtn
