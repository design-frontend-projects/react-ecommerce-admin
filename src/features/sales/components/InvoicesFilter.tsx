import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

interface InvoicesFilterProps {
  search: string
  onSearchChange: (value: string) => void
  status?: string
  onStatusChange: (value: string | undefined) => void
}

export function InvoicesFilter({ search, onSearchChange, status, onStatusChange }: InvoicesFilterProps) {
  const [localSearch, setLocalSearch] = useState(search)

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearchChange(localSearch)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, onSearchChange])

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by invoice number..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <div className="w-[180px]">
        <Select 
          value={status || "all"} 
          onValueChange={(val) => onStatusChange(val === "all" ? undefined : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
