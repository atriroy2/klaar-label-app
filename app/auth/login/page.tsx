'use client'

import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import MechanicIcon from '@/components/MechanicIcon'

export default function LoginPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [error, setError] = useState<string | null>(() => {
        const errorParam = searchParams?.get('error')
        if (errorParam === 'OAuthSignin') return 'Error starting Google sign in. Please try again.'
        if (errorParam === 'OAuthCallback') return 'Error completing Google sign in. Please try again.'
        if (errorParam === 'OAuthCreateAccount') return 'Error creating account. Please try again.'
        if (errorParam === 'EmailSignin') return 'Error sending login email. Please try again.'
        if (errorParam === 'Callback') return 'Error during authentication. Please try again.'
        if (errorParam === 'Default') return 'An unexpected error occurred. Please try again.'
        return errorParam ? 'Failed to sign in with Google. Please try again.' : null
    })
    const [isLoading, setIsLoading] = useState(false)

    const handleSignIn = async () => {
        try {
            setIsLoading(true)
            setError(null)
            
            await signIn('google', {
                callbackUrl: '/dashboard',
                redirect: true
            })
            
            router.push('/dashboard')
        } catch (error) {
            console.error('Sign in error:', error)
            setError('Failed to sign in. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-6">
                    {/* Large Logo */}
                    <div className="flex justify-center">
                        <MechanicIcon className="h-20 w-20 text-primary" />
                    </div>
                    {/* App Name */}
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold text-foreground">
                            Klaar Label
                        </h1>
                        <h2 className="text-xl text-muted-foreground">
                        Login to your account
                    </h2>
                    </div>
                    {error && (
                        <p className="mt-2 text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </div>
                <div className="mt-8">
                    <Button
                        onClick={handleSignIn}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2"
                        variant="outline"
                        size="lg"
                    >
                        <Image
                            className="w-5 h-5"
                            src="https://www.svgrepo.com/show/475656/google-color.svg"
                            alt="Google Logo"
                            width={20}
                            height={20}
                        />
                        {isLoading ? 'Signing in...' : 'Sign in with Google'}
                    </Button>
                </div>
            </div>
        </div>
    )
} 