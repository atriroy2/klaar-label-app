'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { UserCircle, LogOut, Sun, Moon, Mail, User, Building2, Users } from "lucide-react"
import { useTheme } from "next-themes"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { useState, useEffect } from 'react'

function TopNavSkeleton() {
    return (
        <nav className="fixed top-0 right-0 left-64 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" style={{ zIndex: 50 }}>
            <div className="flex h-16 items-center justify-between px-8">
                <div className="flex items-center space-x-4">
                    <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
                    <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                </div>

                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded bg-muted animate-pulse" />
                    <div className="h-9 w-24 rounded bg-muted animate-pulse" />
                </div>
            </div>
        </nav>
    )
}

interface UserDetails {
    name: string | null
    email: string | null
    department: string | null
    team: string | null
    manager: {
        name: string | null
        email: string | null
    } | null
}

export default function TopNav() {
    const { data: session, status } = useSession()
    const { theme, setTheme } = useTheme()
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)

    // Fetch full user details
    useEffect(() => {
        const fetchUserDetails = async () => {
            if (!session?.user?.id) return

            try {
                setLoadingDetails(true)
                const response = await fetch(`/api/users/${session.user.id}`)
                if (response.ok) {
                    const data = await response.json()
                    setUserDetails({
                        name: data.name,
                        email: data.email,
                        department: data.department,
                        team: data.team,
                        manager: data.manager,
                    })
                }
            } catch (error) {
                console.error('Error fetching user details:', error)
            } finally {
                setLoadingDetails(false)
            }
        }

        if (session?.user?.id) {
            fetchUserDetails()
        }
    }, [session?.user?.id])

    if (status === 'loading') {
        return <TopNavSkeleton />
    }

    if (!session) return null

    // Get full name
    const displayName = userDetails?.name || session.user?.name || "Guest"

    return (
        <nav className="fixed top-0 right-0 left-64 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" style={{ zIndex: 50 }}>
            <div className="flex h-16 items-center justify-between px-8">
                <div className="flex items-center space-x-4">
                    <HoverCard openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                            <button className="cursor-pointer hover:opacity-80 transition-opacity">
                                <UserCircle className="h-7 w-7 text-primary" />
                            </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80" align="start">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-sm font-semibold">
                                            {userDetails?.name || session.user?.name || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                
                                {userDetails?.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            {userDetails.email}
                                        </p>
                                    </div>
                                )}

                                {userDetails?.manager?.email && (
                                    <div className="flex items-start gap-2">
                                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground mb-0.5">Manager</p>
                                            <p className="text-sm">
                                                {userDetails.manager.name || 'N/A'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {userDetails.manager.email}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {userDetails?.department && (
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground mb-0.5">Department</p>
                                            <p className="text-sm">{userDetails.department}</p>
                                        </div>
                                    </div>
                                )}

                                {userDetails?.team && (
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground mb-0.5">Team</p>
                                            <p className="text-sm">{userDetails.team}</p>
                                        </div>
                                    </div>
                                )}

                                {loadingDetails && (
                                    <p className="text-xs text-muted-foreground">Loading details...</p>
                                )}
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                    <span className="text-lg font-medium text-foreground">
                        Hello, {displayName}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="hover:bg-accent hover:text-accent-foreground"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => signOut({ callbackUrl: '/auth/login' })}
                        className="flex items-center gap-2 px-4 hover:bg-accent hover:text-accent-foreground"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                    </Button>
                </div>
            </div>
        </nav>
    )
} 