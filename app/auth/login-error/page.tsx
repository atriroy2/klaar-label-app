'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { AlertCircle } from 'lucide-react'

const errorMessages = {
    'InactiveTenant': 'Your organization\'s access has been disabled. Please contact your administrator.',
    'UserNotFound': 'You do not have access to this application.',
    'UserInactive': 'Your account has been deactivated. Please contact your administrator.',
    'Default': 'An error occurred during sign in. Please try again.'
}

export default function LoginErrorPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const errorType = searchParams?.get('error') || 'Default'

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground">
                        Login Failed
                    </h2>
                    <p className="text-muted-foreground">
                        {errorMessages[errorType as keyof typeof errorMessages]}
                    </p>
                    <Button
                        onClick={() => router.push('/auth/login')}
                        className="w-full"
                        variant="default"
                    >
                        Return to Login
                    </Button>
                </div>
            </div>
        </div>
    )
} 