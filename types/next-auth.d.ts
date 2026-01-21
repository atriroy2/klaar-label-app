import 'next-auth'
import { Role } from '../lib/auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      role: Role
      tenantId?: string | null
    }
  }
} 