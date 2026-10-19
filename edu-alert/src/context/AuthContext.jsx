import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AuthContext } from './AuthContextDefinition'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured())
  const [authError, setAuthError] = useState(null)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId || !isSupabaseConfigured()) {
      setProfile(null)
      return null
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[EDU-ALERT] Error fetching user profile:', error.message)
        setAuthError(error.message)
        return null
      }

      if (data) {
        data.level = data.academic_level || data.level || 'ND 1'
      }
      setProfile(data)
      return data
    } catch (err) {
      console.error('[EDU-ALERT] Unexpected error fetching profile:', err)
      setAuthError(err.message || 'Failed to load profile')
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      return await fetchProfile(user.id)
    }
    return null
  }, [user, fetchProfile])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return
    }

    let isMounted = true

    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return

      if (error) {
        console.error('[EDU-ALERT] getSession error:', error.message)
        setAuthError(error.message)
        setIsLoading(false)
        return
      }

      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id).finally(() => {
          if (isMounted) setIsLoading(false)
        })
      } else {
        setUser(null)
        setProfile(null)
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return

      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email, password) => {
    setAuthError(null)
    setIsLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setIsLoading(false)
      setAuthError(error.message)
      throw error
    }

    if (data?.user) {
      setUser(data.user)
      const userProfile = await fetchProfile(data.user.id)
      setIsLoading(false)
      return { user: data.user, profile: userProfile }
    }

    setIsLoading(false)
    return data
  }

  const signUpStudent = async ({
    email,
    password,
    fullName,
    matricNumber,
    gender,
    level,
  }) => {
    setAuthError(null)
    setIsLoading(true)

    const cleanEmail = email.trim()
    const cleanMatric = matricNumber.trim().toUpperCase()

    // Public registration is strictly for students in SWD
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          matric_number: cleanMatric,
          gender,
          level,
          academic_level: level,
          role: 'student',
          department: 'SWD',
        },
      },
    })

    if (error) {
      setIsLoading(false)
      setAuthError(error.message)
      throw error
    }

    // If session immediately established or user created, ensure profile is stored
    if (data?.user) {
      let userProfile = await fetchProfile(data.user.id)
      if (!userProfile) {
        // Attempt insert as student if trigger didn't create profile
        const { error: insertErr } = await supabase.from('profiles').insert([
          {
            id: data.user.id,
            email: cleanEmail,
            full_name: fullName.trim(),
            role: 'student',
            department: 'SWD',
            gender,
            academic_level: level,
            matric_number: cleanMatric,
          },
        ])

        if (!insertErr) {
          userProfile = await fetchProfile(data.user.id)
        }
      }

      setIsLoading(false)
      return { user: data.user, profile: userProfile }
    }

    setIsLoading(false)
    return data
  }

  const signOut = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setAuthError(null)
    setIsLoading(false)
  }

  const value = {
    user,
    profile,
    role: profile?.role || null,
    isLoading,
    authError,
    signIn,
    signUpStudent,
    signOut,
    refreshProfile,
    isConfigured: isSupabaseConfigured(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
