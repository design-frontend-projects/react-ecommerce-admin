import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Can } from '@/components/rbac/Can'
import { conversionInputSchema } from '../data/schema'
import {
  useConversions,
  useCreateConversion,
  useDeleteConversion,
  useUoms,
} from '../hooks/use-uoms'

export function ConversionsCard() {
  const { data: uoms = [] } = useUoms()
  const { data: conversions, isLoading, error } = useConversions()
  const createConversion = useCreateConversion()
  const deleteConversion = useDeleteConversion()

  const [fromUomId, setFromUomId] = useState('')
  const [toUomId, setToUomId] = useState('')
  const [factor, setFactor] = useState('')

  const handleAdd = async () => {
    const parsed = conversionInputSchema.safeParse({
      fromUomId,
      toUomId,
      factor: Number(factor),
      productVariantId: null,
    })
    if (!parsed.success) {
      toast.error('Please fix the conversion', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }
    try {
      await createConversion.mutateAsync(parsed.data)
      setFromUomId('')
      setToUomId('')
      setFactor('')
    } catch {
      /* handled by mutation onError toast */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit Conversions</CardTitle>
        <CardDescription>
          Conversion factors between units, e.g. 1 box = 12 pieces. Global
          conversions apply to every product.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <Can permission='inventory.manage'>
          <div className='flex flex-wrap items-end gap-3'>
            <div className='grid gap-2'>
              <Label>From unit</Label>
              <Select value={fromUomId} onValueChange={setFromUomId}>
                <SelectTrigger className='w-40'>
                  <SelectValue placeholder='From' />
                </SelectTrigger>
                <SelectContent>
                  {uoms.map((uom) => (
                    <SelectItem key={uom.id} value={uom.id}>
                      {uom.code} — {uom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label>To unit</Label>
              <Select value={toUomId} onValueChange={setToUomId}>
                <SelectTrigger className='w-40'>
                  <SelectValue placeholder='To' />
                </SelectTrigger>
                <SelectContent>
                  {uoms.map((uom) => (
                    <SelectItem key={uom.id} value={uom.id}>
                      {uom.code} — {uom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label>Factor</Label>
              <Input
                type='number'
                min='0'
                step='any'
                className='w-32'
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
              />
            </div>
            <Button onClick={handleAdd} disabled={createConversion.isPending}>
              <Plus className='me-1 h-4 w-4' />
              {createConversion.isPending ? 'Adding...' : 'Add conversion'}
            </Button>
          </div>
        </Can>

        {isLoading ? (
          <div className='flex items-center justify-center p-8'>
            <Loader2 className='h-6 w-6 animate-spin text-primary' />
          </div>
        ) : error ? (
          <p className='text-sm font-medium text-rose-500'>
            Error loading conversions.
          </p>
        ) : conversions?.length ? (
          <ul className='divide-y rounded-md border'>
            {conversions.map((conversion) => (
              <li
                key={conversion.id}
                className='flex items-center justify-between gap-3 px-4 py-2'
              >
                <div className='flex items-center gap-3'>
                  <span className='text-sm font-medium'>
                    1 {conversion.from_uom.code} = {conversion.factor}{' '}
                    {conversion.to_uom.code}
                  </span>
                  <Badge
                    variant={
                      conversion.product_variants ? 'secondary' : 'outline'
                    }
                  >
                    {conversion.product_variants?.sku ?? 'Global'}
                  </Badge>
                </div>
                <Can permission='inventory.manage'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='text-rose-600'
                    disabled={deleteConversion.isPending}
                    onClick={() => deleteConversion.mutate(conversion.id)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </Can>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-muted-foreground'>No conversions yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
