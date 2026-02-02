'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Coins, Trophy, Loader2 } from 'lucide-react'
import Image from 'next/image'

const SHARTHOKBUCKS_IMAGE = '/sharthokbucks-1000.png'

interface LeaderboardEntry {
    id: string
    name: string | null
    email: string | null
    image: string | null
    sartokBucks: number
}

export default function LeaderboardPage() {
    const { data: session } = useSession()
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currencyModalOpen, setCurrencyModalOpen] = useState(false)

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('/api/leaderboard')
                if (!res.ok) throw new Error('Failed to load leaderboard')
                const data = await res.json()
                setLeaderboard(data.leaderboard ?? [])
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }
        fetchLeaderboard()
    }, [])

    const currentUserId = session?.user?.id

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Leaderboard</h1>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Trophy className="h-8 w-8 text-amber-500" />
                        SharthokBucks Leaderboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        See how you rank. Earn SharthokBucks for each rating you complete.
                    </p>
                </div>
                <Dialog open={currencyModalOpen} onOpenChange={setCurrencyModalOpen}>
                    <DialogTrigger asChild>
                        <button
                            type="button"
                            className="shrink-0 rounded-lg overflow-hidden border-2 border-amber-500/30 shadow-md hover:border-amber-500/60 hover:shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            aria-label="View SharthokBucks currency"
                        >
                            <Image
                                src={SHARTHOKBUCKS_IMAGE}
                                alt="SharthokBucks 1000"
                                width={150}
                                height={69}
                                className="object-cover w-[150px] h-[69px]"
                            />
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full p-4 overflow-auto" style={{ maxWidth: '1470px' }}>
                        <DialogTitle className="sr-only">SharthokBucks 1000</DialogTitle>
                        <div className="flex justify-center">
                            <Image
                                src={SHARTHOKBUCKS_IMAGE}
                                alt="SharthokBucks 1000"
                                width={1470}
                                height={672}
                                className="w-full max-w-[1470px] h-auto rounded-lg"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-amber-500" />
                        Rankings
                    </CardTitle>
                    <CardDescription>
                        Everyone in your organization, sorted by SharthokBucks
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {leaderboard.length === 0 ? (
                        <p className="text-muted-foreground py-8 text-center">
                            No one has earned SharthokBucks yet. Complete ratings to climb the board!
                        </p>
                    ) : (
                        <div className="rounded-md border">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="text-left py-3 px-4 font-medium">Rank</th>
                                        <th className="text-left py-3 px-4 font-medium">Name</th>
                                        <th className="text-right py-3 px-4 font-medium">SharthokBucks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((entry, index) => {
                                        const rank = index + 1
                                        const isCurrentUser = entry.id === currentUserId
                                        return (
                                            <tr
                                                key={entry.id}
                                                className={`border-b last:border-0 ${isCurrentUser ? 'bg-amber-500/10 font-medium' : ''}`}
                                            >
                                                <td className="py-3 px-4">
                                                    <span className={rank <= 3 ? 'text-amber-600 dark:text-amber-400' : ''}>
                                                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {entry.name || entry.email || 'Anonymous'}
                                                    {isCurrentUser && (
                                                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">
                                                    {entry.sartokBucks.toLocaleString()}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
