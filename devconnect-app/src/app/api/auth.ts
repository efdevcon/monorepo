import { NextRequest, NextResponse } from 'next/server'
import { createClient, type User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export type AuthResult = 
  | { success: true; user: User }
  | { success: false; error: NextResponse }

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  // Check Supabase configuration
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      error: NextResponse.json({ 
        error: 'Supabase configuration missing' 
      }, { status: 500 })
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  // Get the authorization header
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: NextResponse.json({ 
        error: 'Authorization header required' 
      }, { status: 401 })
    }
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Verify the JWT token and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    return {
      success: false,
      error: NextResponse.json({ 
        error: 'Invalid or expired token' 
      }, { status: 401 })
    }
  }

  return {
    success: true,
    user
  }
}