"use client"

import type React from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Stethoscope } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true)
  const router = useRouter()

  // Check for auto-login on component mount
  useEffect(() => {
    const checkAutoLogin = async () => {
      const sessionToken = localStorage.getItem("sessionToken")
      const receptionist = localStorage.getItem("receptionist")

      if (sessionToken && receptionist) {
        try {
          // Validate session token with backend
          const response = await fetch("/api/auth/validate-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionToken }),
          })

          if (response.ok) {
            console.log("Auto-login successful, redirecting to dashboard...")
            router.push("/dashboard")
            return
          } else {
            // Invalid session, clear stored data
            localStorage.removeItem("sessionToken")
            localStorage.removeItem("receptionist")
            localStorage.removeItem("doctors")
          }
        } catch (error) {
          console.error("Auto-login validation failed:", error)
          // Clear stored data on network error
          localStorage.removeItem("sessionToken")
          localStorage.removeItem("receptionist")
          localStorage.removeItem("doctors")
        }
      }

      setIsCheckingAutoLogin(false)
    }

    checkAutoLogin()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    console.log("Attempting login with:", { email, password })

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses (HTML error pages, plain text, etc.)
        const textResponse = await response.text();
        console.error("Non-JSON response received:", textResponse);
        
        // Try to extract meaningful error message
        if (textResponse.includes('Internal Server Error')) {
          data = { error: "Server is experiencing issues. Please try again." };
        } else if (textResponse.includes('404')) {
          data = { error: "Login service not found. Please check server status." };
        } else {
          data = { error: "Server error. Please try again later." };
        }
      }
      
      console.log("Login response:", { status: response.status, data, contentType });

      if (response.ok && data.success) {
        console.log("Login successful, storing data and redirecting...")
        // Store user data and session token in localStorage
        localStorage.setItem("receptionist", JSON.stringify(data.receptionist))
        localStorage.setItem("doctors", JSON.stringify(data.doctors))
        localStorage.setItem("sessionToken", data.sessionToken)

        console.log("Data stored in localStorage:", {
          receptionist: data.receptionist,
          doctors: data.doctors,
          sessionToken: data.sessionToken
        })

        // Small delay to ensure localStorage is written
        setTimeout(() => {
          console.log("Redirecting to dashboard...")
          router.push("/dashboard")
        }, 100)
      } else {
        console.log("Login failed:", data.error)
        setError(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Network error during login:", error)
      
      // Better error handling for different error types
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        setError("Server returned invalid response. Please try again or contact support.")
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        setError("Cannot connect to server. Please check if the server is running.")
      } else if (error instanceof Error && error.message.includes('timeout')) {
        setError("Login request timed out. Please try again.")
      } else {
        setError(`Login error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading screen while checking auto-login
  if (isCheckingAutoLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-slate-600">Checking login status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-sky-500 to-sky-600 rounded-full flex items-center justify-center shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-800">Clinic Receptionist</CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              Sign in to manage appointments and schedules
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-sky-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-sky-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            {error && (
              <Alert className="border-rose-200 bg-rose-50">
                <AlertDescription className="text-rose-700">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2.5 shadow-md transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
