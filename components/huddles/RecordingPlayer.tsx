'use client'

import { useState, useCallback } from 'react'
import { Video, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { RecordingResponse } from '@/lib/huddle-types'

interface RecordingPlayerProps {
  huddleId: string
}

type PlayerState = 'idle' | 'loading' | 'ready' | 'error'

export function RecordingPlayer({ huddleId }: RecordingPlayerProps) {
  const [state, setState] = useState<PlayerState>('idle')
  const [recording, setRecording] = useState<RecordingResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const fetchRecording = useCallback(async () => {
    setState('loading')
    setErrorMessage('')

    try {
      const res = await fetch(`/api/huddles/${huddleId}/recording`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load recording (${res.status})`)
      }

      const data: RecordingResponse = await res.json()
      setRecording(data)
      setState('ready')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load recording'
      setErrorMessage(message)
      setState('error')
    }
  }, [huddleId])

  if (state === 'idle') {
    return (
      <Card>
        <CardContent className="py-6">
          <Button variant="outline" onClick={fetchRecording} className="gap-2">
            <Video className="h-4 w-4" />
            Watch Recording
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (state === 'loading') {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading recording...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state === 'error') {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </div>
            <Button variant="outline" size="sm" onClick={fetchRecording} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // state === 'ready'
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Video className="h-5 w-5" />
            Recording
          </h2>
          {recording && (
            <a
              href={recording.url}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recording && (
          <video
            controls
            className="w-full rounded-lg bg-black"
            preload="metadata"
          >
            <source src={recording.url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
      </CardContent>
    </Card>
  )
}
