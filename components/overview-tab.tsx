"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Calendar, CheckCircle, Clock, XCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface Appointment {
  _id: string
  patientName: string
  patientEmail: string
  appointmentDate: string
  timeSlot: string
  status: "pending" | "confirmed" | "rejected"
  reason: string
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
    
    console.log("Doctors data from localStorage:", doctorsData)
    console.log("Receptionist data from localStorage:", receptionistData)
    
    let doctorIds: string[] = []
    
    // Try to get doctor IDs from receptionist data first (current system)
    if (receptionistData && receptionistData !== "undefined" && receptionistData.trim() !== "") {
      try {
        const parsedReceptionist = JSON.parse(receptionistData)
        console.log("Parsed receptionist:", parsedReceptionist)
        
        const linkedDoctorIds = parsedReceptionist.linkedDoctorIds || parsedReceptionist.linked_doctor_ids || []
        console.log("Linked doctor IDs from receptionist:", linkedDoctorIds)
        
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
        console.log("Parsed doctors:", parsedDoctors)
        setDoctors(parsedDoctors)
        doctorIds = parsedDoctors.map((doc: any) => doc._id)
        console.log("Doctor IDs from doctors data:", doctorIds)
      } catch (error) {
        console.error("Error parsing doctors data:", error)
      }
    }
    
    if (doctorIds.length > 0) {
      fetchData(doctorIds)
    } else {
      console.log("No doctor IDs found, setting empty state")
      setDoctors([])
      setIsLoading(false)
    }
  }, [])

  const fetchData = async (doctorIds: string[]) => {
    try {
      setIsLoading(true)

      // Build query string with multiple doctor IDs
      const queryParams = doctorIds.map(id => `doctorId=${id}`).join('&')
      console.log("Fetching data with query params:", queryParams)

      // Fetch appointments
      const appointmentsResponse = await fetch(`/api/appointments?${queryParams}`)
      const appointmentsData = await appointmentsResponse.json()
      console.log("Appointments response:", appointmentsData)

      setAppointments(appointmentsData.appointments || [])
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
      const aptDate = formatDate(apt.appointmentDate)
      
      // Only include if both dates are valid and match
      return today !== "Invalid Date" && aptDate !== "Invalid Date" && aptDate === today
    } catch (error) {
      console.error("Error filtering appointment date:", error, apt)
      return false
    }
  })

  const pendingCount = appointments.filter((apt) => apt.status === "pending").length
  const confirmedCount = appointments.filter((apt) => apt.status === "confirmed").length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          {doctors.length > 0 && <p className="text-gray-600 mt-1">Managing appointments for {doctors.length} doctor{doctors.length > 1 ? 's' : ''}</p>}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900">{appointments.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                <p className="text-3xl font-bold text-gray-900">{todayAppointments.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-3xl font-bold text-green-600">{confirmedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Appointments */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-white border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">Today's Appointments</CardTitle>
            <CardDescription>Appointments scheduled for today</CardDescription>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No appointments scheduled for today</p>
            ) : (
              <div className="space-y-4">
                {todayAppointments.slice(0, 5).map((appointment) => (
                  <div key={appointment._id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(appointment.status)}
                      <div>
                        <p className="font-semibold text-gray-900">{appointment.patientName}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          <span>{appointment.timeSlot}</span>
                          <span className="text-gray-400">•</span>
                          <span>{formatDate(appointment.appointmentDate, {
                            weekday: "short",
                            month: "short", 
                            day: "numeric"
                          })}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
