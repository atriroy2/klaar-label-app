'use client'

import { useSession } from 'next-auth/react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Role } from '@/lib/auth'
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from 'react'
import Clock from './Clock'
import MechanicIcon from './MechanicIcon'
import {
    Settings,
    Shield,
    Users,
    ChevronDown,
    Home,
    FileText,
    Star,
    Zap,
    Trophy,
    MessageSquare,
    Bot,
} from "lucide-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface NavProps extends React.HTMLAttributes<HTMLDivElement> {}

function NavBarSkeleton() {
    return (
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col border-r bg-background z-50 pointer-events-auto">
            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col h-full">
                    {/* Header Skeleton */}
                    <div className="flex h-12 items-center border-b px-4">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-md bg-muted animate-pulse" />
                            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                        </div>
                    </div>
                    
                    {/* Menu Items Skeleton */}
                    <div className="flex-1 p-4 space-y-2">
                        <div className="h-10 rounded bg-muted animate-pulse" />
                        <div className="h-10 rounded bg-muted animate-pulse" />
                        <div className="h-10 rounded bg-muted animate-pulse" />
                    </div>

                    {/* Admin Options Skeleton */}
                    <div className="mt-auto p-4 space-y-2">
                        <div className="h-10 rounded bg-muted animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function NavBar({ className, ...props }: NavProps) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const isTenantAdmin = session?.user?.role === Role.TENANT_ADMIN
    const isSuperAdmin = session?.user?.role === Role.SUPER_ADMIN
    // Super admins with a tenantId can also manage their tenant
    const canManageTenant = isTenantAdmin || (isSuperAdmin && session?.user?.tenantId)
    const pathname = usePathname() || ''
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)
    
    // Debug log
    useEffect(() => {
        console.log('NavBar Debug (Client - components/NavBar.tsx):', {
            status,
            role: session?.user?.role,
            tenantId: session?.user?.tenantId,
            isTenantAdmin,
            isSuperAdmin,
            canManageTenant,
            fullSession: session
        })
    }, [session, status, isTenantAdmin, isSuperAdmin, canManageTenant])

    // Keep admin menu open when on admin pages, close when navigating away
    useEffect(() => {
        if (pathname.startsWith('/admin')) {
            setIsAdminMenuOpen(true)
        } else {
            setIsAdminMenuOpen(false)
        }
    }, [pathname])

    const handleNavigation = (path: string) => {
        console.log('handleNavigation called:', path)
        try {
            router.push(path)
            // Force a navigation if router.push doesn't work
            setTimeout(() => {
                if (window.location.pathname !== path) {
                    console.log('Router.push failed, using window.location')
                    window.location.href = path
                }
            }, 100)
        } catch (error) {
            console.error('Navigation error:', error)
            window.location.href = path
        }
    }

    if (status === 'loading') {
        return <NavBarSkeleton />
    }

    return (
        <nav 
            className="fixed inset-y-0 left-0 flex w-64 flex-col border-r bg-background" 
            style={{ zIndex: 9999, pointerEvents: 'auto', isolation: 'isolate' }}
            onClick={(e) => {
                console.log('Nav clicked, target:', e.target, 'currentTarget:', e.currentTarget)
                // Don't prevent default, let it bubble
            }}
            onMouseDown={(e) => {
                console.log('Nav mousedown, target:', e.target)
            }}
        >
            <div className="flex-1 overflow-y-auto" style={{ pointerEvents: 'auto' }}>
                <div className="flex flex-col h-full" style={{ pointerEvents: 'auto' }}>
                    {/* Header */}
                    <div className="flex h-12 items-center border-b px-4" style={{ pointerEvents: 'auto' }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleNavigation('/dashboard')
                            }}
                            className="flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity cursor-pointer"
                            style={{ pointerEvents: 'auto' }}
                        >
                            <MechanicIcon className="h-6 w-6" />
                            <span>Klaar Internal</span>
                        </button>
                    </div>
                    
                    {/* Individual User Section */}
                    <div className="p-4 space-y-2" style={{ pointerEvents: 'auto' }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleNavigation('/dashboard')
                            }}
                            className={cn(
                                "flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-left cursor-pointer",
                                pathname === "/dashboard" && "bg-accent text-accent-foreground"
                            )}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <Home className="h-5 w-5" />
                            Home
                        </button>
                        
                        {/* Rating page - available to all users */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleNavigation('/rating')
                            }}
                            className={cn(
                                "flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-left cursor-pointer",
                                pathname === "/rating" && "bg-accent text-accent-foreground"
                            )}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <Star className="h-5 w-5" />
                            Rate
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleNavigation('/leaderboard')
                            }}
                            className={cn(
                                "flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-left cursor-pointer",
                                pathname === "/leaderboard" && "bg-accent text-accent-foreground"
                            )}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <Trophy className="h-5 w-5" />
                            Leaderboard
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleNavigation('/huddles')
                            }}
                            className={cn(
                                "flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-left cursor-pointer",
                                pathname.startsWith("/huddles") && !pathname.startsWith("/huddles/chat") && "bg-accent text-accent-foreground"
                            )}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <MessageSquare className="h-5 w-5" />
                            Huddles
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleNavigation('/huddles/chat')
                            }}
                            className={cn(
                                "flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-left cursor-pointer",
                                pathname === "/huddles/chat" && "bg-accent text-accent-foreground"
                            )}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <Bot className="h-5 w-5" />
                            Ask Earl
                        </button>
                    </div>

                    {/* Admin Section */}
                    <div className="mt-auto px-4 pt-6 pb-4 space-y-2 border-t" style={{ pointerEvents: 'auto' }}>
                        {/* Admin Settings with submenu - visible to tenant admins OR super admins with a tenant */}
                        {canManageTenant && (
                            <Collapsible 
                                className="w-full" 
                                open={isAdminMenuOpen}
                                onOpenChange={(open) => {
                                    // Only allow closing if not on an admin page
                                    // This prevents the menu from collapsing when clicking sub-menu items
                                    if (!open && pathname.startsWith('/admin')) {
                                        return // Don't close if on admin page
                                    }
                                    setIsAdminMenuOpen(open)
                                }}
                            >
                                <CollapsibleTrigger asChild>
                                    <div className={cn(
                                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                        pathname.startsWith("/admin") && "bg-accent text-accent-foreground"
                                    )}>
                                        <div className="flex items-center gap-2">
                                            <Settings className="h-5 w-5" />
                                            Admin Settings
                                        </div>
                                        <ChevronDown className={cn(
                                            "h-4 w-4 transition-transform duration-200",
                                            isAdminMenuOpen && "rotate-180"
                                        )} />
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-1" style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleNavigation('/admin/configs')
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-md px-9 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left cursor-pointer",
                                            pathname.startsWith("/admin/configs") && "bg-accent/50 text-accent-foreground"
                                        )}
                                        style={{ pointerEvents: 'auto' }}
                                    >
                                        <FileText className="h-4 w-4" />
                                        Configurations
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleNavigation('/admin/queue')
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-md px-9 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left cursor-pointer",
                                            pathname === "/admin/queue" && "bg-accent/50 text-accent-foreground"
                                        )}
                                        style={{ pointerEvents: 'auto' }}
                                    >
                                        <Zap className="h-4 w-4" />
                                        Queue
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleNavigation('/admin/users')
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-md px-9 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left cursor-pointer",
                                            pathname === "/admin/users" && "bg-accent/50 text-accent-foreground"
                                        )}
                                        style={{ pointerEvents: 'auto' }}
                                    >
                                        <Users className="h-4 w-4" />
                                        User List
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleNavigation('/admin/huddles')
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-md px-9 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left cursor-pointer",
                                            pathname === "/admin/huddles" && "bg-accent/50 text-accent-foreground"
                                        )}
                                        style={{ pointerEvents: 'auto' }}
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        All Huddles
                                    </button>
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {/* Super Admin Section - at the bottom */}
                        {isSuperAdmin && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleNavigation('/superadmin')
                                }}
                                className={cn(
                                    "flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-left cursor-pointer",
                                    pathname === "/superadmin" && "bg-accent text-accent-foreground"
                                )}
                                style={{ pointerEvents: 'auto' }}
                            >
                                <Shield className="h-5 w-5" />
                                Super Admin
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Clock Component - Moved outside scroll container to stay fixed at bottom */}
            <div className="p-4 pb-10 border-t">
                <Clock />
            </div>
        </nav>
    )
} 