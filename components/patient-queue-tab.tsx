"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertCircle, Calendar, Clock, Hash, Search, User, UserCheck } from "lucide-react"
import { useEffect, useState } from "react"

interface PatientQueueEntry {
  _id: string
  appointmentKey: string
  doctorId: string
  patientId: string
  doctorName: string
  patientName: string
  sessionStartTime: string
  status: "pending" | "confirmed" | "rejected"
  queueStatus: "waiting" | "in-session" | "completed" | "cancelled"
  createdAt: string
  updatedAt: string
}

export default function PatientQueueTab() {
  const [queueEntries, setQueueEntries] = useState<PatientQueueEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<PatientQueueEntry[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("confirmed") // Default to confirmed appointments
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    // Add a small delay to ensure localStorage is populated after login
    const timer = setTimeout(() => {
      fetchPatientQueue()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Auto-refresh every 5 seconds for continuous updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading && !hasError) {
        fetchPatientQueue()
      }
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [isLoading, hasError])

  useEffect(() => {
    filterEntries()
  }, [queueEntries, searchTerm, statusFilter])

  const fetchPatientQueue = async () => {
    try {
      setIsLoading(true)
      setHasError(false)

      console.log("=== FETCH PATIENT QUEUE DEBUG ===")
      
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
            fetchPatientQueue()
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
            fetchPatientQueue()
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
      
      const apiUrl = `/api/patient-queue?doctorId=${doctorId}`
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
      
      if (data.patientQueue) {
        console.log("Setting patient queue:", data.patientQueue.length, "entries")
        setQueueEntries(data.patientQueue)
        setLastUpdate(new Date())
      } else {
        console.log("No patient queue in response, setting empty array")
        setQueueEntries([])
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Error fetching patient queue:", error)
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const filterEntries = () => {
    let filtered = [...queueEntries]

    // Only show confirmed appointments with waiting queue status
    filtered = filtered.filter(entry => 
      entry.status === "confirmed" && entry.queueStatus === "waiting"
    )

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.appointmentKey.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredEntries(filtered)
  }

  const updateQueueStatus = async (appointmentKey: string, queueStatus: string) => {
    try {
      setUpdatingKey(appointmentKey)
      
      const response = await fetch('/api/patient-queue', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentKey,
          queueStatus
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: "success", text: data.message })
        fetchPatientQueue()
      } else {
        setMessage({ type: "error", text: "Failed to update queue status" })
      }
    } catch (error) {
      console.error('Error updating queue status:', error)
      setMessage({ type: "error", text: "Error updating queue status" })
    } finally {
      setUpdatingKey(null)
    }
  }

  const runDiagnostic = async () => {
    try {
      const response = await fetch('/api/diagnostic')
      if (response.ok) {
        const data = await response.json()
        setDebugInfo(data)
        setShowDebug(true)
        console.log("=== DIAGNOSTIC RESULTS ===", data)
      }
    } catch (error) {
      console.error('Error running diagnostic:', error)
    }
  }

  const getQueueStatusIcon = (queueStatus: string) => {
    switch (queueStatus) {
      case "in-session":
        return <UserCheck className="w-5 h-5 text-sky-500" />
      case "completed":
        return <UserCheck className="w-5 h-5 text-emerald-500" />
      case "cancelled":
        return <AlertCircle className="w-5 h-5 text-rose-500" />
      default:
        return <Clock className="w-5 h-5 text-amber-500" />
    }
  }

  const getQueueStatusColor = (queueStatus: string) => {
    switch (queueStatus) {
      case "in-session":
        return "bg-sky-50 text-sky-700 border-sky-200"
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200"
      default:
        return "bg-amber-50 text-amber-700 border-amber-200"
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

  const formatTime = (timeString: string) => {
    try {
      if (!timeString) return "Invalid Time"
      
      // If already contains AM/PM, return as is
      if (timeString.match(/[AP]M/i)) {
        return timeString
      }
      
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

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "Invalid Date"
      
      const dateObj = new Date(dateString)
      if (isNaN(dateObj.getTime())) {
        return "Invalid Date"
      }
      
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch (error) {
      console.error("Error formatting date:", error, dateString)
      return "Invalid Date"
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
          <h1 className="text-3xl font-bold text-slate-800">Patient Queue</h1>
          <p className="text-slate-600 mt-1">Live queue showing patients waiting for consultation</p>
          <p className="text-sm text-slate-500 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refreshing every 5 seconds
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-600">Live</span>
          </div>
          <Button
            onClick={() => fetchPatientQueue()}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh Now"}
          </Button>
          <Button
            onClick={runDiagnostic}
            variant="outline"
            size="sm"
            className="border-sky-200 text-sky-600 hover:bg-sky-50"
          >
            Debug System
          </Button>
        </div>
      </div>

      {hasError && (
        <Alert className="border-rose-200 bg-rose-50">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-rose-400 mr-3" />
            <div>
              <AlertDescription className="text-rose-700 font-medium">
                Invalid doctor information detected. Unable to load patient queue.
              </AlertDescription>
              <p className="text-rose-600 text-sm mt-1">
                This usually happens when you are not properly logged in or your session has expired.
              </p>
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
              </div>
            </div>
          </div>
        </Alert>
      )}

      {!hasError && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search patients, doctors, or appointment key..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {message && (
            <Alert className={message.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}>
              <AlertDescription className={message.type === "success" ? "text-emerald-700" : "text-rose-700"}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
          
          {showDebug && debugInfo && (
            <Card className="border-sky-200 bg-sky-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-sky-800">System Diagnostic Results</h3>
                  <Button
                    onClick={() => setShowDebug(false)}
                    variant="ghost"
                    size="sm"
                    className="text-sky-600 hover:text-sky-800"
                  >
                    ✕ Close
                  </Button>
                </div>
                
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium text-sky-700">Receptionist Info:</h4>
                    <p>Email: {debugInfo.receptionist?.email}</p>
                    <p>Linked Doctor IDs: {JSON.stringify(debugInfo.receptionist?.linked_doctor_ids || debugInfo.receptionist?.linkedDoctorIds)}</p>
                    <p>Has Linked Doctors: {debugInfo.receptionist?.hasLinkedDoctors ? "Yes" : "No"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sky-700">Available Doctors ({debugInfo.doctors?.length || 0}):</h4>
                    {debugInfo.doctors?.slice(0, 3).map((doctor: any) => (
                      <p key={doctor.id}>• {doctor.name} (ID: {doctor.id})</p>
                    ))}
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sky-700">Patient Queue Analysis:</h4>
                    <p>Total Entries: {debugInfo.queueDoctorAnalysis?.totalEntries}</p>
                    <p>Unique Doctor IDs: {debugInfo.queueDoctorAnalysis?.uniqueDoctorIds?.length}</p>
                    <p>Doctor ID Formats: {JSON.stringify(debugInfo.queueDoctorAnalysis?.doctorIdFormats)}</p>
                    <p>Matching Doctors: {debugInfo.queueDoctorAnalysis?.matchingDoctors?.length}</p>
                  </div>
                  
                  {debugInfo.queueDoctorAnalysis?.matchingDoctors?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sky-700">Doctor Matches Found:</h4>
                      {debugInfo.queueDoctorAnalysis.matchingDoctors.map((match: any, index: number) => (
                        <p key={index}>• Queue ID: {match.queueDoctorId} → Doctor: {match.doctorName}</p>
                      ))}
                    </div>
                  )}
                  
                  {debugInfo.patientQueueSample?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sky-700">Sample Queue Entries:</h4>
                      {debugInfo.patientQueueSample.slice(0, 3).map((entry: any) => (
                        <p key={entry.id}>• {entry.patientName} → Dr. {entry.doctorName} (ID: {entry.doctorId})</p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No patients waiting</h3>
                  <p className="text-gray-600">
                    {queueEntries.filter(entry => entry.status === "confirmed" && entry.queueStatus === "waiting").length === 0 
                      ? "There are no confirmed patients waiting in the queue."
                      : "No patients match your search criteria."
                    }
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Only showing confirmed appointments with waiting status.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredEntries.map((entry) => (
                <Card key={entry._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="w-5 h-5 text-gray-500" />
                          <h3 className="text-lg font-medium text-gray-900">{entry.patientName}</h3>
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>Waiting</span>
                            </div>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <User className="w-4 h-4" />
                              <span><strong>Doctor:</strong> {entry.doctorName}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Hash className="w-4 h-4" />
                              <span><strong>Appointment Key:</strong> {entry.appointmentKey}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span><strong>Session Time:</strong> {formatTime(entry.sessionStartTime)}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span><strong>Created:</strong> {formatDate(entry.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <Button
                          onClick={() => updateQueueStatus(entry.appointmentKey, "in-session")}
                          disabled={updatingKey === entry.appointmentKey}
                          className="bg-sky-500 hover:bg-sky-600 text-white"
                          size="sm"
                        >
                          {updatingKey === entry.appointmentKey ? "Starting..." : "Start Session"}
                        </Button>
                        <Button
                          onClick={() => updateQueueStatus(entry.appointmentKey, "completed")}
                          disabled={updatingKey === entry.appointmentKey}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          size="sm"
                        >
                          {updatingKey === entry.appointmentKey ? "Completing..." : "Check Out"}
                        </Button>
                        <Button
                          onClick={() => updateQueueStatus(entry.appointmentKey, "cancelled")}
                          disabled={updatingKey === entry.appointmentKey}
                          variant="outline"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}