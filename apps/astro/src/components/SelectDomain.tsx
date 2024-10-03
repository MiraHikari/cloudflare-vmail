import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select'

export function SelectDomain({
  domains,
}: { domains: string[] }) {
  return (
    <Select required name="domain">
      <SelectTrigger className="mb-4 bg-secondary focus:ring-blue-500 focus:border-gray-500">
        <SelectValue placeholder="Select a domain for your mailbox" />
      </SelectTrigger>
      <SelectContent>
        {domains.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
