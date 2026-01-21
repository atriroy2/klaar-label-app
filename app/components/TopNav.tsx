'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { UserCircle, LogOut, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

export default function TopNav() {
    const { data: session } = useSession()
    const { theme, setTheme } = useTheme()

    if (!session) return null

    // Get first name only
    const displayName = session.user?.name?.replace(/([^\s]+).*/g, '$1') || "Guest"

    return (
        <nav className="fixed top-0 right-0 left-64 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
            <div className="flex h-16 items-center justify-between px-8">
                <div className="flex items-center space-x-4">
                    <UserCircle className="h-7 w-7 text-primary" />
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