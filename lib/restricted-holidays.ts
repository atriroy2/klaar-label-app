import prisma from './prisma'
import { HolidayType } from '@prisma/client'

/**
 * Check if all days in a date range are restricted holidays for a user's location
 * Returns validation result with details
 */
export async function validateRestrictedHolidaysRange(
    start: Date,
    end: Date,
    userId: string
): Promise<{
    isValid: boolean
    invalidDays: Date[]
    message?: string
}> {
    // Get user's location
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            location: true,
        },
    })

    if (!user || !user.location) {
        return {
            isValid: false,
            invalidDays: [],
            message: 'User location not found',
        }
    }

    const location = user.location
    const year = start.getFullYear()

    // Get all restricted holidays for the year and user's location
    const holidays = await prisma.holiday.findMany({
        where: {
            tenantId: user.tenantId!,
            year: year,
            holidayLocations: {
                some: {
                    locationId: location.id,
                    applicable: true,
                    type: HolidayType.RESTRICTED,
                },
            },
        },
        include: {
            holidayLocations: {
                where: {
                    locationId: location.id,
                    applicable: true,
                    type: HolidayType.RESTRICTED,
                },
            },
        },
    })

    // Get location work schedule
    const workSchedule = location.workSchedule as {
        weeks: Array<{
            week: number
            saturday: boolean
            sunday: boolean
        }>
    }

    const invalidDays: Date[] = []
    const current = new Date(start)
    current.setHours(0, 0, 0, 0)
    const endDate = new Date(end)
    endDate.setHours(23, 59, 59, 999)

    while (current <= endDate) {
        const dayOfWeek = current.getDay() // 0 = Sunday, 6 = Saturday

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

        // If it's not a working day, it can't be a restricted holiday
        if (!isWorkingDay) {
            invalidDays.push(new Date(current))
            current.setDate(current.getDate() + 1)
            continue
        }

        // Check if it's a restricted holiday for this location
        const holiday = holidays.find(h => {
            const holidayDate = new Date(h.date)
            holidayDate.setHours(0, 0, 0, 0)
            return holidayDate.getTime() === current.getTime()
        })

        if (!holiday || holiday.holidayLocations.length === 0) {
            // This day is not a restricted holiday
            invalidDays.push(new Date(current))
        }

        current.setDate(current.getDate() + 1)
    }

    if (invalidDays.length > 0) {
        return {
            isValid: false,
            invalidDays,
            message: `The following days are not restricted holidays: ${invalidDays.map(d => d.toLocaleDateString()).join(', ')}`,
        }
    }

    return {
        isValid: true,
        invalidDays: [],
    }
}

/**
 * Calculate the number of restricted holidays in a date range for a user's location
 */
export async function calculateRestrictedHolidayDays(
    start: Date,
    end: Date,
    userId: string
): Promise<number> {
    // Get user's location
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            location: true,
        },
    })

    if (!user || !user.location) {
        return 0
    }

    const location = user.location
    const year = start.getFullYear()

    // Get all restricted holidays for the year and user's location
    const holidays = await prisma.holiday.findMany({
        where: {
            tenantId: user.tenantId!,
            year: year,
            holidayLocations: {
                some: {
                    locationId: location.id,
                    applicable: true,
                    type: HolidayType.RESTRICTED,
                },
            },
        },
        include: {
            holidayLocations: {
                where: {
                    locationId: location.id,
                    applicable: true,
                    type: HolidayType.RESTRICTED,
                },
            },
        },
    })

    // Get location work schedule
    const workSchedule = location.workSchedule as {
        weeks: Array<{
            week: number
            saturday: boolean
            sunday: boolean
        }>
    }

    let count = 0
    const current = new Date(start)
    current.setHours(0, 0, 0, 0)
    const endDate = new Date(end)
    endDate.setHours(23, 59, 59, 999)

    while (current <= endDate) {
        const dayOfWeek = current.getDay() // 0 = Sunday, 6 = Saturday

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

        // Only count if it's a working day AND a restricted holiday
        if (isWorkingDay) {
            const holiday = holidays.find(h => {
                const holidayDate = new Date(h.date)
                holidayDate.setHours(0, 0, 0, 0)
                return holidayDate.getTime() === current.getTime()
            })

            if (holiday && holiday.holidayLocations.length > 0) {
                count++
            }
        }

        current.setDate(current.getDate() + 1)
    }

    return count
}

