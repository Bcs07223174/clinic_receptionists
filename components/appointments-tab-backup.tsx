"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Calendar, CheckCircle, Clock, FileText, Mail, Search, User, XCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface Appointment {
  _id: string
  patientName: string
  patientEmail: string
  patientPhone?: string
  appointmentDate: string
  timeSlot: string
  status: "pending" | "confirmed" | "rejected"
  reason: string
  rejectionReason?: string
  createdAt: string
}

export default function AppointmentsTab() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [rejectionDialog, setRejectionDialog] = useState<{
    isOpen: boolean
    appointmentId: string | null
    rejectionReason: string
  }>({
    isOpen: false,
    appointmentId: null,
    rejectionReason: ""
  })

  useEffect(() => {
    const doctorsData = localStorage.getItem("doctors")
    console.log("Appointments tab - Doctors data from localStorage:", doctorsData)
    if (doctorsData && doctorsData !== "undefined" && doctorsData.trim() !== "") {
      try {
        const parsedDoctors = JSON.parse(doctorsData)
        console.log("Appointments tab - Parsed doctors:", parsedDoctors)
        setDoctors(parsedDoctors)
        const doctorIds = parsedDoctors.map((doc: any) => doc._id)
        console.log("Appointments tab - Doctor IDs:", doctorIds)
        fetchAppointments(doctorIds)
      } catch {
        console.log("Appointments tab - Failed to parse doctors data")
        setDoctors([])
      }
    } else {
      console.log("Appointments tab - No valid doctors data found")
      setDoctors([])
      setAppointments([]) // Clear appointments if no doctors
    }
  }, [])

  useEffect(() => {
    filterAppointments()
  }, [appointments, searchTerm, statusFilter, dateFilter])

  const fetchAppointments = async (doctorIds: string[]) => {
    try {
      console.log("Fetching appointments for doctorIds:", doctorIds)
      setHasError(false)
      
      if (!doctorIds || doctorIds.length === 0) {
        console.log("No doctor IDs available, skipping fetch")
        setAppointments([])
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      const queryParams = doctorIds.map(id => `doctorId=${id}`).join('&')
      const response = await fetch(`/api/appointments?${queryParams}`)
      
      if (!response.ok) {
        console.error("API error:", response.status, response.statusText)
        setHasError(true)
        if (response.status === 400) {
          setMessage({ type: "error", text: "Invalid doctor information. Please log in again." })
        } else {
          setMessage({ type: "error", text: "Failed to fetch appointments" })
        }
        setAppointments([])
        setIsLoading(false)
        return
      }
      
      const data = await response.json()
      setAppointments(data.appointments || [])
      
      if (data.appointments && data.appointments.length === 0) {
        console.log("No appointments found for doctors:", doctorIds)
      }
    } catch (error) {
      console.error("Error fetching appointments:", error)
      setHasError(true)
      setMessage({ type: "error", text: "Failed to fetch appointments" })
    } finally {
      setIsLoading(false)
    }
  }

  const filterAppointments = () => {
    let filtered = appointments

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (apt) =>
          apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.patientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.reason.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((apt) => apt.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date()
      const todayStr = today.toISOString().split("T")[0]

      filtered = filtered.filter((apt) => {
        try {
          if (!apt.appointmentDate) return false
          
          const aptDateObj = new Date(apt.appointmentDate)
          if (isNaN(aptDateObj.getTime())) return false
          
          const aptDate = aptDateObj.toISOString().split("T")[0]
          switch (dateFilter) {
            case "today":
              return aptDate === todayStr
            case "upcoming":
              return aptDate >= todayStr
            case "past":
              return aptDate < todayStr
            default:
              return true
          }
        } catch (error) {
          console.error("Error filtering appointment by date:", error, apt)
          return false
        }
      })
    }

    setFilteredAppointments(filtered)
  }

  const updateAppointmentStatus = async (appointmentId: string, status: "confirmed" | "rejected", rejectionReason?: string) => {
    try {
      console.log("Updating appointment status:", { appointmentId, status, rejectionReason })
      console.log("Available doctors:", doctors)
      console.log("Using doctorId:", doctors.length > 0 ? doctors[0]._id : null)
      
      // Get doctorId from doctors array or from the appointment itself as fallback
      const currentAppointment = appointments.find(apt => apt._id === appointmentId)
      const doctorId = doctors.length > 0 ? doctors[0]._id : currentAppointment?.doctorId
      
      console.log("Final doctorId being used:", doctorId)
      
      setUpdatingId(appointmentId)
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId,
          status,
          rejectionReason,
          doctorId,
        }),
      })

      if (response.ok) {
        // Update local state
        setAppointments((prev) => 
          prev.map((apt) => 
            apt._id === appointmentId 
              ? { ...apt, status, rejectionReason: rejectionReason || apt.rejectionReason } 
              : apt
          )
        )
        setMessage({
          type: "success",
          text: `Appointment ${status} successfully${rejectionReason ? ' with reason: ' + rejectionReason : ''}`,
        })

        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000)
      } else {
        const data = await response.json()
        setMessage({ type: "error", text: data.error || "Failed to update appointment" })
      }
    } catch (error) {
      console.error("Error updating appointment:", error)
      setMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleConfirmAppointment = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, "confirmed")
  }

  const handleRejectAppointment = (appointmentId: string) => {
    setRejectionDialog({
      isOpen: true,
      appointmentId,
      rejectionReason: ""
    })
  }

  const handleRejectConfirm = () => {
    if (rejectionDialog.appointmentId && rejectionDialog.rejectionReason.trim()) {
      updateAppointmentStatus(rejectionDialog.appointmentId, "rejected", rejectionDialog.rejectionReason)
      setRejectionDialog({
        isOpen: false,
        appointmentId: null,
        rejectionReason: ""
      })
    }
  }

  const handleRejectCancel = () => {
    setRejectionDialog({
      isOpen: false,
      appointmentId: null,
      rejectionReason: ""
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
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

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "Invalid Date"
      
      const dateObj = new Date(dateString)
      if (isNaN(dateObj.getTime())) {
        return "Invalid Date"
      }
      
      return dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date:", error, dateString)
      return "Invalid Date"
    }
  }

  const formatDateShort = (dateString: string) => {
    try {
      if (!dateString) return "Invalid Date"
      
      const dateObj = new Date(dateString)
      if (isNaN(dateObj.getTime())) {
        return "Invalid Date"
      }
      
      return dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date:", error, dateString)
      return "Invalid Date"
    }
  }

  const formatTime = (timeString: string) => {
    try {
      if (!timeString) return "Invalid Time"
      
      // Handle different time formats (HH:MM or HH:MM:SS)
      const timeParts = timeString.split(':')
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0])
        const minutes = timeParts[1]
        const period = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
        return `${displayHours}:${minutes} ${period}`
      }
      
      return timeString
    } catch (error) {
      console.error("Error formatting time:", error, timeString)
      return timeString
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
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

      {/* Invalid Doctor Information Alert */}
      {hasError && (
        <Alert className="border-red-300 bg-red-50">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <div>
              <AlertDescription className="text-red-700 font-medium">
                Invalid doctor information detected. Unable to load appointments.
              </AlertDescription>
              <p className="text-red-600 text-sm mt-1">
                This usually happens when:
                • You are not properly logged in as a receptionist
                • Your account is not linked to any doctors
                • Your session has expired
              </p>
              <div className="flex space-x-3 mt-3">
                <Button 
                  onClick={() => window.location.href = '/api/auth/login'}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
                  size="sm"
                >
                  Re-login
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 text-sm px-4 py-2"
                  size="sm"
                >
                  Refresh Page
                </Button>
                <Button 
                  onClick={() => {
                    console.log("=== DEBUGGING DOCTOR DATA ===")
                    console.log("localStorage doctors:", localStorage.getItem("doctors"))
                    console.log("localStorage user:", localStorage.getItem("user"))
                    console.log("localStorage auth:", localStorage.getItem("auth"))
                    console.log("Current doctors state:", doctors)
                    alert(`Doctors in localStorage: ${localStorage.getItem("doctors") || 'NULL'}`)
                  }}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 text-sm px-4 py-2"
                  size="sm"
                >
                  Debug Info
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {doctors.length === 0 && !hasError && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription className="text-yellow-700">
            No doctor data found. Please log in as a receptionist to access appointment data.
          </AlertDescription>
        </Alert>
      )}
          </AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription className={message.type === "success" ? "text-green-700" : "text-red-700"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="bg-white border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Filter Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading appointments...</h3>
              <p className="text-gray-600">Please wait while we fetch your appointments.</p>
            </CardContent>
          </Card>
        ) : filteredAppointments.length === 0 ? (
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasError ? "Invalid Doctor Information" : "No appointments found"}
              </h3>
              <p className="text-gray-600">
                {hasError
                  ? "Unable to load appointments due to invalid doctor information. Please re-login to fix this issue."
                  : doctors.length === 0
                  ? "Please log in as a receptionist to view appointments."
                  : appointments.length === 0
                  ? "No appointments have been scheduled yet."
                  : "Try adjusting your filters to see more appointments."}
              </p>
              {doctors.length === 0 && (
                <Button 
                  onClick={() => window.location.href = '/api/auth/login'}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Go to Login
                </Button>
              )}
              {hasError && (
                <Button 
                  onClick={() => window.location.reload()}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Refresh Page
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card key={appointment._id} className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-4">
                    {/* Header with patient name and status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(appointment.status)}
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{appointment.patientName}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                            {appointment.status === "pending" && (
                              <span className="text-xs text-yellow-600 font-medium">• Action Required</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>Requested: {formatDateShort(appointment.createdAt)}</p>
                      </div>
                    </div>

                    {/* Prominent Date and Time Display */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-6 h-6 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Appointment Date</p>
                            <p className="text-lg font-semibold text-blue-900">{formatDate(appointment.appointmentDate)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Clock className="w-6 h-6 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Time Slot</p>
                            <p className="text-lg font-semibold text-blue-900">{formatTime(appointment.timeSlot)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{appointment.patientEmail}</span>
                      </div>
                      {appointment.patientPhone && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{appointment.patientPhone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-start space-x-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-700">Reason for visit:</p>
                        <p className="text-gray-600">{appointment.reason}</p>
                      </div>
                    </div>

                    {appointment.status === "pending" && (
                      <div className="flex space-x-3 pt-4 border-t">
                        <Button
                          onClick={() => handleConfirmAppointment(appointment._id)}
                          disabled={updatingId === appointment._id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm
                        </Button>
                        <Button
                          onClick={() => handleRejectAppointment(appointment._id)}
                          disabled={updatingId === appointment._id}
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {appointment.rejectionReason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                        <p className="text-sm text-red-700">{appointment.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectionDialog.isOpen} onOpenChange={handleRejectCancel}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please provide a reason for rejecting this appointment:
            </p>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionDialog.rejectionReason}
              onChange={(e) => 
                setRejectionDialog(prev => ({
                  ...prev,
                  rejectionReason: e.target.value
                }))
              }
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleRejectCancel}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={!rejectionDialog.rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
