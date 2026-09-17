import { createFileRoute } from '@tanstack/react-router'
import { PosTerminalUsersPage } from '@/features/pos/pages/pos-terminal-users-page'

interface TerminalUsersSearchParams {
  terminalId?: string
}

export const Route = createFileRoute('/_authenticated/pos/terminal-users')({
  validateSearch: (search: Record<string, unknown>): TerminalUsersSearchParams => {
    return {
      terminalId: typeof search.terminalId === 'string' ? search.terminalId : undefined,
    }
  },
  component: PosTerminalUsersPage,
})
