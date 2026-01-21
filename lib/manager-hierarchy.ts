import prisma from './prisma'

/**
 * Get the direct manager of a user
 */
export async function getManager(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { managerId: true },
    })
    return user?.managerId || null
}

/**
 * Get the manager's manager (second level)
 */
export async function getManagerManager(userId: string): Promise<string | null> {
    const managerId = await getManager(userId)
    if (!managerId) return null
    return getManager(managerId)
}

/**
 * Get all team members in a manager's hierarchy (direct and indirect reports)
 * Returns a flat array of all user IDs who report to the manager (recursively)
 */
export async function getAllTeamMembers(managerId: string, tenantId: string): Promise<string[]> {
    const teamMemberIds: string[] = []
    
    // Recursive function to get all reports
    async function getReportsRecursive(currentManagerId: string) {
        const directReports = await prisma.user.findMany({
            where: {
                managerId: currentManagerId,
                tenantId: tenantId,
                isActive: true,
            },
            select: {
                id: true,
            },
        })
        
        for (const report of directReports) {
            teamMemberIds.push(report.id)
            // Recursively get their reports
            await getReportsRecursive(report.id)
        }
    }
    
    await getReportsRecursive(managerId)
    return teamMemberIds
}

/**
 * Get the approver chain based on approval outcome
 * Returns array of user IDs who need to approve (in order)
 */
export async function getApproverChain(
    userId: string,
    outcome: 'REQUIRES_MANAGER_APPROVAL' | 'REQUIRES_MANAGER_MANAGER_APPROVAL'
): Promise<string[]> {
    const approvers: string[] = []
    
    if (outcome === 'REQUIRES_MANAGER_APPROVAL') {
        const managerId = await getManager(userId)
        if (managerId) {
            approvers.push(managerId)
        }
    } else if (outcome === 'REQUIRES_MANAGER_MANAGER_APPROVAL') {
        const managerId = await getManager(userId)
        if (managerId) {
            approvers.push(managerId)
            const managerManagerId = await getManager(managerId)
            if (managerManagerId) {
                approvers.push(managerManagerId)
            }
        }
    }
    
    // Remove duplicates (in case manager and manager's manager are the same)
    return [...new Set(approvers)]
}
