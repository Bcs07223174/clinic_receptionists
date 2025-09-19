"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function AppointmentsTabSimple() {
  const isLoading = false
  const hasError = false

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
          <p className="text-gray-600 mt-1">Manage and review appointment requests</p>
        </div>
      </div>

      {hasError && (
        <Alert className="border-red-300 bg-red-50">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <div>
              <AlertDescription className="text-red-700 font-medium">
                Invalid doctor information detected. Unable to load appointments.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      <div>
        <p>Test content here</p>
      </div>
    </div>
  )
}