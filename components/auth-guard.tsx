"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useState } from "react"

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const sessionToken = localStorage.getItem("sessionToken")
      const receptionist = localStorage.getItem("receptionist")

      if (sessionToken && receptionist) {
        try {
          // Validate session token with backend (with timeout)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
          
          const response = await fetch("/api/auth/validate-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionToken }),
            signal: controller.signal
          })

          clearTimeout(timeoutId);

          // Check if response is JSON before parsing
          const contentType = response.headers.get('content-type');
          let data;
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            // Handle non-JSON responses
            const textResponse = await response.text();
            console.error("Non-JSON validation response:", textResponse);
            
            // Treat non-JSON responses as invalid session
            localStorage.removeItem("sessionToken")
            localStorage.removeItem("receptionist")
            localStorage.removeItem("doctors")
            router.push("/")
            return;
          }

          if (response.ok && data.success) {
            setIsAuthenticated(true)
          } else if (response.status === 408 || response.status === 503) {
            // Timeout or service unavailable - retry once
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return;
          } else {
            // Invalid session, clear stored data
            localStorage.removeItem("sessionToken")
            localStorage.removeItem("receptionist")
            localStorage.removeItem("doctors")
            router.push("/")
          }
        } catch (error) {
          // Handle network errors more gracefully
          if (error instanceof Error && error.name === 'AbortError') {
            console.warn("Session validation timeout - retrying...");
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return;
          }
          
          console.error("Session validation failed:", error)
          // Clear stored data on persistent errors
          localStorage.removeItem("sessionToken")
          localStorage.removeItem("receptionist")
          localStorage.removeItem("doctors")
          router.push("/")
        }
      } else {
        router.push("/")
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
