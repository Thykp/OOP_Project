import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { Navigate } from "react-router-dom"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signInWithPassword: (opts: { email: string; password: string }) => Promise<{ error: Error | null }>
  signUpWithPassword: (opts: {
    email: string
    password: string
    data?: Record<string, any>
  }) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // initial load
  useEffect(() => {
    let isMounted = true

    const getInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!isMounted) return
      if (error) {
        console.error("getSession error:", error)
      }
      setSession(data?.session ?? null)
      setUser(data?.session?.user ?? null)
      setIsLoading(false)
    }

    getInitialSession()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })

    return () => {
      isMounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword: AuthContextType["signInWithPassword"] = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ?? null }
  }

  const signUpWithPassword: AuthContextType["signUpWithPassword"] = async ({ email, password, data }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data },
    })
    return { error: error ?? null }
  }

  const signOut: AuthContextType["signOut"] = async () => {
    const { error } = await supabase.auth.signOut()
    return { error: error ?? null }
  }

  const value = useMemo(
    () => ({ user, session, isLoading, signInWithPassword, signUpWithPassword, signOut }),
    [user, session, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

/** Guard for private routes: wraps children and sends unauthenticated users to /signin */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-sm text-muted-foreground">
        Checking your session…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  return <>{children}</>
}

export function RoleProtectedRoute({ children, role }: { children: React.ReactNode, role: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-sm text-muted-foreground">
        Checking your session…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!role.includes(user.user_metadata.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
