'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Role } from '@/lib/auth'
import Link from "next/link"
import {
    LayoutDashboard,
    Settings,
    Shield,
    Users,
} from "lucide-react"

interface NavProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function NavBar({ className, ...props }: NavProps) {
    const { data: session, status } = useSession()
    const isTenantAdmin = session?.user?.role === Role.TENANT_ADMIN
    const isSuperAdmin = session?.user?.role === Role.SUPER_ADMIN
    // Super admins with a tenantId can also manage their tenant
    const canManageTenant = isTenantAdmin || (isSuperAdmin && session?.user?.tenantId)
    
    // Debug log - always log to see what's happening
    useEffect(() => {
        console.log('NavBar Debug (Client):', {
            status,
            role: session?.user?.role,
            tenantId: session?.user?.tenantId,
            fullSession: session,
            isTenantAdmin,
            isSuperAdmin,
            canManageTenant,
            userObject: session?.user
        })
    }, [session, status, isTenantAdmin, isSuperAdmin, canManageTenant])

    return (
        <div className="fixed inset-y-0 flex w-64 flex-col">
            <ScrollArea className="flex-1 bg-background">
                <div className={cn("flex flex-col gap-4 p-4", className)} {...props}>
                    <div className="flex h-12 items-center border-b px-4">
                        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                            <LayoutDashboard className="h-6 w-6" />
                            <span>Dashboard</span>
                        </Link>
                    </div>
                    
                    {/* Main menu items */}
                    <div className="flex-1 space-y-2">
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                            asChild
                        >
                            <Link href="/dashboard">
                                <LayoutDashboard className="h-5 w-5" />
                                Home
                            </Link>
                        </Button>
                        {isSuperAdmin && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2"
                                asChild
                            >
                                <Link href="/superadmin">
                                    <Shield className="h-5 w-5" />
                                    Super Admin
                                </Link>
                            </Button>
                        )}
                    </div>

                    {/* Admin Settings - visible to tenant admins OR super admins with a tenant */}
                    {canManageTenant && (
                        <div className="border-t pt-4 space-y-2">
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2"
                                asChild
                            >
                                <Link href="/admin/users">
                                    <Settings className="h-5 w-5" />
                                    Admin Settings
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 px-6"
                                asChild
                            >
                                <Link href="/admin/users">
                                    <Users className="h-4 w-4" />
                                    User List
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}