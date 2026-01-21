import prisma from './prisma'
import { HolidayType } from '@prisma/client'

/**
 * Calculate working days between two dates, considering:
 * - Location's work schedule (week-wise Saturday/Sunday working days)
 * - Mandatory holidays
 * - Restricted holidays (if includeRestricted is true)
 */
export async function calculateWorkingDays(
    start: Date,
    end: Date,
    userId?: string,
    includeRestricted: boolean = false
): Promise<number> {
    // If no user provided, use simple weekday calculation
    if (!userId) {
        return calculateSimpleWorkingDays(start, end)
    }

    // Get user's location
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            location: true,
        },
    })

    if (!user || !user.location) {
        // Fallback to simple calculation if user has no location
        return calculateSimpleWorkingDays(start, end)
    }

    const location = user.location
    const workSchedule = location.workSchedule as {
        weeks: Array<{
            week: number
            saturday: boolean
            sunday: boolean
        }>
    }

    // Get all holidays for the year and user's location
    const year = start.getFullYear()
    const holidays = await prisma.holiday.findMany({
        where: {
            tenantId: user.tenantId!,
            year: year,
            holidayLocations: {
                some: {
                    locationId: location.id,
                    applicable: true,
                },
            },
        },
        include: {
            holidayLocations: {
                where: {
                    locationId: location.id,
                    applicable: true,
                },
            },
        },
    })

    let count = 0
    const current = new Date(start)
    current.setHours(0, 0, 0, 0)
    const endDate = new Date(end)
    endDate.setHours(23, 59, 59, 999)

    while (current <= endDate) {
        const dayOfWeek = current.getDay() // 0 = Sunday, 6 = Saturday
        const dateStr = current.toISOString().split('T')[0]

        // Determine which week of the month (1-5)
        const weekOfMonth = Math.ceil(current.getDate() / 7)
        const weekIndex = Math.min(weekOfMonth - 1, 4) // Cap at index 4 (week 5)
        const weekConfig = workSchedule.weeks[weekIndex] || workSchedule.weeks[0]

        // Check if it's a working day based on location schedule
        let isWorkingDay = false
        if (dayOfWeek === 0) {
            // Sunday
            isWorkingDay = weekConfig.sunday
        } else if (dayOfWeek === 6) {
            // Saturday
            isWorkingDay = weekConfig.saturday
        } else {
            // Monday to Friday
            isWorkingDay = true
        }

        // Check if it's a holiday for this location
        const holiday = holidays.find(h => {
            const holidayDate = new Date(h.date)
            holidayDate.setHours(0, 0, 0, 0)
            return holidayDate.getTime() === current.getTime()
        })

        if (holiday && holiday.holidayLocations.length > 0) {
            const holidayLocation = holiday.holidayLocations[0] // Should only be one for this location
            if (holidayLocation.type === HolidayType.MANDATORY) {
                isWorkingDay = false
            }
            // Restricted holidays are working days - they don't automatically exclude days from leave balance
            // Users must separately apply for restricted holidays as leave
        }

        if (isWorkingDay) {
            count++
        }

        current.setDate(current.getDate() + 1)
    }

    return count
}

/**
 * Simple working days calculation (excludes weekends only)
 * Used as fallback when user has no location
 */
function calculateSimpleWorkingDays(start: Date, end: Date): number {
    let count = 0
    const current = new Date(start)
    current.setHours(0, 0, 0, 0)
    const endDate = new Date(end)
    endDate.setHours(23, 59, 59, 999)

    while (current <= endDate) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++
        }
        current.setDate(current.getDate() + 1)
    }

    return count
}

