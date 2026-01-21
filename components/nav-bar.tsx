'use client'

import { useSession } from 'next-auth/react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Role } from '@/lib/auth'
import Link from "next/link"
import {
    LayoutDashboard,
    Settings,
} from "lucide-react"

interface NavProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function NavBar({ className, ...props }: NavProps) {
    const { data: session } = useSession()
    const isTenantAdmin = session?.user?.role === Role.TENANT_ADMIN

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
                    
                    {/* Main menu items can be added here */}
                    <div className="flex-1">
                        {/* Add other menu items here */}
                    </div>

                    {/* Admin Settings - only visible to tenant admins */}
                    {isTenantAdmin && (
                        <div className="border-t pt-4">
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2"
                                asChild
                            >
                                <Link href="/admin/settings">
                                    <Settings className="h-5 w-5" />
                                    Admin Settings
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
} 