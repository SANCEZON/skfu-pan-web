import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UserProfile {
  user_id: string
  full_name?: string | null
  status: 'pending' | 'approved' | 'rejected'
  invitation_id?: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profile: UserProfile | null
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, inviteToken?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const fetchProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist yet - this is OK
          console.log('Profile not found for user:', currentUser.id)
          setProfile(null)
        } else {
          console.error('Failed to fetch profile:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            userId: currentUser.id
          })
          throw error
        }
      } else {
        console.log('Profile fetched successfully:', data)
        setProfile(data)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        console.log('Initializing auth...')
        console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'MISSING')
        console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'MISSING')

        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout after 10s')), 10000)
        )

        const {
          data: { session },
          error: sessionError
        } = await Promise.race([sessionPromise, timeoutPromise]) as any

        if (!mounted) return

        if (sessionError) {
          console.error('Session error:', sessionError)
          throw sessionError
        }

        console.log('Session retrieved:', session ? 'exists' : 'none')
        if (session) {
          console.log('Session user ID:', session.user?.id)
          console.log('Session expires at:', session.expires_at)
        }

        setSession(session)
        setUser(session?.user || null)
        if (session?.user) {
          console.log('User found, fetching profile...', session.user.id)
          await fetchProfile(session.user)
        } else {
          console.log('No user in session')
          setProfile(null)
          setProfileLoading(false)
        }
      } catch (error) {
        if (!mounted) return
        console.error('Failed to initialize auth:', error)
        if (error instanceof Error) {
          console.error('Error message:', error.message)
          console.error('Error stack:', error.stack)
        }
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        if (mounted) {
          setLoading(false)
          setProfileLoading(false)
          console.log('Auth initialization complete')
        }
      }
    }

    initAuth()

    return () => {
      mounted = false
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log('Auth state changed:', event, session ? 'has session' : 'no session')
        setSession(session)
        setUser(session?.user || null)
        if (session?.user) {
          await fetchProfile(session.user)
        } else {
          setProfile(null)
          setProfileLoading(false)
        }
      } catch (error) {
        console.error('Auth state change handling failed:', error)
        setProfile(null)
        setProfileLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('Sign in error:', error)
      // Provide more user-friendly error messages
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        throw new Error('Email не подтвержден. Проверьте почту и перейдите по ссылке подтверждения.')
      } else if (error.message.includes('Invalid login credentials')) {
        throw new Error('Неверный email или пароль')
      } else if (error.message.includes('Too many requests')) {
        throw new Error('Слишком много попыток. Подождите немного и попробуйте снова.')
      }
      throw error
    }

    setUser(data.user)
    setSession(data.session)
    await fetchProfile(data.user)
  }

  const signUp = async (email: string, password: string, inviteToken?: string) => {
    if (!inviteToken) {
      throw new Error('Необходимо ввести код приглашения')
    }

    console.log('Checking invitation with token:', inviteToken)

    // Use RPC function to get invitation by token (works for anonymous users)
    const { data: invitationData, error: invitationError } = await supabase
      .rpc('get_invitation_by_token', { invite_token: inviteToken })

    if (invitationError) {
      console.error('Error fetching invitation:', invitationError)
      console.error('Error details:', {
        code: invitationError.code,
        message: invitationError.message,
        details: invitationError.details,
        hint: invitationError.hint
      })
      throw new Error('Приглашение не найдено или уже использовано')
    }

    console.log('Invitation data:', invitationData)

    if (!invitationData || invitationData.length === 0) {
      throw new Error('Приглашение не найдено, истекло или уже использовано')
    }

    const invitation = invitationData[0]

    if (invitation.status !== 'pending') {
      throw new Error('Приглашение уже обработано')
    }

    if (invitation.email !== email) {
      throw new Error('Email не совпадает с приглашением')
    }

    console.log('Invitation validated, creating user account...')

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      throw error
    }

    if (data.user) {
      console.log('User created, creating profile...', data.user.id)

      // Use RPC function to create profile (works even if session is not fully established)
      const { error: profileError } = await supabase
        .rpc('create_user_profile', {
          p_user_id: data.user.id,
          p_invitation_id: invitation.id,
          p_status: 'pending'
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Try direct insert as fallback
        const { error: directError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: data.user.id,
            status: 'pending',
            invitation_id: invitation.id,
          })

        if (directError) {
          console.error('Direct insert also failed:', directError)
          throw new Error('Не удалось создать профиль пользователя')
        }
      }

      console.log('Profile created, updating invitation...')

      // Update invitation status
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ status: 'accepted', used_at: new Date().toISOString() })
        .eq('id', invitation.id)

      if (updateError) {
        console.error('Error updating invitation:', updateError)
        // Don't throw - profile is created, invitation update is less critical
      }

      setUser(data.user)
      setSession(data.session)
      
      // Wait a bit for profile to be available
      await new Promise(resolve => setTimeout(resolve, 500))
      await fetchProfile(data.user)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profile,
        profileLoading,
        refreshProfile: () => fetchProfile(user),
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
