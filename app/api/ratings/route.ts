import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RatingOutcome, PromptInstanceStatus } from '@prisma/client'
import prisma from '@/lib/prisma'

// Lock timeout in milliseconds (5 minutes)
const LOCK_TIMEOUT_MS = 5 * 60 * 1000

// Helper to check if a lock has expired
function isLockExpired(lockedAt: Date | null): boolean {
    if (!lockedAt) return true
    return new Date().getTime() - lockedAt.getTime() > LOCK_TIMEOUT_MS
}

// GET - Get next rating match for the user (with locking)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!session.user.tenantId) {
            return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
        }

        const userId = session.user.id
        const lockExpireTime = new Date(Date.now() - LOCK_TIMEOUT_MS)

        // First, check if user already has a locked match that hasn't expired
        const existingLock = await prisma.ratingMatch.findFirst({
            where: {
                configuration: {
                    tenantId: session.user.tenantId
                },
                isComplete: false,
                lockedBy: userId,
                lockedAt: {
                    gt: lockExpireTime // Lock not expired
                },
                NOT: {
                    responses: {
                        some: {
                            userId: userId
                        }
                    }
                }
            },
            include: {
                configuration: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        rubric: true,
                        rejectionReasons: {
                            orderBy: { sortOrder: 'asc' }
                        },
                        variables: true,
                        promptTemplate: true
                    }
                },
                promptInstance: {
                    select: {
                        id: true,
                        data: true
                    }
                },
                optionA: {
                    select: {
                        id: true,
                        output: true,
                        index: true
                    }
                },
                optionB: {
                    select: {
                        id: true,
                        output: true,
                        index: true
                    }
                }
            }
        })

        if (existingLock) {
            // Refresh the lock timestamp
            await prisma.ratingMatch.update({
                where: { id: existingLock.id },
                data: { lockedAt: new Date() }
            })

            return NextResponse.json({ 
                match: existingLock,
                lockExpiresAt: new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString()
            })
        }

        // Release any expired locks from this user
        await prisma.ratingMatch.updateMany({
            where: {
                lockedBy: userId,
                lockedAt: {
                    lt: lockExpireTime
                }
            },
            data: {
                lockedBy: null,
                lockedAt: null
            }
        })

        // Find an available match:
        // 1. Belongs to user's tenant
        // 2. Is not complete
        // 3. User hasn't rated yet
        // 4. Is not locked by anyone else (or lock has expired)
        const availableMatches = await prisma.ratingMatch.findMany({
            where: {
                configuration: {
                    tenantId: session.user.tenantId
                },
                isComplete: false,
                NOT: {
                    responses: {
                        some: {
                            userId: userId
                        }
                    }
                },
                OR: [
                    { lockedBy: null }, // Not locked
                    { lockedAt: { lt: lockExpireTime } } // Lock expired
                ]
            },
            include: {
                configuration: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        rubric: true,
                        rejectionReasons: {
                            orderBy: { sortOrder: 'asc' }
                        },
                        variables: true,
                        promptTemplate: true
                    }
                },
                promptInstance: {
                    select: {
                        id: true,
                        data: true
                    }
                },
                optionA: {
                    select: {
                        id: true,
                        output: true,
                        index: true
                    }
                },
                optionB: {
                    select: {
                        id: true,
                        output: true,
                        index: true
                    }
                }
            },
            take: 10
        })

        if (availableMatches.length === 0) {
            return NextResponse.json({ 
                match: null, 
                message: 'No matches available for rating' 
            })
        }

        // Random selection
        const randomIndex = Math.floor(Math.random() * availableMatches.length)
        const selectedMatch = availableMatches[randomIndex]

        // Try to acquire lock (using optimistic locking approach)
        const lockResult = await prisma.ratingMatch.updateMany({
            where: {
                id: selectedMatch.id,
                OR: [
                    { lockedBy: null },
                    { lockedAt: { lt: lockExpireTime } }
                ]
            },
            data: {
                lockedBy: userId,
                lockedAt: new Date()
            }
        })

        if (lockResult.count === 0) {
            // Race condition - someone else got the lock
            // Try again recursively (but this is rare)
            console.log('[Rating] Lock race condition, retrying...')
            return GET()
        }

        return NextResponse.json({ 
            match: selectedMatch,
            lockExpiresAt: new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString()
        })
    } catch (error) {
        console.error('Error fetching rating match:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST - Submit a rating response
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { matchId, outcome, reasons, notes } = body

        if (!matchId || !outcome) {
            return NextResponse.json({ error: 'Match ID and outcome are required' }, { status: 400 })
        }

        // Validate outcome
        if (!['A_BETTER', 'B_BETTER', 'BOTH_GOOD', 'NEITHER_GOOD'].includes(outcome)) {
            return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
        }

        if (!session.user.tenantId) {
            return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
        }

        const userId = session.user.id
        const tenantId = session.user.tenantId
        const lockExpireTime = new Date(Date.now() - LOCK_TIMEOUT_MS)

        // Get the match with lock verification
        const match = await prisma.ratingMatch.findFirst({
            where: {
                id: matchId,
                configuration: {
                    tenantId
                }
            },
            include: {
                promptInstance: {
                    include: {
                        completions: true
                    }
                },
                configuration: true
            }
        })

        if (!match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 })
        }

        // Check if match is already complete
        if (match.isComplete) {
            return NextResponse.json({ 
                error: 'This match has already been rated',
                code: 'ALREADY_RATED'
            }, { status: 409 })
        }

        // Check lock ownership
        const userHasLock = match.lockedBy === userId && match.lockedAt && !isLockExpired(match.lockedAt)
        const lockIsExpired = isLockExpired(match.lockedAt)
        const lockedBySomeoneElse = match.lockedBy && match.lockedBy !== userId && !lockIsExpired

        if (lockedBySomeoneElse) {
            return NextResponse.json({ 
                error: 'This match is currently being rated by another user',
                code: 'LOCKED_BY_OTHER'
            }, { status: 409 })
        }

        if (!userHasLock && !lockIsExpired) {
            return NextResponse.json({ 
                error: 'You do not have the lock for this match. Please refresh to get a new match.',
                code: 'NO_LOCK'
            }, { status: 409 })
        }

        // If lock expired but no one else has it, we can still proceed but warn
        // (this handles the case where user's lock expired but they're still submitting)
        // We'll try to re-acquire the lock
        if (lockIsExpired || match.lockedBy !== userId) {
            const reacquireResult = await prisma.ratingMatch.updateMany({
                where: {
                    id: matchId,
                    isComplete: false,
                    OR: [
                        { lockedBy: null },
                        { lockedBy: userId },
                        { lockedAt: { lt: lockExpireTime } }
                    ]
                },
                data: {
                    lockedBy: userId,
                    lockedAt: new Date()
                }
            })

            if (reacquireResult.count === 0) {
                // Someone else got it
                return NextResponse.json({ 
                    error: 'Your session expired and this match was assigned to another user',
                    code: 'SESSION_EXPIRED'
                }, { status: 409 })
            }
        }

        // Check if user already rated (extra safety)
        const existingResponse = await prisma.ratingResponse.findUnique({
            where: {
                ratingMatchId_userId: {
                    ratingMatchId: matchId,
                    userId: userId
                }
            }
        })

        if (existingResponse) {
            return NextResponse.json({ 
                error: 'You have already rated this match',
                code: 'DUPLICATE_RESPONSE'
            }, { status: 400 })
        }

        // Create rating response
        const response = await prisma.ratingResponse.create({
            data: {
                ratingMatchId: matchId,
                userId: userId,
                outcome: outcome as RatingOutcome,
                reasons: reasons || [],
                notes
            }
        })

        // Determine winner based on outcome
        let winnerCompletionId: string | null = null
        if (outcome === 'A_BETTER') {
            winnerCompletionId = match.optionACompletionId
        } else if (outcome === 'B_BETTER') {
            winnerCompletionId = match.optionBCompletionId
        }

        // Update match with winner, mark as complete, and clear lock
        await prisma.ratingMatch.update({
            where: { id: matchId },
            data: {
                outcome: outcome as RatingOutcome,
                winnerCompletionId,
                isComplete: true,
                lockedBy: null,
                lockedAt: null
            }
        })

        // Check if we need to create next round matches or determine final winner
        await handleMatchCompletion(match, winnerCompletionId)

        return NextResponse.json({ 
            success: true, 
            response,
            message: 'Rating submitted successfully'
        })
    } catch (error) {
        console.error('Error submitting rating:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// Handle match completion - create next round or determine final winner
async function handleMatchCompletion(
    match: { 
        id: string; 
        round: number; 
        promptInstanceId: string; 
        configurationId: string;
        promptInstance: { completions: { id: string }[] }
    },
    winnerCompletionId: string | null
) {
    try {
        const totalCompletions = match.promptInstance.completions.length

        if (totalCompletions <= 2) {
            // Simple match - this is the final result
            if (winnerCompletionId) {
                await prisma.finalWinner.upsert({
                    where: { promptInstanceId: match.promptInstanceId },
                    update: { winningCompletionId: winnerCompletionId },
                    create: {
                        promptInstanceId: match.promptInstanceId,
                        winningCompletionId: winnerCompletionId
                    }
                })
            }

            await prisma.promptInstance.update({
                where: { id: match.promptInstanceId },
                data: { status: PromptInstanceStatus.RATED }
            })
            return
        }

        // For tournament brackets (3+ completions)
        if (match.round === 1) {
            const round1Matches = await prisma.ratingMatch.findMany({
                where: {
                    promptInstanceId: match.promptInstanceId,
                    round: 1
                }
            })

            const allRound1Complete = round1Matches.every(m => m.isComplete)

            if (allRound1Complete) {
                const winners = round1Matches
                    .filter(m => m.winnerCompletionId)
                    .map(m => m.winnerCompletionId!)

                if (winners.length >= 2) {
                    const existingFinal = await prisma.ratingMatch.findFirst({
                        where: {
                            promptInstanceId: match.promptInstanceId,
                            round: 2
                        }
                    })

                    if (!existingFinal) {
                        await prisma.ratingMatch.create({
                            data: {
                                promptInstanceId: match.promptInstanceId,
                                configurationId: match.configurationId,
                                round: 2,
                                optionACompletionId: winners[0],
                                optionBCompletionId: winners[1]
                            }
                        })
                    }
                } else if (winners.length === 1) {
                    await prisma.finalWinner.upsert({
                        where: { promptInstanceId: match.promptInstanceId },
                        update: { winningCompletionId: winners[0] },
                        create: {
                            promptInstanceId: match.promptInstanceId,
                            winningCompletionId: winners[0]
                        }
                    })

                    await prisma.promptInstance.update({
                        where: { id: match.promptInstanceId },
                        data: { status: PromptInstanceStatus.RATED }
                    })
                }
            }
        } else if (match.round === 2) {
            if (winnerCompletionId) {
                await prisma.finalWinner.upsert({
                    where: { promptInstanceId: match.promptInstanceId },
                    update: { winningCompletionId: winnerCompletionId },
                    create: {
                        promptInstanceId: match.promptInstanceId,
                        winningCompletionId: winnerCompletionId
                    }
                })
            }

            await prisma.promptInstance.update({
                where: { id: match.promptInstanceId },
                data: { status: PromptInstanceStatus.RATED }
            })
        }
    } catch (error) {
        console.error('Error handling match completion:', error)
    }
}
