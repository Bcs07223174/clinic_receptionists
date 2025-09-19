"use client"

import AppointmentsTab from "@/components/appointments-tab"
import AuthGuard from "@/components/auth-guard"
import Navbar from "@/components/navbar"
import OverviewTab from "@/components/overview-tab"
import PatientQueueTab from "@/components/patient-queue-tab"
import ProfileTab from "@/components/profile-tab"
import { useState } from "react"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "appointments" | "patient-queue" | "profile">("overview")

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-teal-50">
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "appointments" && <AppointmentsTab />}
          {activeTab === "patient-queue" && <PatientQueueTab />}
          {activeTab === "profile" && <ProfileTab />}
        </main>
      </div>
    </AuthGuard>
  )
}
