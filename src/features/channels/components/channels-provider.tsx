import { createContext, useContext, useState } from 'react'
import type { Channel } from '../data/schema'

export type ChannelDialogOpenType = 'create' | 'update' | 'delete' | 'view' | null

interface ChannelsContextType {
  open: ChannelDialogOpenType
  setOpen: (open: ChannelDialogOpenType) => void
  currentRow: Channel | null
  setCurrentRow: (row: Channel | null) => void
}

const ChannelsContext = createContext<ChannelsContextType | null>(null)

export function ChannelsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState<ChannelDialogOpenType>(null)
  const [currentRow, setCurrentRow] = useState<Channel | null>(null)

  return (
    <ChannelsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </ChannelsContext.Provider>
  )
}

export const useChannelsContext = () => {
  const context = useContext(ChannelsContext)
  if (!context) {
    throw new Error(
      'useChannelsContext must be used within a <ChannelsProvider>'
    )
  }
  return context
}
