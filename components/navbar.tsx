"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Stethoscope, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface NavbarProps {
  activeTab: "overview" | "appointments" | "patient-queue" | "profile"
  onTabChange: (tab: "overview" | "appointments" | "patient-queue" | "profile") => void
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [receptionist, setReceptionist] = useState<any>(null)
  const [doctors, setDoctors] = useState<any[]>([])
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

  const handleLogout = () => {
    localStorage.removeItem("receptionist")
    localStorage.removeItem("doctors")
    localStorage.removeItem("doctor") // Clear old single doctor data
    router.push("/")
  }

  return (
    <nav className="bg-white border-b border-sky-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg flex items-center justify-center shadow-sm">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Clinic Manager</h1>
                {doctors.length > 0 && <p className="text-sm text-sky-600">{doctors.length} doctor{doctors.length > 1 ? 's' : ''} linked</p>}
              </div>
            </div>

            <div className="flex space-x-1">
              <Button
                variant={activeTab === "overview" ? "default" : "ghost"}
                onClick={() => onTabChange("overview")}
                className={activeTab === "overview" ? "bg-sky-500 text-white hover:bg-sky-600" : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"}
              >
                Overview
              </Button>
              <Button
                variant={activeTab === "appointments" ? "default" : "ghost"}
                onClick={() => onTabChange("appointments")}
                className={
                  activeTab === "appointments" ? "bg-sky-500 text-white hover:bg-sky-600" : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
                }
              >
                Appointments
              </Button>
              <Button
                variant={activeTab === "patient-queue" ? "default" : "ghost"}
                onClick={() => onTabChange("patient-queue")}
                className={
                  activeTab === "patient-queue" ? "bg-sky-500 text-white hover:bg-sky-600" : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
                }
              >
                Patient Queue
              </Button>
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                onClick={() => onTabChange("profile")}
                className={activeTab === "profile" ? "bg-sky-500 text-white hover:bg-sky-600" : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"}
              >
                Profile
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {receptionist && (
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <User className="w-4 h-4 text-sky-500" />
                <span>{receptionist.name}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-800 bg-transparent border-sky-200 hover:bg-sky-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
