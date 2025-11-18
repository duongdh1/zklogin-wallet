'use client'

import React from 'react'
import { Home } from 'lucide-react'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/breadcrumb'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function AppBreadcrumb({ items }: BreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>
                    <span>{item.label}</span>
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>
                  <span>{item.label}</span>
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
