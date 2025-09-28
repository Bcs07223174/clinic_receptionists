"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Menu, Stethoscope, User, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface NavbarProps {
  activeTab: "overview" | "appointments" | "patient-queue" | "profile"
  onTabChange: (tab: "overview" | "appointments" | "patient-queue" | "profile") => void
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [receptionist, setReceptionist] = useState<any>(null)
  const [doctors, setDoctors] = useState<any[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const receptionistData = localStorage.getItem("receptionist")
    const doctorsData = localStorage.getItem("doctors")

    if (receptionistData) {
      try {
        setReceptionist(JSON.parse(receptionistData))
      } catch {
        setReceptionist(null)
      }
    }
    if (doctorsData) {
      try {
        setDoctors(JSON.parse(doctorsData))
      } catch {
        setDoctors([])
      }
    }
  }, [])

  const handleLogout = async () => {
    const sessionToken = localStorage.getItem("sessionToken")
    
    try {
      // Call logout API to invalidate session on server
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      })
    } catch (error) {
      console.error("Logout API error:", error)
      // Continue with logout even if API call fails
    }
    
    // Clear all local storage data
    localStorage.removeItem("receptionist")
    localStorage.removeItem("doctors")
    localStorage.removeItem("doctor")
    localStorage.removeItem("sessionToken")
    localStorage.removeItem("linkedDoctorIds")
    localStorage.removeItem("doctorId")
    
    // Redirect to login page
    router.push("/")
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleTabChange = (tab: "overview" | "appointments" | "patient-queue" | "profile") => {
    onTabChange(tab)
    setIsMobileMenuOpen(false) // Close mobile menu after selection
  }

  return (
    <nav className="bg-white border-b border-sky-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-sky-500 via-sky-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-200">
                <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">Clinic Manager</h1>
              {doctors.length > 0 && <p className="text-xs sm:text-sm text-sky-600 font-medium">{doctors.length} doctor{doctors.length > 1 ? 's' : ''} linked</p>}
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">Clinic</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1">
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              onClick={() => onTabChange("overview")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "bg-sky-500 text-white hover:bg-sky-600"
                  : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
              }`}
            >
              Overview
            </Button>
            <Button
              variant={activeTab === "appointments" ? "default" : "ghost"}
              onClick={() => onTabChange("appointments")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "appointments"
                  ? "bg-sky-500 text-white hover:bg-sky-600"
                  : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
              }`}
            >
              Appointments
            </Button>
            <Button
              variant={activeTab === "patient-queue" ? "default" : "ghost"}
              onClick={() => onTabChange("patient-queue")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "patient-queue"
                  ? "bg-sky-500 text-white hover:bg-sky-600"
                  : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
              }`}
            >
              Patient Queue
            </Button>
            <Button
              variant={activeTab === "profile" ? "default" : "ghost"}
              onClick={() => onTabChange("profile")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "profile"
                  ? "bg-sky-500 text-white hover:bg-sky-600"
                  : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
              }`}
            >
              Profile
            </Button>
          </div>

          {/* User Info and Logout - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {receptionist && (
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <User className="w-4 h-4 text-sky-500" />
                <span className="hidden lg:inline">{receptionist.name}</span>
                <span className="lg:hidden">{receptionist.name.split(' ')[0]}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-800 bg-transparent border-sky-200 hover:bg-sky-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden lg:inline">Logout</span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="text-slate-600 hover:text-slate-800 hover:bg-sky-50"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-sky-100 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Button
                variant={activeTab === "overview" ? "default" : "ghost"}
                onClick={() => handleTabChange("overview")}
                className={`w-full justify-start px-3 py-2 text-base font-medium ${
                  activeTab === "overview"
                    ? "bg-sky-500 text-white hover:bg-sky-600"
                    : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
                }`}
              >
                Overview
              </Button>
              <Button
                variant={activeTab === "appointments" ? "default" : "ghost"}
                onClick={() => handleTabChange("appointments")}
                className={`w-full justify-start px-3 py-2 text-base font-medium ${
                  activeTab === "appointments"
                    ? "bg-sky-500 text-white hover:bg-sky-600"
                    : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
                }`}
              >
                Appointments
              </Button>
              <Button
                variant={activeTab === "patient-queue" ? "default" : "ghost"}
                onClick={() => handleTabChange("patient-queue")}
                className={`w-full justify-start px-3 py-2 text-base font-medium ${
                  activeTab === "patient-queue"
                    ? "bg-sky-500 text-white hover:bg-sky-600"
                    : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
                }`}
              >
                Patient Queue
              </Button>
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                onClick={() => handleTabChange("profile")}
                className={`w-full justify-start px-3 py-2 text-base font-medium ${
                  activeTab === "profile"
                    ? "bg-sky-500 text-white hover:bg-sky-600"
                    : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
                }`}
              >
                Profile
              </Button>
            </div>
            <div className="border-t border-sky-100 px-2 py-3">
              {receptionist && (
                <div className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-600">
                  <User className="w-4 h-4 text-sky-500" />
                  <span>{receptionist.name}</span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full justify-start text-slate-600 hover:text-slate-800 bg-transparent border-sky-200 hover:bg-sky-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
