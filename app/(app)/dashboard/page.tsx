'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from 'next-auth/react'

export default function DashboardPage() {
    const { data: session } = useSession()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {session?.user?.name || session?.user?.email || 'User'}!
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Welcome</CardTitle>
                    <CardDescription>
                        Your application is ready. Start building your features from here.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        This is a blank slate. You can start adding your features and functionality.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}