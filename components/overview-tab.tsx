"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Calendar, CheckCircle, Clock, TrendingUp, Users, XCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface Appointment {
  _id: string
  patientName: string
  patientEmail: string
  date: string
  time: string
  status: "pending" | "confirmed" | "rejected"
  reason: string
  doctorName: string
}

export default function OverviewTab() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Helper function to safely format dates
  const formatDate = (dateString: string | Date, options?: Intl.DateTimeFormatOptions) => {
    try {
      if (!dateString) return "Invalid Date"
      
      const dateObj = new Date(dateString)
      if (isNaN(dateObj.getTime())) {
        return "Invalid Date"
      }
      
      if (options) {
        return dateObj.toLocaleDateString("en-US", options)
      }
      return dateObj.toISOString().split("T")[0]
    } catch (error) {
      console.error("Error formatting date:", error, dateString)
      return "Invalid Date"
    }
  }

  useEffect(() => {
    // Try both storage patterns for compatibility
    const doctorsData = localStorage.getItem("doctors")
    const receptionistData = localStorage.getItem("receptionist")
    
    let doctorIds: string[] = []
    
    // Try to get doctor IDs from receptionist data first (current system)
    if (receptionistData && receptionistData !== "undefined" && receptionistData.trim() !== "") {
      try {
        const parsedReceptionist = JSON.parse(receptionistData)
        
        const linkedDoctorIds = parsedReceptionist.linkedDoctorIds || parsedReceptionist.linked_doctor_ids || []
        
        if (linkedDoctorIds.length > 0) {
          doctorIds = linkedDoctorIds
          // Create a mock doctors array for display
          setDoctors(linkedDoctorIds.map((id: string) => ({ _id: id, name: `Doctor ${id.slice(-4)}` })))
        }
      } catch (error) {
        console.error("Error parsing receptionist data:", error)
      }
    }
    
    // Fallback to doctors data if available
    if (doctorIds.length === 0 && doctorsData && doctorsData !== "undefined" && doctorsData.trim() !== "") {
      try {
        const parsedDoctors = JSON.parse(doctorsData)
        setDoctors(parsedDoctors)
        doctorIds = parsedDoctors.map((doc: any) => doc._id)
      } catch (error) {
        console.error("Error parsing doctors data:", error)
      }
    }
    
    if (doctorIds.length > 0) {
      fetchData(doctorIds)
    } else {
      setDoctors([])
      setIsLoading(false)
    }
  }, [])

  const fetchData = async (doctorIds: string[]) => {
    try {
      setIsLoading(true)

      // Fetch appointments for each doctor
      const allAppointments: Appointment[] = []
      
      for (const doctorId of doctorIds) {
        try {
          const response = await fetch(`/api/appointments?doctorId=${doctorId}`)
          const data = await response.json()
          if (data.appointments) {
            allAppointments.push(...data.appointments)
          }
        } catch (error) {
          console.error(`Error fetching appointments for doctor ${doctorId}:`, error)
        }
      }

      setAppointments(allAppointments)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
  }

  const todayAppointments = appointments.filter((apt) => {
    try {
      const today = formatDate(new Date())
      const aptDate = formatDate(apt.date)
      
      // Only include if both dates are valid and match
      return today !== "Invalid Date" && aptDate !== "Invalid Date" && aptDate === today
    } catch (error) {
      console.error("Error filtering appointment date:", error, apt)
      return false
    }
  })

  const pendingCount = appointments.filter((apt) => apt.status === "pending").length
  const confirmedCount = appointments.filter((apt) => apt.status === "confirmed").length
  const rejectedCount = appointments.filter((apt) => apt.status === "rejected").length

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
                <Skeleton className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <Skeleton className="h-4 w-4 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-sky-600" />
            Dashboard Overview
          </h1>
          {doctors.length > 0 && (
            <p className="text-sm sm:text-base text-gray-600 mt-1 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Managing appointments for {doctors.length} doctor{doctors.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-sky-100 border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700 mb-1">Total</p>
                <p className="text-xl sm:text-3xl font-bold text-blue-900">{appointments.length}</p>
              </div>
              <Calendar className="w-5 h-5 sm:w-8 sm:h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-purple-100 border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-indigo-700 mb-1">Today</p>
                <p className="text-xl sm:text-3xl font-bold text-indigo-900">{todayAppointments.length}</p>
              </div>
              <Clock className="w-5 h-5 sm:w-8 sm:h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-yellow-700 mb-1">Pending</p>
                <p className="text-xl sm:text-3xl font-bold text-yellow-900">{pendingCount}</p>
              </div>
              <AlertCircle className="w-5 h-5 sm:w-8 sm:h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700 mb-1">Confirmed</p>
                <p className="text-xl sm:text-3xl font-bold text-green-900">{confirmedCount}</p>
              </div>
              <CheckCircle className="w-5 h-5 sm:w-8 sm:h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Appointments */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-white border-0 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-sky-600" />
              <div>
                <CardTitle className="text-lg sm:text-xl text-gray-900">Today's Appointments</CardTitle>
                <CardDescription className="text-sm">Appointments scheduled for today</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">No appointments scheduled for today</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">Enjoy your free time!</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {todayAppointments.slice(0, 5).map((appointment) => (
                  <div key={appointment._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 rounded-lg border border-sky-200 gap-3 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      {getStatusIcon(appointment.status)}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{appointment.patientName}</p>
                          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>{appointment.time}</span>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 mt-1">
                          <span>{appointment.doctorName}</span>
                          {appointment.reason && (
                            <>
                              <span className="hidden sm:inline text-gray-400">•</span>
                              <span className="truncate">{appointment.reason}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(appointment.status)} text-xs px-2 py-1 flex-shrink-0 capitalize`}>
                      {appointment.status}
                    </Badge>
                  </div>
                ))}
                {todayAppointments.length > 5 && (
                  <div className="text-center pt-2">
                    <p className="text-sm text-gray-500">
                      and {todayAppointments.length - 5} more appointment{todayAppointments.length - 5 !== 1 ? 's' : ''}...
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Summary */}
      {appointments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">{confirmedCount}</div>
              <div className="text-sm text-gray-600">Confirmed Appointments</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-2">{pendingCount}</div>
              <div className="text-sm text-gray-600">Pending Requests</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-2">{rejectedCount}</div>
              <div className="text-sm text-gray-600">Rejected Appointments</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
