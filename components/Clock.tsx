'use client'

import { useState, useEffect } from 'react'

export default function Clock() {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [timezone, setTimezone] = useState<string>('')
  const [utcTime, setUtcTime] = useState<string>('')
  const [utcDate, setUtcDate] = useState<string>('')

  useEffect(() => {
    // Function to update the time and date
    const updateDateTime = () => {
      const now = new Date()
      
      // Format local time as HH:MM:SS
      const timeString = now.toLocaleTimeString()
      
      // Format local date as dd-MMM-yyyy
      const day = String(now.getDate()).padStart(2, '0')
      const month = now.toLocaleString('en-US', { month: 'short' })
      const year = now.getFullYear()
      const dateString = `${day}-${month}-${year}`
      
      // Get timezone abbreviation
      const timezoneString = now.toLocaleDateString(undefined, { 
        timeZoneName: 'short' 
      }).split(', ')[1] || Intl.DateTimeFormat().resolvedOptions().timeZone
      
      // Format UTC time
      const utcTimeString = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        timeZone: 'UTC'
      })
      
      // Format UTC date
      const utcDay = String(now.getUTCDate()).padStart(2, '0')
      const utcMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        .toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
      const utcYear = now.getUTCFullYear()
      const utcDateString = `${utcDay}-${utcMonth}-${utcYear}`
      
      setTime(timeString)
      setDate(dateString)
      setTimezone(timezoneString)
      setUtcTime(utcTimeString)
      setUtcDate(utcDateString)
    }

    // Update time immediately
    updateDateTime()
    
    // Update time every second
    const intervalId = setInterval(updateDateTime, 1000)
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId)
  }, [])

  return (
    <div className="text-sm text-muted-foreground flex flex-col items-center">
      <div className="flex items-center">
        <span className="font-medium font-mono">{time}</span>
        <span className="ml-2">({timezone})</span>
      </div>
      <div className="mt-1">
        <span>{date}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-muted w-full text-center">
        <div className="flex items-center justify-center">
          <span className="font-medium font-mono">{utcTime}</span>
          <span className="ml-2">(UTC)</span>
        </div>
        <div className="mt-1">
          <span>{utcDate}</span>
        </div>
      </div>
    </div>
  )
} 