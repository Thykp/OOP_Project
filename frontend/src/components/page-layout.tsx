import type React from "react"
import { Navigation } from "./navigation"

interface PageLayoutProps {
  children: React.ReactNode
  variant?: "landing" | "auth"
  className?: string
}

export function PageLayout({ children, variant = "landing", className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <Navigation variant={variant} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
