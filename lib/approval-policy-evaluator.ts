import prisma from './prisma'
import { ApprovalOutcome } from '@prisma/client'
import { calculateWorkingDays } from './working-days'

export type ApprovalContext = {
    durationDays: number
    daysInAdvance: number
    department: string | null
    locationId: string | null
    team: string | null
    role: string
    userId: string
    leaveTypeId: string
    startDate: Date
    endDate: Date
    createdAt: Date
}

export type Condition = {
    field: string
    operator: string
    value: any
}

export type ApprovalRule = {
    id: string
    priority: number
    conditions: Condition[]
    outcome: ApprovalOutcome
}

/**
 * Build approval context from leave request and user
 */
export async function buildApprovalContext(
    leaveRequest: {
        userId: string
        leaveTypeId: string
        startDate: Date
        endDate: Date
        createdAt: Date
        days?: number | null
    },
    user: {
        department: string | null
        locationId: string | null
        team: string | null
        role: string
    }
): Promise<ApprovalContext> {
    // Calculate duration in working days
    const durationDays = leaveRequest.days ?? 
        await calculateWorkingDays(leaveRequest.startDate, leaveRequest.endDate, leaveRequest.userId)
    
    // Calculate days in advance
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(leaveRequest.startDate)
    startDate.setHours(0, 0, 0, 0)
    const daysInAdvance = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
        durationDays,
        daysInAdvance,
        department: user.department,
        locationId: user.locationId,
        team: user.team,
        role: user.role,
        userId: leaveRequest.userId,
        leaveTypeId: leaveRequest.leaveTypeId,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        createdAt: leaveRequest.createdAt,
    }
}

/**
 * Evaluate a single condition against the context
 */
function evaluateCondition(condition: Condition, context: ApprovalContext): boolean {
    const { field, operator, value } = condition
    
    // Get the field value from context
    let fieldValue: any
    switch (field) {
        case 'durationDays':
            fieldValue = context.durationDays
            break
        case 'daysInAdvance':
            fieldValue = context.daysInAdvance
            break
        case 'department':
            fieldValue = context.department
            break
        case 'locationId':
            fieldValue = context.locationId
            break
        case 'team':
            fieldValue = context.team
            break
        case 'role':
            fieldValue = context.role
            break
        default:
            return false // Unknown field
    }
    
    // Evaluate based on operator
    switch (operator) {
        case '==':
            return fieldValue === value
        case '!=':
            return fieldValue !== value
        case '<':
            return typeof fieldValue === 'number' && fieldValue < value
        case '<=':
            return typeof fieldValue === 'number' && fieldValue <= value
        case '>':
            return typeof fieldValue === 'number' && fieldValue > value
        case '>=':
            return typeof fieldValue === 'number' && fieldValue >= value
        case 'IN':
            return Array.isArray(value) && value.includes(fieldValue)
        case 'NOT_IN':
            return Array.isArray(value) && !value.includes(fieldValue)
        default:
            return false // Unknown operator
    }
}

/**
 * Evaluate all conditions (AND logic)
 */
function evaluateConditions(conditions: Condition[], context: ApprovalContext): boolean {
    if (conditions.length === 0) return true // No conditions = always match
    return conditions.every(condition => evaluateCondition(condition, context))
}

/**
 * Evaluate approval policy for a leave request
 * Returns the outcome and approver chain if needed
 */
export async function evaluateApprovalPolicy(
    leaveRequest: {
        userId: string
        leaveTypeId: string
        startDate: Date
        endDate: Date
        createdAt: Date
        days?: number | null
    },
    user: {
        department: string | null
        locationId: string | null
        team: string | null
        role: string
    }
): Promise<{
    outcome: ApprovalOutcome
    approvers: string[]
}> {
    // Look up approval policy for this leave type
    const policy = await prisma.leaveTypeApprovalPolicy.findUnique({
        where: { leaveTypeId: leaveRequest.leaveTypeId },
        include: {
            rules: {
                orderBy: { priority: 'asc' },
            },
        },
    })
    
    // If no policy or policy is inactive, default to manager approval
    if (!policy || !policy.isActive) {
        console.log(`[ApprovalPolicy] No policy or inactive for leaveTypeId: ${leaveRequest.leaveTypeId}, defaulting to REQUIRES_MANAGER_APPROVAL`)
        return {
            outcome: 'REQUIRES_MANAGER_APPROVAL',
            approvers: [], // Will be resolved later
        }
    }
    
    // Build approval context
    const context = await buildApprovalContext(leaveRequest, user)
    
    console.log(`[ApprovalPolicy] Evaluating policy for leaveTypeId: ${leaveRequest.leaveTypeId}`)
    console.log(`[ApprovalPolicy] Context: durationDays=${context.durationDays}, daysInAdvance=${context.daysInAdvance}`)
    console.log(`[ApprovalPolicy] Policy fallbackOutcome: ${policy.fallbackOutcome}`)
    console.log(`[ApprovalPolicy] Number of rules: ${policy.rules.length}`)
    
    // Evaluate rules in priority order
    for (const rule of policy.rules) {
        const conditions = rule.conditions as Condition[]
        const ruleMatches = evaluateConditions(conditions, context)
        
        // Log rule evaluation details
        console.log(`[ApprovalPolicy] Rule ${rule.id} (priority ${rule.priority}):`)
        conditions.forEach((condition, idx) => {
            const conditionResult = evaluateCondition(condition, context)
            console.log(`  Condition ${idx + 1}: ${condition.field} ${condition.operator} ${condition.value} = ${conditionResult}`)
        })
        console.log(`  Rule matches: ${ruleMatches}`)
        
        if (ruleMatches) {
            // Rule matched - return its outcome
            console.log(`[ApprovalPolicy] Rule matched, returning outcome: ${rule.outcome}`)
            return {
                outcome: rule.outcome,
                approvers: [], // Will be resolved later based on outcome
            }
        }
    }
    
    // No rule matched - use fallback outcome
    console.log(`[ApprovalPolicy] No rules matched, using fallback outcome: ${policy.fallbackOutcome}`)
    
    // Ensure fallback outcome is a valid ApprovalOutcome enum value
    const fallbackOutcome = policy.fallbackOutcome as ApprovalOutcome
    if (!Object.values(ApprovalOutcome).includes(fallbackOutcome)) {
        console.error(`[ApprovalPolicy] Invalid fallback outcome: ${fallbackOutcome}, defaulting to REQUIRES_MANAGER_APPROVAL`)
        return {
            outcome: ApprovalOutcome.REQUIRES_MANAGER_APPROVAL,
            approvers: [],
        }
    }
    
    return {
        outcome: fallbackOutcome,
        approvers: [], // Will be resolved later
    }
}
