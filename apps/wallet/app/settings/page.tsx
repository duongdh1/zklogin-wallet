'use client'

import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import { AuthenticatedLayout } from '@/components/templates/authenticated-layout'

export default function SettingsPage() {
  const { user } = useAuth()


  const breadcrumbItems = [
    { label: 'Settings' }
  ]

  return (
    <AuthenticatedLayout 
      breadcrumbItems={breadcrumbItems}
      balances={[]}
      onSend={() => {}}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your wallet preferences and account settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-sm break-all">{user?.address}</code>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">OAuth Provider</label>
                <div className="p-3 bg-muted rounded-md">
                  <span className="capitalize">{user?.provider}</span>
                </div>
              </div>
              {user?.email && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="p-3 bg-muted rounded-md">
                    <span>{user.email}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
