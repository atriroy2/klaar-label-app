import { NextResponse } from 'next/server'
import { GenerationRunStatus, PromptInstanceStatus, ConfigurationStatus, ModelProvider } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getProvider, interpolatePrompt } from '@/lib/llm'

// Helper for timestamped logging
function log(message: string, data?: unknown) {
    const timestamp = new Date().toISOString()
    if (data) {
        console.log(`[WORKER ${timestamp}] ${message}`, data)
    } else {
        console.log(`[WORKER ${timestamp}] ${message}`)
    }
}

function logError(message: string, error?: unknown) {
    const timestamp = new Date().toISOString()
    console.error(`[WORKER ERROR ${timestamp}] ${message}`, error)
}

// This endpoint processes queued generation runs
// Can be called by a cron job or manually triggered

export async function POST(request: Request) {
    log('Worker triggered')
    
    try {
        // Optional: Verify cron secret for security
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET
        
        // Allow if no secret is configured (development) or if secret matches
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            log('Unauthorized - invalid cron secret')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Find a queued or running generation run
        let run = await prisma.generationRun.findFirst({
            where: { status: GenerationRunStatus.RUNNING },
            include: { configuration: true },
            orderBy: { createdAt: 'asc' }
        })

        if (!run) {
            run = await prisma.generationRun.findFirst({
                where: { status: GenerationRunStatus.QUEUED },
                include: { configuration: true },
                orderBy: { createdAt: 'asc' }
            })
        }

        if (!run) {
            log('No queued or running jobs found')
            return NextResponse.json({ message: 'No queued runs' })
        }

        log(`Processing run: ${run.id}`, { 
            config: run.configuration.name,
            status: run.status,
            provider: run.provider,
            model: run.modelName
        })

        // Mark as running if queued
        if (run.status === GenerationRunStatus.QUEUED) {
            await prisma.generationRun.update({
                where: { id: run.id },
                data: { 
                    status: GenerationRunStatus.RUNNING,
                    startedAt: new Date()
                }
            })
            log('Run status changed to RUNNING')
        }

        // Get pending instances
        const instances = await prisma.promptInstance.findMany({
            where: {
                configurationId: run.configurationId,
                status: { in: [PromptInstanceStatus.PENDING, PromptInstanceStatus.GENERATING] }
            },
            take: 10 // Process smaller batches for better progress visibility
        })

        log(`Found ${instances.length} instances to process`)

        if (instances.length === 0) {
            // Mark run as completed
            await prisma.generationRun.update({
                where: { id: run.id },
                data: {
                    status: GenerationRunStatus.COMPLETED,
                    completedAt: new Date()
                }
            })

            // Update configuration status
            await prisma.configuration.update({
                where: { id: run.configurationId },
                data: { status: ConfigurationStatus.COMPLETED }
            })

            log('Run completed - no pending instances')
            
            // Create rating matches
            await createRatingMatches(run.configurationId)

            return NextResponse.json({ message: 'Run completed - no pending instances' })
        }

        const provider = getProvider(run.provider as ModelProvider)
        const config = run.configuration
        let processedCount = run.processedCount
        let errorCount = 0
        const errors: string[] = []

        for (const instance of instances) {
            const instanceData = instance.data as Record<string, string>
            log(`Processing instance ${instance.id}`, { data: Object.keys(instanceData) })
            
            try {
                // Mark instance as generating
                await prisma.promptInstance.update({
                    where: { id: instance.id },
                    data: { status: PromptInstanceStatus.GENERATING }
                })

                // Generate completions
                const prompt = interpolatePrompt(config.promptTemplate, instanceData)
                log(`Prompt length: ${prompt.length} chars`)

                for (let i = 0; i < config.generationsPerInstance; i++) {
                    log(`Generating completion ${i + 1}/${config.generationsPerInstance} for instance ${instance.id}`)
                    
                    const result = await provider.generateCompletion(
                        prompt,
                        config.modelName,
                        config.apiKey || undefined
                    )

                    if (result.error) {
                        logError(`Generation error for instance ${instance.id}, attempt ${i + 1}:`, result.error)
                        errors.push(`Instance ${instance.id}, gen ${i + 1}: ${result.error}`)
                        errorCount++
                        continue
                    }

                    log(`Completion ${i + 1} generated successfully`, { 
                        outputLength: result.output.length,
                        tokensUsed: result.tokensUsed 
                    })

                    // Save completion
                    await prisma.completion.create({
                        data: {
                            promptInstanceId: instance.id,
                            generationRunId: run.id,
                            output: result.output,
                            provider: run.provider,
                            modelName: run.modelName,
                            index: i,
                            tokensUsed: result.tokensUsed
                        }
                    })
                }

                // Mark instance as ready for rating
                await prisma.promptInstance.update({
                    where: { id: instance.id },
                    data: { status: PromptInstanceStatus.READY_FOR_RATING }
                })

                processedCount++
                log(`Instance ${instance.id} completed. Total processed: ${processedCount}`)

                // Update run progress
                await prisma.generationRun.update({
                    where: { id: run.id },
                    data: { processedCount }
                })

            } catch (error) {
                logError(`Error processing instance ${instance.id}:`, error)
                errors.push(`Instance ${instance.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
                errorCount++
                
                // Mark instance back to pending for retry
                await prisma.promptInstance.update({
                    where: { id: instance.id },
                    data: { status: PromptInstanceStatus.PENDING }
                })
            }
        }

        // Check if more instances remain
        const remainingCount = await prisma.promptInstance.count({
            where: {
                configurationId: run.configurationId,
                status: PromptInstanceStatus.PENDING
            }
        })

        log(`Batch complete. Processed: ${processedCount}, Remaining: ${remainingCount}, Errors: ${errorCount}`)

        if (remainingCount === 0) {
            // All done - mark run as completed
            await prisma.generationRun.update({
                where: { id: run.id },
                data: {
                    status: GenerationRunStatus.COMPLETED,
                    completedAt: new Date()
                }
            })

            // Update configuration status
            await prisma.configuration.update({
                where: { id: run.configurationId },
                data: { status: ConfigurationStatus.COMPLETED }
            })

            log('Run fully completed!')

            // Create rating matches for completed instances
            await createRatingMatches(run.configurationId)

            return NextResponse.json({
                message: 'Run completed',
                processed: processedCount,
                errors: errorCount,
                errorDetails: errors.length > 0 ? errors : undefined
            })
        } else {
            // More to process - keep run as running
            return NextResponse.json({
                message: 'Batch processed - more remaining',
                processed: processedCount,
                remaining: remainingCount,
                errors: errorCount,
                errorDetails: errors.length > 0 ? errors : undefined
            })
        }

    } catch (error) {
        logError('Worker error:', error)
        return NextResponse.json({ 
            error: 'Worker error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

// Create rating matches for instances that have completions
async function createRatingMatches(configurationId: string) {
    try {
        // Get all instances that are ready for rating
        const instances = await prisma.promptInstance.findMany({
            where: {
                configurationId,
                status: PromptInstanceStatus.READY_FOR_RATING
            },
            include: {
                completions: {
                    orderBy: { index: 'asc' }
                }
            }
        })

        for (const instance of instances) {
            const completions = instance.completions
            
            if (completions.length < 2) {
                console.log(`Instance ${instance.id} has less than 2 completions, skipping`)
                continue
            }

            // Check if matches already exist
            const existingMatches = await prisma.ratingMatch.count({
                where: { promptInstanceId: instance.id }
            })

            if (existingMatches > 0) {
                console.log(`Instance ${instance.id} already has matches, skipping`)
                continue
            }

            // Create tournament matches based on number of completions
            if (completions.length === 2) {
                // Simple A vs B match
                await prisma.ratingMatch.create({
                    data: {
                        promptInstanceId: instance.id,
                        configurationId,
                        round: 1,
                        optionACompletionId: completions[0].id,
                        optionBCompletionId: completions[1].id
                    }
                })
            } else if (completions.length === 3) {
                // A vs B, then winner vs C
                await prisma.ratingMatch.create({
                    data: {
                        promptInstanceId: instance.id,
                        configurationId,
                        round: 1,
                        optionACompletionId: completions[0].id,
                        optionBCompletionId: completions[1].id
                    }
                })
                // Note: Round 2 match will be created after round 1 is complete
            } else if (completions.length >= 4) {
                // Tournament: A vs B, C vs D, then winners
                await prisma.ratingMatch.create({
                    data: {
                        promptInstanceId: instance.id,
                        configurationId,
                        round: 1,
                        optionACompletionId: completions[0].id,
                        optionBCompletionId: completions[1].id
                    }
                })
                await prisma.ratingMatch.create({
                    data: {
                        promptInstanceId: instance.id,
                        configurationId,
                        round: 1,
                        optionACompletionId: completions[2].id,
                        optionBCompletionId: completions[3].id
                    }
                })
                // Final match will be created after round 1 is complete
            }
        }
    } catch (error) {
        console.error('Error creating rating matches:', error)
    }
}

// GET endpoint to check worker status
export async function GET() {
    try {
        const queuedRuns = await prisma.generationRun.count({
            where: { status: GenerationRunStatus.QUEUED }
        })

        const runningRuns = await prisma.generationRun.count({
            where: { status: GenerationRunStatus.RUNNING }
        })

        const pendingInstances = await prisma.promptInstance.count({
            where: { status: PromptInstanceStatus.PENDING }
        })

        return NextResponse.json({
            queuedRuns,
            runningRuns,
            pendingInstances
        })
    } catch (error) {
        console.error('Error getting worker status:', error)
        return NextResponse.json({ error: 'Error getting status' }, { status: 500 })
    }
}
