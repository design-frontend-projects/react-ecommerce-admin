import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KeyRound, ShieldAlert, Delete, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ManagerPinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  onSubmit: (pin: string) => Promise<void> | void
  isLoading?: boolean
  error?: string | null
}

export function ManagerPinModal({
  open,
  onOpenChange,
  title = 'Authorization Required',
  description = 'Please enter your authorization PIN to proceed with this operation.',
  onSubmit,
  isLoading = false,
  error = null,
}: ManagerPinModalProps) {
  const [pin, setPin] = useState('')

  const handleDigit = (digit: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + digit)
    }
  }

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setPin('')
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (pin.length >= 4) {
      await onSubmit(pin)
    }
  }

  const handleClose = () => {
    setPin('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="relative w-full max-w-[240px]">
              <Input
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  setPin(val)
                }}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                autoFocus
                disabled={isLoading}
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-1.5 text-xs text-rose-500 font-medium px-2 py-1 bg-rose-50 dark:bg-rose-950/30 rounded border border-rose-200 dark:border-rose-900"
                >
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick On-Screen Touch Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                type="button"
                variant="outline"
                className="h-12 text-lg font-medium hover:bg-primary/5 active:scale-95 transition-transform"
                onClick={() => handleDigit(num.toString())}
                disabled={isLoading}
              >
                {num}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="h-12 text-xs font-semibold text-muted-foreground hover:bg-muted"
              onClick={handleClear}
              disabled={isLoading || pin.length === 0}
            >
              CLEAR
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 text-lg font-medium hover:bg-primary/5 active:scale-95 transition-transform"
              onClick={() => handleDigit('0')}
              disabled={isLoading}
            >
              0
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-12 hover:bg-muted"
              onClick={handleBackspace}
              disabled={isLoading || pin.length === 0}
            >
              <Delete className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          <DialogFooter className="sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pin.length < 4 || isLoading}
              className="gap-2"
            >
              <Lock className="w-4 h-4" />
              {isLoading ? 'Verifying...' : 'Authorize'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
