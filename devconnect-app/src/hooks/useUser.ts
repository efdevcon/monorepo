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
  sendMagicLink: (redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
  supabase: SupabaseClient | null
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<string | false>('Initializing...')
  const [error, setError] = useState<string | null>(null)

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
        setError(error.message)
        toast.error(`Authentication error: ${error.message}`)
      }
      setUser(data.user ?? null)
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const sendMagicLink = async (redirectTo?: string) => {
      
      
      try {
        const email = prompt('Enter your email')
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
    sendMagicLink,
    signOut,
    supabase,
  }
}
