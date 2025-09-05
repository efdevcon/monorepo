"use client"

import { useEffect, useState } from "react"
import { createClient, type SupabaseClient, type User, type AuthError, type AuthChangeEvent, type Session } from "@supabase/supabase-js"
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export type UseUserResult = {
  user: User | null
  loading: string | false
  error: string | null
  hasInitialized: boolean
  sendOtp: (email?: string) => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<void>
  signOut: () => Promise<void>
  supabase: SupabaseClient | null
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<string | false>('Initializing...')
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [lastToastUserId, setLastToastUserId] = useState<string | null>(null)
  const router = useRouter()
  
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const newUser = session?.user ?? null
      const wasSignedIn = user !== null
      const isNowSignedIn = newUser !== null
      
      setUser(newUser)
      setLoading(false)
      setHasInitialized(true)
      
      // Toast notifications for auth state changes
      // Only show toast if this is an actual state change and we haven't already shown a toast for this user
      if (event === 'SIGNED_IN' && isNowSignedIn && !wasSignedIn && hasInitialized && newUser?.id !== lastToastUserId) {
        toast.success('Successfully signed in!')
        setLastToastUserId(newUser?.id ?? null)
      } else if (event === 'SIGNED_OUT' && !isNowSignedIn && wasSignedIn && hasInitialized) {
        toast.success('Successfully signed out!')
        setLastToastUserId(null)
      } else if (event === 'TOKEN_REFRESHED') {
        // Silently handle token refresh, no toast needed
      }
    })

    // Check initial session
    supabase.auth.getUser().then(({ data, error }: { data: { user: User | null }; error: AuthError | null }) => {
      if (error) {
        // Only show errors for actual authentication failures, not missing sessions
        // Common "no session" errors that we should ignore:
        const ignoreErrors = [
          'Invalid JWT',
          'JWT expired',
          'Auth session missing',
          'No user found',
          'User not found'
        ]

        const shouldIgnore = ignoreErrors.some(ignoreError =>
          error.message.includes(ignoreError)
        )

        if (!shouldIgnore) {
          setError(error.message)
          // Only show toast errors after initialization to avoid showing errors on page load
          if (hasInitialized) {
            toast.error(`Authentication error: ${error.message}`)
          }
        }
      }
      setUser(data.user ?? null)
      // Set the last toast user ID to prevent showing sign-in toast on initial load
      if (data.user?.id) {
        setLastToastUserId(data.user.id)
      }
      setLoading(false)
      setHasInitialized(true)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const sendOtp = async (email?: string) => {
    try {
        if (!email) throw new Error('Email is required')
        if (!supabase) throw new Error('Supabase not initialized')
      setLoading('Sending OTP...')
        setError(null)

      const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            // OTP and magic link share an email template on supabase, but we need to render two different emails depending on which one we are using
            // There is no way to send in custom data to the email template, other than the redirect url - luckily the OTP flow does not use the redirect url anyway, so we can set it and use it as a conditional to render the OTP email instead of the magic link email
            // TL:DR; do not touch/change this redirect url unless you know what you are doing, it has to match exactly
            emailRedirectTo: 'https://app.devconnect.org' 
          },
        })
        
        if (error) {
          throw error
        }
        
      toast.success('OTP sent! Check your email.')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(errorMessage)
      toast.error(`Failed to send OTP: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (email: string, token: string) => {
    try {
      if (!email) throw new Error('Email is required')
      if (!token) throw new Error('OTP is required')
      if (!supabase) throw new Error('Supabase not initialized')
      setLoading('Verifying OTP...')
      setError(null)

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })

      if (error) {
        throw error
      }

      toast.success('OTP verified successfully!')
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        setError(errorMessage)
      toast.error(`Failed to verify OTP: ${errorMessage}`)
    } finally {
        setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading('Signing out...')

    try {
        if (!supabase) throw new Error('Supabase not initialized')
        const { error } = await supabase.auth.signOut()
        
        if (error) {
            throw error
        }

        setUser(null)

        router.push('/onboarding')
        
        toast.success('Successfully signed out!')
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        setError(errorMessage)
        toast.error(`Failed to sign out: ${errorMessage}`)
    } finally {
        setLoading(false)
    }
  }

  return {
    user,
    loading,
    error,
    hasInitialized,
    sendOtp,
    verifyOtp,
    signOut,
    supabase,
  }
}
