import * as React from "react"

type ToastItem = {
  id: number
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

type ToastContextType = {
  toasts: ToastItem[]
  toast: (t: Omit<ToastItem, "id">) => void
  dismiss: (id: number) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function ToastProviderCtx({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const toast = (t: Omit<ToastItem, "id">) =>
    setToasts(prev => [...prev, { id: Date.now() + Math.random(), ...t }])
  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))
  return <ToastContext.Provider value={{ toasts, toast, dismiss }}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <Toaster /> (provider)")
  return ctx
}
