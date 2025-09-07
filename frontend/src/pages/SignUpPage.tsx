"use client"

import type React from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, Check, X } from "lucide-react"
import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"

type Role = "ROLE_PATIENT" | "ROLE_STAFF" | "ROLE_DOCTOR" | "ROLE_ADMIN"

export default function SignUpPage() {
  const nav = useNavigate()
  const { signUpWithPassword } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverMsg, setServerMsg] = useState<string | null>(null)
  const [serverErr, setServerErr] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    agreeToMarketing: false,
    role: "ROLE_PATIENT" as Role,
  })

  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (field === "password") {
      const v = value.toString()
      setPasswordValidation({
        length: v.length >= 8,
        uppercase: /[A-Z]/.test(v),
        lowercase: /[a-z]/.test(v),
        number: /\d/.test(v),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(v),
      })
    }
  }

  const isPasswordValid = Object.values(passwordValidation).every(Boolean)
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerErr(null)
    setServerMsg(null)
    if (!isPasswordValid || !passwordsMatch || !formData.agreeToTerms) return

    setLoading(true)
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim()

      // Use Auth Context (stores metadata in user_metadata)
      const { error } = await signUpWithPassword({
        email: formData.email,
        password: formData.password,
        data: {
          role: formData.role,
          fullName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          marketingOptIn: formData.agreeToMarketing,
        },
      })
      if (error) throw error

      // Check if a session exists (depends on email confirmation setting)
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!session) {
        setServerMsg("Check your inbox to confirm your email. You can sign in after confirming.")
        // Optional: route to /signin right away
        // nav("/signin", { replace: true })
        return
      }

      // If confirmations are disabled, you'll be signed in now; send to dashboard.
      nav("/dashboard", { replace: true })
    } catch (err: any) {
      setServerErr(err?.message ?? "Sign up failed")
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setServerErr(null)
    setServerMsg(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        // For refresh tokens in web:
        // queryParams: { access_type: "offline", prompt: "consent" },
      },
    })
    if (error) setServerErr(error.message)
  }

  const isSubmitDisabled = loading || !isPasswordValid || !passwordsMatch || !formData.agreeToTerms

  return (
    <PageLayout variant="auth" className="bg-gray-50">
      <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-lg">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900">Create Your Account</CardTitle>
              <CardDescription className="text-gray-600">
                Join SingHealth Clinic to book appointments and manage your healthcare journey.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Role selector */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-gray-700">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROLE_PATIENT">Patient</SelectItem>
                      <SelectItem value="ROLE_STAFF">Staff</SelectItem>
                      <SelectItem value="ROLE_DOCTOR">Doctor</SelectItem>
                      <SelectItem value="ROLE_ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+65 9123 4567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                {/* Date of Birth and Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-medium text-gray-700">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  {formData.password && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-gray-600 mb-1">Password must contain:</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className={`flex items-center space-x-1 ${passwordValidation.length ? "text-green-600" : "text-gray-400"}`}>
                          {passwordValidation.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>8+ characters</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${passwordValidation.uppercase ? "text-green-600" : "text-gray-400"}`}>
                          {passwordValidation.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>Uppercase letter</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${passwordValidation.lowercase ? "text-green-600" : "text-gray-400"}`}>
                          {passwordValidation.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>Lowercase letter</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${passwordValidation.number ? "text-green-600" : "text-gray-400"}`}>
                          {passwordValidation.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>Number</span>
                        </div>
                        <div className={`flex items-center space-x-1 col-span-2 ${passwordValidation.special ? "text-green-600" : "text-gray-400"}`}>
                          {passwordValidation.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>Special character (!@#$%^&*)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && (
                    <div className={`text-xs flex items-center space-x-1 ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                      {passwordsMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</span>
                    </div>
                  )}
                </div>

                {/* Terms and Marketing */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                      I agree to the{" "}
                      <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="marketing"
                      checked={formData.agreeToMarketing}
                      onCheckedChange={(checked) => handleInputChange("agreeToMarketing", checked as boolean)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="marketing" className="text-sm text-gray-600 leading-relaxed">
                      I would like to receive appointment reminders, health tips, and promotional emails from SingHealth Clinic
                    </Label>
                  </div>
                </div>

                {/* Server messages */}
                {serverErr && <p className="text-sm text-red-600">{serverErr}</p>}
                {serverMsg && <p className="text-sm text-green-600">{serverMsg}</p>}

                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  disabled={isSubmitDisabled}
                >
                  {loading ? "Creating..." : "Create Account"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link to="/signin" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>

              {/* Social Sign Up Options */}
              <div className="mt-6 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                  onClick={signInWithGoogle}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                  onClick={() => alert("SingPass sign-in is not configured. (Needs custom OIDC)")}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.221.083.343-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z" />
                  </svg>
                  Continue with SingPass
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}
