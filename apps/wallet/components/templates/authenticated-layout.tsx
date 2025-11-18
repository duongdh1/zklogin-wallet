'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  TrendingUp, 
  Activity,
  Settings, 
  LogOut,
  User,
  History
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from '@repo/ui/sidebar'
import { TopBar } from '@/components/organisms/top-bar'
import { LoadingSpinner } from '@/components/atoms/loading-spinner'
import { TokenBalance } from '@/utils/sui'

interface MenuItem {
  href?: string
  onClick?: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  breadcrumbItems: Array<{ label: string; href?: string }>
  balances: TokenBalance[]
  onSend: (token: string, amount: string, recipient: string) => void
}

export function AuthenticatedLayout({ children, breadcrumbItems, balances, onSend }: AuthenticatedLayoutProps) {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingSpinner message="Loading..." />
  }

  // If not authenticated, don't render anything (redirect will happen)
  if (!user) {
    return <LoadingSpinner message="Redirecting to login..." />
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Main navigation menu items
  const menu: MenuItem[] = [
    {
      href: '/',
      icon: LayoutDashboard,
      label: 'Balances'
    },
    {
      href: '/swap',
      icon: TrendingUp,
      label: 'Swap'
    },
    {
      href: '/activity',
      icon: Activity,
      label: 'Activity'
    },
    {
      href: '/transaction-history',
      icon: History,
      label: 'TX History'
    }
  ]

  // Footer menu items
  const footerMenu: MenuItem[] = [
    {
      href: '/settings',
      icon: Settings,
      label: 'Settings'
    },
    {
      onClick: handleLogout,
      icon: LogOut,
      label: 'Logout'
    }
  ]

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <img 
              src="/sui-logo.svg" 
              alt="Sui Logo" 
              className="w-8 h-10"
            />
            <div>
              <h2 className="font-semibold text-foreground">Sui Wallet</h2>
              <p className="text-xs text-muted-foreground">zkLogin</p>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menu.map((item, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href || '#'} prefetch={true}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {footerMenu.map((item, index) => (
                  <SidebarMenuItem key={index}>
                    {item.href ? (
                      <SidebarMenuButton asChild isActive={pathname === item.href}>
                        <Link href={item.href} prefetch={true}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton onClick={item.onClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
          {/* User email */}
          <div className="px-2 py-2 border-t">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">
                {user.email || 'No email'}
              </span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset>
        <TopBar breadcrumbItems={breadcrumbItems} balances={balances} onSend={onSend} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}