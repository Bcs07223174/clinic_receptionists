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
    fetchAppointments()
  }, [])

  useEffect(() => {
    filterAppointments()
  }, [appointments, searchTerm, statusFilter, dateFilter])

  const fetchAppointments = async () => {
    try {
      setIsLoading(true)
      setHasError(false)

      const user = localStorage.getItem('user')
      if (!user) {
        setHasError(true)
        return
      }

      const parsedUser = JSON.parse(user)
      const doctorIds = parsedUser.linked_doctor_ids || []

      if (!doctorIds.length) {
        setHasError(true)
        return
      }

      const doctorId = doctorIds[0]
      const response = await fetch(`/api/appointments?doctorId=${doctorId}`)
      
      if (!response.ok) {
        setHasError(true)
        return
      }

      const data = await response.json()
      
      if (data.appointments) {
        setAppointments(data.appointments)
      } else {
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
              <p className="text-red-600 text-sm mt-1">
                This usually happens when you are not properly logged in or your session has expired.
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
                  className="text-sm px-4 py-2"
                  size="sm"
                >
                  Reload Page
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
            <Alert className={message.type === "success" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
              <AlertDescription className={message.type === "success" ? "text-green-700" : "text-red-700"}>
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
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            {updatingId === appointment._id ? "Updating..." : "Confirm"}
                          </Button>
                          <Button
                            onClick={() => handleRejectAppointment(appointment._id)}
                            disabled={updatingId === appointment._id}
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
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