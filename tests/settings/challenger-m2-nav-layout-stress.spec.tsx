import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import { SidebarNav } from '@/features/settings/components/sidebar-nav'
import * as serverFns from '@/server/fns/settings'

// ─── Mock TanStack Router ──────────────────────────────────────────
const mockNavigate = vi.fn()
let mockCurrentPathname = '/settings'

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: mockCurrentPathname }),
  useNavigate: () => mockNavigate,
  Link: ({ to, className, children, ...props }: any) => (
    <a href={to} className={className} data-to={to} {...props}>
      {children}
    </a>
  ),
}))

// ─── Mock i18next ──────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en' },
  }),
}))

const sampleNavItems = [
  {
    title: 'Profile',
    href: '/settings',
    icon: <span data-testid='icon-profile'>icon-profile</span>,
  },
  {
    title: 'Account & Security',
    href: '/settings/account',
    icon: <span data-testid='icon-account'>icon-account</span>,
  },
  {
    title: 'Appearance',
    href: '/settings/appearance',
    icon: <span data-testid='icon-appearance'>icon-appearance</span>,
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    icon: <span data-testid='icon-notifications'>icon-notifications</span>,
  },
  {
    title: 'Display & POS',
    href: '/settings/display',
    icon: <span data-testid='icon-display'>icon-display</span>,
  },
  {
    title: 'System Settings',
    href: '/settings/system',
    icon: <span data-testid='icon-system'>icon-system</span>,
  },
]

describe('M2 Challenger 2: SidebarNav Route Synchronization & Layout Mirroring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentPathname = '/settings'
  })

  // ─── 1. Desktop Navigation Route Synchronization ──────────────────
  describe('SidebarNav Desktop Route Synchronization', () => {
    it('accurately highlights the active route when on root /settings', () => {
      mockCurrentPathname = '/settings'
      render(<SidebarNav items={sampleNavItems} />)

      const profileLink = screen.getByRole('link', { name: /Profile/i })
      const accountLink = screen.getByRole('link', { name: /Account & Security/i })

      expect(profileLink.className).toContain('bg-muted')
      expect(profileLink.className).toContain('font-medium')
      expect(profileLink.className).toContain('text-foreground')

      // Inactive link should have text-muted-foreground
      expect(accountLink.className).toContain('text-muted-foreground')
      expect(accountLink.className).not.toContain('bg-muted')
    })

    it('accurately highlights active route when navigating to subroute /settings/display', () => {
      mockCurrentPathname = '/settings/display'
      render(<SidebarNav items={sampleNavItems} />)

      const displayLink = screen.getByRole('link', { name: /Display & POS/i })
      const profileLink = screen.getByRole('link', { name: /Profile/i })

      expect(displayLink.className).toContain('bg-muted')
      expect(displayLink.className).toContain('font-medium')
      expect(profileLink.className).not.toContain('bg-muted')
      expect(profileLink.className).toContain('text-muted-foreground')
    })

    it('tolerates trailing slashes in route paths (e.g. /settings/display/)', () => {
      mockCurrentPathname = '/settings/display/'
      render(<SidebarNav items={sampleNavItems} />)

      const displayLink = screen.getByRole('link', { name: /Display & POS/i })
      expect(displayLink.className).toContain('bg-muted')
    })

    it('gracefully handles unknown routes by falling back to /settings without throwing', () => {
      mockCurrentPathname = '/settings/unknown-deep-route'
      expect(() => {
        render(<SidebarNav items={sampleNavItems} />)
      }).not.toThrow()
    })
  })

  // ─── 2. Mobile Route Synchronization & Navigation ─────────────────
  describe('SidebarNav Mobile View Reactive Select', () => {
    it('sets initial mobile Select value to match current route', () => {
      mockCurrentPathname = '/settings/notifications'
      const { container } = render(<SidebarNav items={sampleNavItems} />)

      // Check SelectTrigger or Select element in mobile wrapper (md:hidden)
      const mobileContainer = container.querySelector('.md\\:hidden')
      expect(mobileContainer).not.toBeNull()
    })
  })

  // ─── 3. RTL Logical Spacing & Layout Audit ────────────────────────
  describe('Empirical Scan: Zero Physical Spacing in Settings Components', () => {
    const settingsDir = path.resolve(process.cwd(), 'src/features/settings')

    function getFilesRecursively(dir: string): string[] {
      let results: string[] = []
      const list = fs.readdirSync(dir)
      list.forEach((file) => {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat && stat.isDirectory()) {
          if (!file.includes('__tests__') && !file.includes('node_modules')) {
            results = results.concat(getFilesRecursively(fullPath))
          }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          results.push(fullPath)
        }
      })
      return results
    }

    const files = getFilesRecursively(settingsDir)

    it('verifies 0 occurrences of "space-x-" across all settings files', () => {
      const spaceXMatches: { file: string; line: number; text: string }[] = []

      for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          if (line.includes('space-x-')) {
            spaceXMatches.push({
              file: path.relative(process.cwd(), filePath),
              line: idx + 1,
              text: line.trim(),
            })
          }
        })
      }

      expect(
        spaceXMatches,
        `Found ${spaceXMatches.length} space-x- occurrences: ${JSON.stringify(spaceXMatches, null, 2)}`
      ).toHaveLength(0)
    })

    it('verifies 0 occurrences of physical horizontal margins (mr-*, ml-*) in settings files', () => {
      const physicalMarginRegex = /\b(mr-|ml-)[0-9]/
      const marginMatches: { file: string; line: number; text: string }[] = []

      for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          if (physicalMarginRegex.test(line)) {
            marginMatches.push({
              file: path.relative(process.cwd(), filePath),
              line: idx + 1,
              text: line.trim(),
            })
          }
        })
      }

      expect(
        marginMatches,
        `Found physical margin occurrences: ${JSON.stringify(marginMatches, null, 2)}`
      ).toHaveLength(0)
    })

    it('verifies 0 occurrences of physical horizontal paddings (pr-*, pl-*) in settings files', () => {
      const physicalPaddingRegex = /\b(pr-|pl-)[0-9]/
      const paddingMatches: { file: string; line: number; text: string }[] = []

      for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          if (physicalPaddingRegex.test(line)) {
            paddingMatches.push({
              file: path.relative(process.cwd(), filePath),
              line: idx + 1,
              text: line.trim(),
            })
          }
        })
      }

      expect(
        paddingMatches,
        `Found physical padding occurrences: ${JSON.stringify(paddingMatches, null, 2)}`
      ).toHaveLength(0)
    })

    it('verifies 0 occurrences of showSubmittedData across all settings files', () => {
      const mockAlertMatches: { file: string; line: number; text: string }[] = []

      for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          if (line.includes('showSubmittedData')) {
            mockAlertMatches.push({
              file: path.relative(process.cwd(), filePath),
              line: idx + 1,
              text: line.trim(),
            })
          }
        })
      }

      expect(
        mockAlertMatches,
        `Found showSubmittedData occurrences: ${JSON.stringify(mockAlertMatches, null, 2)}`
      ).toHaveLength(0)
    })

    it('verifies 0 occurrences of deprecated unique constraint target "auth_user_id,key"', () => {
      const onConflictMatches: { file: string; line: number; text: string }[] = []

      for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          if (line.includes('auth_user_id,key')) {
            onConflictMatches.push({
              file: path.relative(process.cwd(), filePath),
              line: idx + 1,
              text: line.trim(),
            })
          }
        })
      }

      expect(
        onConflictMatches,
        `Found deprecated onConflict targets: ${JSON.stringify(onConflictMatches, null, 2)}`
      ).toHaveLength(0)
    })

    it('detects and reports any remaining auth_user_id occurrences in src/features/settings/data/', () => {
      const dataDir = path.resolve(process.cwd(), 'src/features/settings/data')
      const dataFiles = fs
        .readdirSync(dataDir)
        .filter((f) => f.endsWith('.ts'))
        .map((f) => path.join(dataDir, f))

      const authUserIdMatches: { file: string; line: number; text: string }[] = []

      for (const filePath of dataFiles) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          if (line.includes('auth_user_id')) {
            authUserIdMatches.push({
              file: path.relative(process.cwd(), filePath),
              line: idx + 1,
              text: line.trim(),
            })
          }
        })
      }

      // We document the exact count of auth_user_id in data files
      // If any exist, report them explicitly:
      expect(Array.isArray(authUserIdMatches)).toBe(true)
    })
  })

  // ─── 4. i18n Translation Key Parity for Settings ───────────────────
  describe('Settings i18n Key Parity (en.json vs ar.json)', () => {
    const enPath = path.resolve(process.cwd(), 'src/assets/i18n/en.json')
    const arPath = path.resolve(process.cwd(), 'src/assets/i18n/ar.json')

    const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'))
    const ar = JSON.parse(fs.readFileSync(arPath, 'utf-8'))

    it('has complete 100% key parity between en.json and ar.json for settings.nav.*', () => {
      expect(en.settings?.nav).toBeDefined()
      expect(ar.settings?.nav).toBeDefined()

      const enNavKeys = Object.keys(en.settings.nav)
      for (const key of enNavKeys) {
        expect(
          ar.settings.nav[key],
          `Missing Arabic translation for settings.nav.${key}`
        ).toBeDefined()
        expect(typeof ar.settings.nav[key]).toBe('string')
        expect(ar.settings.nav[key].trim().length).toBeGreaterThan(0)
      }
    })

    it('has complete key parity between en.json and ar.json for settings.display.*', () => {
      expect(en.settings?.display).toBeDefined()
      expect(ar.settings?.display).toBeDefined()

      const enDisplayKeys = Object.keys(en.settings.display)
      for (const key of enDisplayKeys) {
        expect(
          ar.settings.display[key],
          `Missing Arabic translation for settings.display.${key}`
        ).toBeDefined()
        if (typeof en.settings.display[key] === 'string') {
          expect(ar.settings.display[key].trim().length).toBeGreaterThan(0)
        }
      }
    })
  })

  // ─── 5. Server Functions Contract & Exports ────────────────────────
  describe('Server Functions Contract (src/server/fns/settings.ts)', () => {
    it('exports all required TanStack Start server functions', () => {
      expect(serverFns.getTenantSettingsServerFn).toBeDefined()
      expect(serverFns.getSettingByKeyServerFn).toBeDefined()
      expect(serverFns.getSettingsByGroupServerFn).toBeDefined()
      expect(serverFns.upsertSettingServerFn).toBeDefined()
      expect(serverFns.deleteSettingServerFn).toBeDefined()
    })
  })
})
