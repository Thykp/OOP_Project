"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Calendar, Menu } from "lucide-react"

interface NavigationProps {
  variant?: "landing" | "auth"
}

export function Navigation({ variant = "landing" }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const pathname = location.pathname

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#about", label: "About" },
    { href: "#contact", label: "Contact" },
  ]

  const isAuthPage = pathname === "/signin" || pathname === "/signup"

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">SingHealth Clinic</span>
        </Link>

        {/* Desktop Navigation */}
        {variant === "landing" && (
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} className="text-gray-600 hover:text-blue-600 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Auth Navigation for auth pages */}
        {variant === "auth" && (
          <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
            <span>Back to Home</span>
          </Link>
        )}

        {/* Desktop Auth Buttons */}
        {variant === "landing" && (
          <div className="hidden md:flex items-center space-x-3">
            <Link to="/signin">
              <Button variant="ghost" className="text-gray-600 hover:text-blue-600">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Get Started</Button>
            </Link>
          </div>
        )}

        {/* Mobile Menu */}
        {variant === "landing" && (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col space-y-6 mt-6">
                {/* Mobile Logo */}
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-semibold text-gray-900">SingHealth Clinic</span>
                </div>

                {/* Mobile Navigation Links */}
                <nav className="flex flex-col space-y-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="text-gray-600 hover:text-blue-600 transition-colors text-lg"
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile Auth Buttons */}
                <div className="flex flex-col space-y-3 pt-6 border-t">
                  <Link to="/signin" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-gray-600 hover:text-blue-600">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Get Started</Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  )
}
