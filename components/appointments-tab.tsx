"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  const [retryCount, setRetryCount] = useState(0)
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
    // Add a small delay to ensure localStorage is populated after login
    const timer = setTimeout(() => {
      fetchAppointments()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    filterAppointments()
  }, [appointments, searchTerm, statusFilter, dateFilter])

  const fetchAppointments = async () => {
    try {
      setIsLoading(true)
      setHasError(false)

      console.log("=== FETCH APPOINTMENTS DEBUG ===")
      
      // Try both storage patterns for compatibility
      let user = localStorage.getItem('user')
      let receptionist = localStorage.getItem('receptionist')
      
      console.log("Raw user from localStorage:", user)
      console.log("Raw receptionist from localStorage:", receptionist)
      
      let parsedUser = null
      
      if (receptionist) {
        // New format: separate receptionist data
        parsedUser = JSON.parse(receptionist)
        console.log("Using receptionist data:", parsedUser)
      } else if (user) {
        // Old format: combined user data
        parsedUser = JSON.parse(user)
        console.log("Using user data:", parsedUser)
      } else {
        console.log("No user data found in localStorage")
        
        // Retry logic - if this is the first few attempts and we're likely just after login
        if (retryCount < 3) {
          console.log(`Retrying in 500ms... (attempt ${retryCount + 1}/3)`)
          setRetryCount(retryCount + 1)
          setTimeout(() => {
            fetchAppointments()
          }, 500)
          return
        }
        
        console.log("Max retries reached, showing error")
        setHasError(true)
        return
      }
      
      // Try both field names for compatibility
      const doctorIds = parsedUser.linkedDoctorIds || parsedUser.linked_doctor_ids || []
      console.log("Doctor IDs from user:", doctorIds)
      console.log("Available fields:", Object.keys(parsedUser))

      // Validate doctorIds array and its contents
      const validDoctorIds = doctorIds.filter((id: any) => 
        id && 
        id !== 'undefined' && 
        id !== 'null' && 
        typeof id === 'string' && 
        id.length === 24
      )
      
      console.log("Valid doctor IDs after filtering:", validDoctorIds)

      if (!validDoctorIds.length) {
        console.log("No valid doctor IDs found for user")
        
        // Retry logic for missing doctor IDs
        if (retryCount < 3) {
          console.log(`No valid doctor IDs, retrying in 500ms... (attempt ${retryCount + 1}/3)`)
          setRetryCount(retryCount + 1)
          setTimeout(() => {
            fetchAppointments()
          }, 500)
          return
        }
        
        console.log("Max retries reached, no doctor IDs available")
        setHasError(true)
        return
      }

      const doctorId = validDoctorIds[0]
      console.log("Using doctor ID:", doctorId)
      
      // Additional validation to prevent undefined doctorId
      if (!doctorId || doctorId === 'undefined' || doctorId === 'null') {
        console.log("Invalid doctor ID detected:", doctorId)
        setHasError(true)
        return
      }
      
      const apiUrl = `/api/appointments?doctorId=${doctorId}`
      console.log("API URL:", apiUrl)
      
      const response = await fetch(apiUrl)
      console.log("Response status:", response.status)
      console.log("Response ok:", response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log("Error response:", errorText)
        setHasError(true)
        return
      }

      const data = await response.json()
      console.log("Response data:", data)
      
      // Reset retry count on successful data retrieval
      setRetryCount(0)
      
      if (data.appointments) {
        console.log("Setting appointments:", data.appointments.length, "appointments")
        setAppointments(data.appointments)
      } else {
        console.log("No appointments in response, setting empty array")
        setAppointments([])
      }
    } catch (error) {
      console.error("Error fetching appointments:", error)
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAppointments = () => {
    let filtered = [...appointments]

    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.reason.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(apt => apt.status === statusFilter)
    }

    if (dateFilter !== "all") {
      const today = new Date()
      const todayStr = today.toISOString().split("T")[0]
      
      filtered = filtered.filter(apt => {
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
      })
    }

    setFilteredAppointments(filtered)
  }

  const updateAppointmentStatus = async (appointmentId: string, status: "confirmed" | "rejected", rejectionReason?: string) => {
    try {
      setUpdatingId(appointmentId)
      
      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId,
          status,
          rejectionReason
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: "success", text: data.message })
        fetchAppointments()
      } else {
        setMessage({ type: "error", text: "Failed to update appointment" })
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
      setMessage({ type: "error", text: "Error updating appointment" })
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
      setRejectionDialog({ isOpen: false, appointmentId: null, rejectionReason: "" })
    }
  }

  const handleRejectCancel = () => {
    setRejectionDialog({ isOpen: false, appointmentId: null, rejectionReason: "" })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case "rejected":
        return <XCircle className="w-5 h-5 text-rose-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-amber-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "rejected":
        return "bg-rose-50 text-rose-700 border-rose-200"
      default:
        return "bg-amber-50 text-amber-700 border-amber-200"
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

  const formatTime = (timeString: string) => {
    try {
      if (!timeString) return "Invalid Time"
      
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
          <h1 className="text-3xl font-bold text-slate-800">Appointment Management</h1>
          <p className="text-slate-600 mt-1">Manage and review appointment requests</p>
        </div>
      </div>

      {hasError && (
        <Alert className="border-rose-200 bg-rose-50">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-rose-400 mr-3" />
            <div>
              <AlertDescription className="text-rose-700 font-medium">
                Invalid doctor information detected. Unable to load appointments.
              </AlertDescription>
              <p className="text-rose-600 text-sm mt-1">
                This usually happens when you are not properly logged in or your session has expired.
              </p>
              <div className="text-xs text-rose-600 mt-2 p-2 bg-rose-100 rounded">
                <strong>Debug info:</strong> Check browser console for detailed error information.
                <br />
                To fix doctor linkage issues, visit: <a href="/fix-doctor.html" className="underline">Fix Doctor Link</a>
              </div>
              <div className="flex space-x-3 mt-3">
                <Button 
                  onClick={() => window.location.href = '/api/auth/login'}
                  className="bg-rose-500 hover:bg-rose-600 text-white text-sm px-4 py-2"
                  size="sm"
                >
                  Re-login
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="text-sm px-4 py-2"
                  size="sm"
                >
                  Reload Page
                </Button>
                <Button 
                  onClick={() => window.open('/fix-doctor.html', '_blank')}
                  variant="outline"
                  className="text-sm px-4 py-2"
                  size="sm"
                >
                  Fix Doctor Link
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {!hasError && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search appointments..."
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
                <SelectItem value="all">All Status</SelectItem>
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

          {message && (
            <Alert className={message.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}>
              <AlertDescription className={message.type === "success" ? "text-emerald-700" : "text-rose-700"}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                  <p className="text-gray-600">
                    {appointments.length === 0 
                      ? "There are no appointments scheduled for this doctor."
                      : "No appointments match your current filters."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAppointments.map((appointment) => (
                <Card key={appointment._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="w-5 h-5 text-gray-500" />
                          <h3 className="text-lg font-medium text-gray-900">{appointment.patientName}</h3>
                          <Badge className={`${getStatusColor(appointment.status)} border`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(appointment.status)}
                              <span className="capitalize">{appointment.status}</span>
                            </div>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4" />
                              <span>{appointment.patientEmail}</span>
                            </div>
                            {appointment.patientPhone && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <span>📞</span>
                                <span>{appointment.patientPhone}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(appointment.appointmentDate)}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(appointment.timeSlot)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-start space-x-2">
                            <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Reason for visit:</p>
                              <p className="text-sm text-gray-600">{appointment.reason}</p>
                            </div>
                          </div>
                        </div>

                        {appointment.rejectionReason && (
                          <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm font-medium text-red-700 mb-1">Rejection Reason:</p>
                            <p className="text-sm text-red-600">{appointment.rejectionReason}</p>
                          </div>
                        )}
                      </div>

                      {appointment.status === "pending" && (
                        <div className="flex space-x-2 ml-4">
                          <Button
                            onClick={() => handleConfirmAppointment(appointment._id)}
                            disabled={updatingId === appointment._id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                            size="sm"
                          >
                            {updatingId === appointment._id ? "Updating..." : "Confirm"}
                          </Button>
                          <Button
                            onClick={() => handleRejectAppointment(appointment._id)}
                            disabled={updatingId === appointment._id}
                            variant="outline"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50"
                            size="sm"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      <Dialog open={rejectionDialog.isOpen} onOpenChange={handleRejectCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please provide a reason for rejecting this appointment. This will be shared with the patient.
            </p>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionDialog.rejectionReason}
              onChange={(e) => 
                setRejectionDialog(prev => ({ ...prev, rejectionReason: e.target.value }))
              }
              rows={4}
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
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              Reject Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}