import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Building, Loader2, Monitor, Play, Plus, Users, Warehouse } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStores } from '@/features/stores/hooks/use-stores'
import { useWarehouses } from '@/features/warehouses/hooks/use-warehouses'
import {
  useCreateTerminalMutation,
  usePosTerminals,
  useUpdateTerminalMutation,
} from '../hooks/use-pos-queries'
import { usePosStore } from '../store/use-pos-store'

export function PosTerminalsPage() {
  const navigate = useNavigate()
  const { setTerminal } = usePosStore()
  const { data: terminals = [], isLoading } = usePosTerminals()
  const { data: stores = [] } = useStores()
  const { data: warehouses = [] } = useWarehouses()

  const createMutation = useCreateTerminalMutation()
  const updateMutation = useUpdateTerminalMutation()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTerminal, setEditingTerminal] = useState<any>(null)

  // Form states
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')

  const openCreateDialog = () => {
    setName('')
    setCode(`POS-0${terminals.length + 1}`)
    setSelectedStoreId(stores[0]?.store_id || stores[0]?.id || '')
    setSelectedWarehouseId(warehouses[0]?.id || '')
    setIsCreateOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) {
      toast.error('Please enter name and code')
      return
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        code: code.trim(),
        storeId: selectedStoreId || undefined,
        warehouseId: selectedWarehouseId || undefined,
      })

      toast.success(`Terminal ${code} created successfully!`)
      setIsCreateOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create terminal')
    }
  }

  const handleLaunch = (terminal: any) => {
    setTerminal({
      id: terminal.id,
      name: terminal.name,
      code: terminal.code,
      storeId: terminal.storeId,
      branchId: terminal.branchId,
      warehouseId: terminal.warehouseId,
      defaultPriceListId: terminal.defaultPriceListId,
    })
    toast.success(`Active terminal switched to ${terminal.code}`)
    navigate({ to: '/pos' })
  }

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-3xl font-extrabold tracking-tight'>
            POS Terminals
          </h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Manage physical checkout counters, store assignments, and till
            registers.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            onClick={() => navigate({ to: '/pos/terminal-users' })}
            className='gap-2'
          >
            <Users className='h-4 w-4' /> Manage Terminal Users
          </Button>

          <Button
            onClick={openCreateDialog}
            className='gap-2 bg-primary text-primary-foreground'
          >
            <Plus className='h-4 w-4' /> Add Terminal
          </Button>
        </div>
      </div>

      {/* Terminals Grid */}
      {isLoading ? (
        <div className='flex justify-center py-20'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      ) : terminals.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='space-y-3 py-16 text-center'>
            <Monitor className='mx-auto h-12 w-12 text-muted-foreground opacity-30' />
            <h3 className='text-lg font-bold'>No Terminals Configured</h3>
            <p className='mx-auto max-w-sm text-sm text-muted-foreground'>
              Create your first POS checkout register to start making physical
              retail sales.
            </p>
            <Button
              onClick={openCreateDialog}
              variant='outline'
              className='mt-2'
            >
              <Plus className='mr-2 h-4 w-4' /> Add Terminal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {terminals.map((t) => (
            <Card
              key={t.id}
              className='relative overflow-hidden transition-shadow hover:shadow-md'
            >
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between'>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <Monitor className='h-5 w-5 text-primary' />
                      <CardTitle className='text-lg'>{t.name}</CardTitle>
                    </div>
                    <CardDescription className='font-mono text-xs font-semibold'>
                      Code: {t.code}
                    </CardDescription>
                  </div>

                  <Badge
                    variant='outline'
                    className={
                      t.status === 'active'
                        ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {t.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className='space-y-4 pt-1'>
                <div className='space-y-2 rounded-md bg-muted/40 p-3 text-xs'>
                  <div className='flex items-center justify-between'>
                    <span className='flex items-center gap-1.5 text-muted-foreground'>
                      <Building className='h-3.5 w-3.5' /> Store
                    </span>
                    <span className='font-semibold'>
                      {stores.find(
                        (s: any) => (s.store_id || s.id) === t.storeId
                      )?.name || 'Default Store'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='flex items-center gap-1.5 text-muted-foreground'>
                      <Warehouse className='h-3.5 w-3.5' /> Warehouse
                    </span>
                    <span className='font-semibold'>
                      {warehouses.find((w: any) => w.id === t.warehouseId)
                        ?.name || 'Main Warehouse'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground'>
                      Session Status
                    </span>
                    {t.hasActiveSession ? (
                      <span className='flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400'>
                        <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500' />
                        Open
                      </span>
                    ) : (
                      <span className='text-muted-foreground'>Closed</span>
                    )}
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground'>
                      Assigned Cashiers
                    </span>
                    <span className='font-semibold'>
                      {t.assignedCashiers?.length || 0} Operator{t.assignedCashiers?.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between gap-2 border-t pt-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='gap-1.5 text-xs'
                    onClick={() =>
                      navigate({
                        to: '/pos/terminal-users',
                        search: { terminalId: t.id },
                      })
                    }
                  >
                    <Users className='h-3.5 w-3.5' /> Assign Users
                  </Button>

                  <Button
                    size='sm'
                    className='gap-1.5 bg-primary text-xs font-semibold text-primary-foreground'
                    onClick={() => handleLaunch(t)}
                  >
                    <Play className='h-3.5 w-3.5' /> Launch Register
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Create POS Terminal</DialogTitle>
            <DialogDescription>
              Add a new retail cash counter or checkout station.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label htmlFor='tCode'>Terminal Code *</Label>
              <Input
                id='tCode'
                placeholder='e.g. POS-01'
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='tName'>Terminal Name *</Label>
              <Input
                id='tName'
                placeholder='e.g. Main Counter Register'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='tStore'>Assigned Store</Label>
              <Select
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
              >
                <SelectTrigger id='tStore'>
                  <SelectValue placeholder='Select store' />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s: any) => (
                    <SelectItem
                      key={s.store_id || s.id}
                      value={s.store_id || s.id}
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='tWarehouse'>
                Fulfillment Warehouse (Stock Source) *
              </Label>
              <Select
                value={selectedWarehouseId}
                onValueChange={setSelectedWarehouseId}
              >
                <SelectTrigger id='tWarehouse'>
                  <SelectValue placeholder='Select warehouse' />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className='gap-2 pt-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Terminal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
