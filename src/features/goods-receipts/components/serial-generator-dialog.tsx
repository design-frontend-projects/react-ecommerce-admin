import { useState, useMemo, useEffect } from 'react'
import {
  Sparkles,
  RotateCcw,
  Check,
  Hash,
  Package,
  Calendar,
  Layers,
  AlertTriangle,
  Copy,
  CheckCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  deriveProductPrefix,
  deriveProductAcronym,
  generateSerials,
} from '../utils/serial-generator'

export interface SerialGeneratorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  variantName?: string | null
  sku?: string
  requiredCount: number
  currentSerials: string[]
  existingReceiptSerials?: string[]
  onApply: (serials: string[], mode: 'replace' | 'append') => void
}

export function SerialGeneratorDialog({
  open,
  onOpenChange,
  productName,
  variantName,
  sku,
  requiredCount,
  currentSerials,
  existingReceiptSerials = [],
  onApply,
}: SerialGeneratorDialogProps) {
  // Missing serials needed to reach requiredCount
  const missingCount = Math.max(0, requiredCount - currentSerials.length)
  const defaultCount = currentSerials.length > 0 && missingCount > 0 ? missingCount : Math.max(1, requiredCount)

  // State
  const defaultDerivedPrefix = useMemo(() => deriveProductPrefix(productName), [productName])
  const acronymPrefix = useMemo(() => deriveProductAcronym(productName), [productName])

  const [prefix, setPrefix] = useState(defaultDerivedPrefix)
  const [includeDate, setIncludeDate] = useState(false)
  const [separator, setSeparator] = useState<'-' | '_' | 'none'>('-')
  const [startSequence, setStartSequence] = useState<number>(1)
  const [paddingDigits, setPaddingDigits] = useState<number>(3)
  const [count, setCount] = useState<number>(defaultCount)
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>(
    currentSerials.length > 0 && missingCount > 0 ? 'append' : 'replace'
  )
  const [hasCopied, setHasCopied] = useState(false)

  // Reset parameters when dialog opens or productName/requiredCount changes
  useEffect(() => {
    if (open) {
      setPrefix(defaultDerivedPrefix)
      setIncludeDate(false)
      setSeparator('-')
      setStartSequence(1)
      setPaddingDigits(3)
      setCount(defaultCount)
      setApplyMode(currentSerials.length > 0 && missingCount > 0 ? 'append' : 'replace')
      setHasCopied(false)
    }
  }, [open, defaultDerivedPrefix, defaultCount, currentSerials.length, missingCount])

  // Calculate existing serials set based on mode
  const collisionAvoidanceList = useMemo(() => {
    const list = [...existingReceiptSerials]
    if (applyMode === 'append') {
      list.push(...currentSerials)
    }
    return list
  }, [existingReceiptSerials, applyMode, currentSerials])

  // Real-time generated serials preview
  const generatedSerials = useMemo(() => {
    return generateSerials({
      productName,
      prefix: prefix.trim(),
      count: Math.max(1, count || 1),
      includeDate,
      separator: separator === 'none' ? '' : separator,
      startSequence: Math.max(1, startSequence || 1),
      paddingDigits,
      existingSerials: collisionAvoidanceList,
    })
  }, [
    productName,
    prefix,
    count,
    includeDate,
    separator,
    startSequence,
    paddingDigits,
    collisionAvoidanceList,
  ])

  // Total serials after applying
  const resultingTotal = useMemo(() => {
    if (applyMode === 'append') {
      return currentSerials.length + generatedSerials.length
    }
    return generatedSerials.length
  }, [applyMode, currentSerials.length, generatedSerials.length])

  // Check if target is met
  const isTargetMatched = resultingTotal === requiredCount

  // Quick preset applicator
  const applyPreset = (preset: 'slug' | 'slugDate' | 'acronym' | 'sku') => {
    switch (preset) {
      case 'slug':
        setPrefix(defaultDerivedPrefix)
        setIncludeDate(false)
        break
      case 'slugDate':
        setPrefix(defaultDerivedPrefix)
        setIncludeDate(true)
        break
      case 'acronym':
        setPrefix(acronymPrefix)
        setIncludeDate(false)
        break
      case 'sku':
        if (sku) {
          setPrefix(sku.toUpperCase().replace(/[^\w-]/g, ''))
          setIncludeDate(false)
        }
        break
    }
  }

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(generatedSerials.join('\n'))
    setHasCopied(true)
    toast.success(`Copied ${generatedSerials.length} serial numbers to clipboard.`)
    setTimeout(() => setHasCopied(false), 2000)
  }

  const handleApply = () => {
    if (generatedSerials.length === 0) {
      toast.error('No serial numbers generated.')
      return
    }

    onApply(generatedSerials, applyMode)
    toast.success(
      `Applied ${generatedSerials.length} serials based on "${productName}" (${applyMode === 'append' ? 'Appended' : 'Replaced'}).`
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl max-h-[92vh] flex flex-col p-5'>
        <DialogHeader className='border-b pb-3'>
          <div className='flex items-center gap-2.5'>
            <div className='p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400'>
              <Sparkles className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-base font-bold flex items-center gap-2'>
                Generate Serial Numbers
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Auto-generate standardized sequential serials based on product name.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className='flex-1 pe-2'>
          <div className='space-y-4 py-2 text-xs'>
            {/* Target Item Summary Box */}
            <div className='rounded-lg border bg-muted/20 p-3 space-y-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Package className='h-4 w-4 text-primary shrink-0' />
                  <span className='font-semibold text-sm text-foreground'>{productName}</span>
                  {variantName && (
                    <span className='text-muted-foreground text-xs'>({variantName})</span>
                  )}
                </div>
                {sku && (
                  <Badge variant='outline' className='font-mono text-[10px]'>
                    {sku}
                  </Badge>
                )}
              </div>

              <div className='flex flex-wrap items-center gap-2 pt-1'>
                <Badge variant='secondary' className='text-xs'>
                  Accepted Required: <strong>{requiredCount}</strong>
                </Badge>
                <Badge
                  variant='outline'
                  className={`text-xs ${
                    currentSerials.length === requiredCount
                      ? 'text-emerald-600 border-emerald-300'
                      : 'text-amber-600 border-amber-300'
                  }`}
                >
                  Currently Entered: <strong>{currentSerials.length}</strong>
                </Badge>
                {missingCount > 0 && (
                  <Badge variant='outline' className='text-xs text-blue-600 border-blue-300'>
                    Missing: <strong>{missingCount}</strong>
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Presets Based on Product Name */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
                <Layers className='h-3.5 w-3.5 text-primary' />
                Product Name Format Presets
              </Label>
              <div className='flex flex-wrap gap-1.5'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs font-mono px-2.5 bg-background hover:bg-primary/5 hover:text-primary'
                  onClick={() => applyPreset('slug')}
                >
                  {defaultDerivedPrefix}-001
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs font-mono px-2.5 bg-background hover:bg-primary/5 hover:text-primary'
                  onClick={() => applyPreset('slugDate')}
                >
                  <Calendar className='h-3 w-3 me-1 text-muted-foreground' />
                  {defaultDerivedPrefix}-YYYYMMDD-001
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs font-mono px-2.5 bg-background hover:bg-primary/5 hover:text-primary'
                  onClick={() => applyPreset('acronym')}
                >
                  {acronymPrefix}-001
                </Button>
                {sku && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-7 text-xs font-mono px-2.5 bg-background hover:bg-primary/5 hover:text-primary'
                    onClick={() => applyPreset('sku')}
                  >
                    {sku}-001
                  </Button>
                )}
              </div>
            </div>

            {/* Prefix & Date Options */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <div className='sm:col-span-2 space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-medium'>
                    Serial Prefix (Product Based)
                  </Label>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-5 text-[10px] px-1.5 text-muted-foreground hover:text-primary gap-1'
                    onClick={() => setPrefix(defaultDerivedPrefix)}
                  >
                    <RotateCcw className='h-3 w-3' />
                    Reset
                  </Button>
                </div>
                <Input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder='e.g. IPHONE-15'
                  className='h-8 text-xs font-mono font-semibold uppercase'
                />
                <p className='text-[10px] text-muted-foreground'>
                  Pre-filled and derived from: &quot;{productName}&quot;
                </p>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>Separator</Label>
                <Select
                  value={separator}
                  onValueChange={(val: '-' | '_' | 'none') => setSeparator(val)}
                >
                  <SelectTrigger className='h-8 text-xs font-mono'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='-'>Hyphen ( - )</SelectItem>
                    <SelectItem value='_'>Underscore ( _ )</SelectItem>
                    <SelectItem value='none'>None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date stamp & sequence configuration */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 items-center rounded-lg border bg-card p-3'>
              <div className='flex items-center space-x-2'>
                <Switch
                  id='include-date-switch'
                  checked={includeDate}
                  onCheckedChange={setIncludeDate}
                />
                <Label htmlFor='include-date-switch' className='text-xs cursor-pointer'>
                  Include Date (YYYYMMDD)
                </Label>
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] font-medium'>Start Sequence #</Label>
                <Input
                  type='number'
                  min={1}
                  value={startSequence}
                  onChange={(e) => setStartSequence(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className='h-7 text-xs font-mono'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] font-medium'>Zero Padding</Label>
                <Select
                  value={String(paddingDigits)}
                  onValueChange={(v) => setPaddingDigits(parseInt(v, 10))}
                >
                  <SelectTrigger className='h-7 text-xs font-mono'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='2'>2 Digits (01)</SelectItem>
                    <SelectItem value='3'>3 Digits (001)</SelectItem>
                    <SelectItem value='4'>4 Digits (0001)</SelectItem>
                    <SelectItem value='5'>5 Digits (00001)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quantity to generate and replacement mode */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium flex items-center justify-between'>
                  <span>Quantity to Generate</span>
                  <span className='text-[10px] text-muted-foreground'>
                    Required: {requiredCount}
                  </span>
                </Label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min={1}
                    value={count}
                    onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className='h-8 text-xs font-mono font-bold'
                  />
                  {missingCount > 0 && missingCount !== count && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 text-[11px] shrink-0'
                      onClick={() => setCount(missingCount)}
                    >
                      Fill Missing ({missingCount})
                    </Button>
                  )}
                  {count !== requiredCount && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 text-[11px] shrink-0'
                      onClick={() => setCount(requiredCount)}
                    >
                      Fill All ({requiredCount})
                    </Button>
                  )}
                </div>
              </div>

              {currentSerials.length > 0 && (
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium'>Apply Mode</Label>
                  <div className='flex gap-2 pt-1'>
                    <Button
                      type='button'
                      variant={applyMode === 'replace' ? 'default' : 'outline'}
                      size='sm'
                      className='h-7 text-xs flex-1'
                      onClick={() => setApplyMode('replace')}
                    >
                      Replace All ({currentSerials.length})
                    </Button>
                    <Button
                      type='button'
                      variant={applyMode === 'append' ? 'default' : 'outline'}
                      size='sm'
                      className='h-7 text-xs flex-1'
                      onClick={() => setApplyMode('append')}
                    >
                      Append (+{count})
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Target match status warning or success */}
            <div className='flex items-center justify-between p-2 rounded border bg-muted/30 text-xs'>
              <div className='flex items-center gap-1.5'>
                {isTargetMatched ? (
                  <Check className='h-4 w-4 text-emerald-600' />
                ) : (
                  <AlertTriangle className='h-4 w-4 text-amber-500' />
                )}
                <span>
                  Resulting Total: <strong>{resultingTotal}</strong> / {requiredCount} required
                </span>
              </div>
              <Badge
                variant='outline'
                className={`text-[10px] ${
                  isTargetMatched
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 border-amber-400'
                }`}
              >
                {isTargetMatched ? 'Exact Match' : `${Math.abs(requiredCount - resultingTotal)} discrepancy`}
              </Badge>
            </div>

            {/* Live Preview Box */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold flex items-center gap-1.5 text-primary'>
                  <Hash className='h-3.5 w-3.5' />
                  Generated Preview ({generatedSerials.length})
                </Label>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-6 text-[11px] gap-1 px-2'
                  onClick={handleCopyPreview}
                >
                  {hasCopied ? (
                    <>
                      <CheckCheck className='h-3 w-3 text-emerald-600' />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className='h-3 w-3' />
                      Copy Preview
                    </>
                  )}
                </Button>
              </div>

              <div className='rounded-md border bg-muted/40 p-2.5 max-h-36 overflow-y-auto font-mono text-[11px] space-y-1'>
                <div className='flex flex-wrap gap-1.5'>
                  {generatedSerials.map((sn, idx) => (
                    <span
                      key={sn}
                      className='inline-flex items-center px-2 py-0.5 rounded bg-background border text-foreground shadow-2xs font-semibold'
                    >
                      <span className='text-muted-foreground me-1 text-[9px]'>#{idx + 1}</span>
                      {sn}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className='border-t pt-3 flex items-center justify-between'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={handleApply}
            className='gap-1.5 bg-primary text-primary-foreground'
          >
            <Sparkles className='h-3.5 w-3.5' />
            Apply {generatedSerials.length} Serial{generatedSerials.length > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
