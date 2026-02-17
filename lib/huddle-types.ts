export type HuddleStatus = 'recording' | 'transcribing' | 'processing' | 'ready' | 'failed'
export type MeetingPlatform = 'slack' | 'zoom' | 'google_meet'

export interface HuddleListItem {
  id: string
  slack_channel_name: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  status: HuddleStatus
  summary_english: string | null
  key_topics: string[]
  action_items: ActionItem[]
  participant_count: number
  participants: ParticipantSummary[]
  is_shared: boolean
  meeting_platform: MeetingPlatform
  meeting_title: string | null
}

export interface AdminHuddleListItem {
  id: string
  slack_channel_name: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  status: HuddleStatus
  participant_count: number
  participants: ParticipantSummary[]
  is_shared: boolean
  meeting_platform: MeetingPlatform
  meeting_title: string | null
}

export interface HuddleDetail {
  id: string
  slack_channel_name: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  status: HuddleStatus
  summary_english: string | null
  action_items: ActionItem[]
  key_topics: string[]
  is_shared: boolean
  shared_by: string | null
  has_recording: boolean
  participants: ParticipantDetail[]
  meeting_platform: MeetingPlatform
  meeting_title: string | null
}

export interface RecordingResponse {
  url: string
  source: 'gcs' | 'recall'
}

export interface ActionItem {
  text: string
  assignee?: string
}

export interface ParticipantSummary {
  name: string
  email: string | null
}

export interface ParticipantDetail {
  name: string
  email: string | null
  joined_at: string | null
  left_at: string | null
  is_host: boolean
}

export interface TranscriptUtterance {
  id: string
  speaker_name: string
  speaker_email: string | null
  text_original: string
  text_english: string | null
  start_time_seconds: number
  end_time_seconds: number
  sequence_number: number
}

export interface ChatSource {
  huddle_id: string
  channel_name: string | null
  date: string
  start_time_seconds: number
  end_time_seconds: number
  text_snippet: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
}

export interface HuddleListResponse {
  huddles: HuddleListItem[]
  total: number
  page: number
  limit: number
}

export interface TranscriptResponse {
  huddle_id: string
  utterances: TranscriptUtterance[]
}

export interface ChatResponse {
  response: string
  sources: ChatSource[]
}

export interface ZoomJoinRequest {
  meeting_url: string
  bot_name: string
  meeting_title?: string
}

export interface ZoomJoinResponse {
  huddle_id: string
  bot_id: string
  status: string
}

export interface GoogleMeetJoinRequest {
  meeting_url: string
  bot_name: string
  meeting_title?: string
}

export interface GoogleMeetJoinResponse {
  huddle_id: string
  bot_id: string
  status: string
}
