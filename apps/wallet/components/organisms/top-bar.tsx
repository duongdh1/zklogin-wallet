'use client'

import { SidebarTrigger } from '@repo/ui/sidebar'
import { ThemeToggle } from '@/components/atoms/theme-toggle'
import { AppBreadcrumb } from '@/components/atoms/breadcrumb'
import { TokenBalance } from '@/utils/sui'

interface TopBarProps {
  breadcrumbItems: Array<{ label: string; href?: string }>
  balances: TokenBalance[]
  onSend: (token: string, amount: string, recipient: string) => void
}

export function TopBar({ breadcrumbItems, balances, onSend }: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex-1">
        <AppBreadcrumb items={breadcrumbItems} />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  )
}
