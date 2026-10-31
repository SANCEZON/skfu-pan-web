import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

export type Invitation = Database['public']['Tables']['user_invitations']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  user_email?: string | null
}
export type ApprovalLog = Database['public']['Tables']['approval_logs']['Row']

const generateToken = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export async function getInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    throw new Error(error.message)
  }

  return data || []
}

export async function getPendingProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(
      `
        *,
        user_invitations:user_invitations(
          email
        )
      `
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching pending profiles:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    throw new Error(error.message)
  }

  console.log('Pending profiles fetched:', data?.length || 0)

  return (
    data?.map((profile: any) => ({
      ...profile,
      user_email: profile.user_invitations?.email || null,
    })) || []
  )
}

export async function getApprovalLogs(limit = 50): Promise<ApprovalLog[]> {
  const { data, error } = await supabase
    .from('approval_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function createInvitation(payload: {
  email: string
  expires_at: string | null
  note?: string | null
  created_by?: string | null
}): Promise<Invitation> {
  const token = generateToken()
  const { data, error } = await supabase
    .from('user_invitations')
    .insert({
      email: payload.email,
      token,
      status: 'pending',
      note: payload.note || null,
      expires_at: payload.expires_at,
      created_by: payload.created_by || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateInvitationStatus(
  id: string,
  status: Invitation['status'],
  actedBy?: string | null
): Promise<Invitation> {
  const updates: Partial<Invitation> = { status }
  if (status === 'accepted') {
    updates.used_at = new Date().toISOString()
    updates.approved_by = actedBy || null
  }

  const { data, error } = await supabase
    .from('user_invitations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function logApprovalAction(entry: {
  invitation_id?: string | null
  target_email: string
  action: ApprovalLog['action']
  acted_by?: string | null
  details?: string | null
}): Promise<void> {
  const { error } = await supabase.from('approval_logs').insert({
    invitation_id: entry.invitation_id || null,
    target_email: entry.target_email,
    action: entry.action,
    acted_by: entry.acted_by || null,
    details: entry.details || null,
  })

  if (error) {
    console.error('Failed to log approval action:', error)
  }
}

export async function approveProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ status: 'approved' })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function rejectProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ status: 'rejected' })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
