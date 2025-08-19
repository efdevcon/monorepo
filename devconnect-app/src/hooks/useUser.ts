"use client"

import { useEffect, useState } from "react"
import { createClient, type SupabaseClient, type User, type AuthError, type AuthChangeEvent, type Session } from "@supabase/supabase-js"
import { toast } from 'sonner';

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
  sendMagicLink: (email?: string, redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
  supabase: SupabaseClient | null
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<string | false>('Initializing...')
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

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
      if (event === 'SIGNED_IN' && isNowSignedIn && !wasSignedIn) {
        toast.success('Successfully signed in!')
      } else if (event === 'SIGNED_OUT' && !isNowSignedIn && wasSignedIn) {
        toast.success('Successfully signed out!')
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
      setLoading(false)
      setHasInitialized(true)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const sendMagicLink = async (email?: string, redirectTo?: string) => {
    try {
        if (!email) throw new Error('Email is required')
        if (!supabase) throw new Error('Supabase not initialized')
        setLoading('Sending magic link...')
        setError(null)

        const redirect = redirectTo ?? (typeof window !== "undefined" ? window.location.href : undefined)
        
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirect,
          },
        })
        
        if (error) {
          throw error
        }
        
        toast.success('Magic link sent! Check your email.')
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        setError(errorMessage)
        toast.error(`Failed to send magic link: ${errorMessage}`)
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
    sendMagicLink,
    signOut,
    supabase,
  }
}
