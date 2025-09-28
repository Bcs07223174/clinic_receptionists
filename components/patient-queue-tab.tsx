"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useWebSocket } from "@/hooks/use-websocket"
import { AlertCircle, Clock, Search, Users, Wifi, WifiOff } from "lucide-react"
import { useEffect, useState } from "react"

interface QueueEntry {
  _id: string
  patientName: string
  doctorName: string
  appointmentKey: string
  createdAt: string
  status: string
  queueStatus: string
  doctorId: string
}

export default function PatientQueueTab() {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<QueueEntry[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasError, setHasError] = useState(false)

  const [doctorIds, setDoctorIds] = useState<string[]>([])
  const [doctors, setDoctors] = useState<{ _id: string; name: string }[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<string>("")

  // Load filter preferences from localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem('patientQueueFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        const savedAt = new Date(filters.savedAt);
        const hoursSinceLastSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
        
        // Only load filters if they're less than 24 hours old
        if (hoursSinceLastSave < 24) {
          setStatusFilter(filters.statusFilter || "all");
          setSearchTerm(filters.searchTerm || "");
          
          // Load doctor selection with validation
          const savedDoctor = filters.selectedDoctor || "all";
          setSelectedDoctor(savedDoctor);
          
          console.log('✅ Loaded saved queue filters from', savedAt.toLocaleString());
          console.log('📋 Restored filters:', {
            status: filters.statusFilter || "all",
            search: filters.searchTerm || "(empty)",
            doctor: savedDoctor === "all" ? "All Doctors" : `Doctor ID: ${savedDoctor}`
          });
        } else {
          // Clear old filters
          localStorage.removeItem('patientQueueFilters');
          console.log('🕒 Cleared outdated queue filters');
        }
      } catch (error) {
        console.error('Error loading saved queue filters:', error);
        localStorage.removeItem('patientQueueFilters');
      }
    }
  }, []);

  // Save filter preferences to localStorage
  const saveFiltersToStorage = (status: string, search: string, doctor: string) => {
    try {
      const filters = {
        statusFilter: status,
        searchTerm: search,
        selectedDoctor: doctor,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('patientQueueFilters', JSON.stringify(filters));
      console.log('💾 Queue filters saved to localStorage');
    } catch (error) {
      console.error('Error saving queue filters:', error);
    }
  };

  // Enhanced setters that save to localStorage
  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    saveFiltersToStorage(value, searchTerm, selectedDoctor);
  };

  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
    saveFiltersToStorage(statusFilter, value, selectedDoctor);
  };

  const updateSelectedDoctor = (value: string) => {
    console.log('👨‍⚕️ Doctor selection changed to:', value);
    setSelectedDoctor(value);
    saveFiltersToStorage(statusFilter, searchTerm, value);
    
    // Additional feedback for doctor selection
    if (value === "all") {
      console.log('📊 Viewing all doctors in queue');
    } else {
      const doctorName = doctors.find(d => d._id === value)?.name || 'Unknown Doctor';
      console.log(`👩‍⚕️ Viewing queue for: ${doctorName} (ID: ${value})`);
    }
  };

  // Clear all filters function
  const clearAllFilters = () => {
    setStatusFilter("all");
    setSearchTerm("");
    setSelectedDoctor("all");
    try {
      localStorage.removeItem('patientQueueFilters');
    } catch (error) {
      console.error('Error clearing queue filters:', error);
    }
  };

  // ✅ Load doctors from localStorage and API
  const loadDoctors = async () => {
    let loadedDoctors: { _id: string; name: string }[] = []
    let doctorIds: string[] = []
    
    // Try to get from receptionist data first (most reliable)
    const receptionistData = localStorage.getItem("receptionist")
    if (receptionistData && receptionistData !== "undefined") {
      try {
        const receptionist = JSON.parse(receptionistData)
        const linkedDoctorIds = receptionist.linkedDoctorIds || receptionist.linked_doctor_ids || []
        if (linkedDoctorIds.length > 0) {
          doctorIds = linkedDoctorIds.map((id: any) => typeof id === 'string' ? id : id.toString())
        }
      } catch (e) {
        console.error("Error parsing receptionist data:", e)
      }
    }

    // Get doctor names from localStorage or API
    const doctorsData = localStorage.getItem("doctors")
    if (doctorsData && doctorsData !== "undefined") {
      try {
        const allDoctors = JSON.parse(doctorsData)
        if (Array.isArray(allDoctors) && allDoctors.length > 0) {
          // Filter doctors by linked IDs if available
          if (doctorIds.length > 0) {
            loadedDoctors = allDoctors.filter((doc: any) => 
              doctorIds.includes(doc._id)
            )
          } else {
            loadedDoctors = allDoctors
            doctorIds = allDoctors.map((doc: any) => doc._id)
          }
        }
      } catch (e) {
        console.error("Error parsing doctors data:", e)
      }
    }

    // Fallback to API if no doctors found
    if (loadedDoctors.length === 0) {
      try {
        const res = await fetch("/api/doctors")
        const data = await res.json()
        if (res.ok && data.doctors) {
          loadedDoctors = data.doctors
          doctorIds = data.doctors.map((doc: any) => doc._id)
        }
      } catch (error) {
        console.error("Failed to fetch doctors:", error)
      }
    }

    // If still no names, create basic objects from IDs
    if (loadedDoctors.length === 0 && doctorIds.length > 0) {
      loadedDoctors = doctorIds.map((id, index) => ({
        _id: id,
        name: `Doctor ${index + 1} (${id.slice(-6)})`
      }))
    }

    console.log("Patient Queue - Doctors loaded:", loadedDoctors)
    setDoctors(loadedDoctors)
    setDoctorIds(doctorIds)
    
    if (loadedDoctors.length > 0) {
      setSelectedDoctor("all") // default to all doctors
    }
  }

  // ✅ Load doctors on component mount
  useEffect(() => {
    loadDoctors()
  }, [])

  // ✅ Fetch queue for selected doctor
  const fetchPatientQueue = async (isBackgroundRefresh = false) => {
    if (!selectedDoctor) {
      console.log("Patient Queue - No doctor selected")
      return
    }

    try {
      if (!isBackgroundRefresh) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setHasError(false)

      let allQueueEntries: QueueEntry[] = []

      if (selectedDoctor === "all") {
        // Fetch queue for all linked doctors
        console.log("Patient Queue - Fetching for all doctors")
        const promises = doctors.map(async (doctor) => {
          try {
            const response = await fetch(`/api/patient-queue?doctorId=${doctor._id}`)
            if (response.ok) {
              const data = await response.json()
              return data?.patientQueue || []
            }
            return []
          } catch (error) {
            console.error(`Failed to fetch queue for doctor ${doctor._id}:`, error)
            return []
          }
        })

        const results = await Promise.all(promises)
        allQueueEntries = results.flat()
      } else {
        // Fetch queue for specific doctor
        console.log("Patient Queue - Fetching for doctor:", selectedDoctor)
        const response = await fetch(`/api/patient-queue?doctorId=${selectedDoctor}`)

        console.log("Patient Queue - Response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Patient Queue - API error:", response.status, errorText)
          throw new Error(`API failed: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log("Patient Queue - Data received:", data)

        allQueueEntries = data?.patientQueue || []
      }

      setQueueEntries(allQueueEntries)
      console.log("Patient Queue - Entries set:", allQueueEntries.length)
    } catch (error) {
      console.error("❌ Failed to fetch patient queue:", error)
      if (!isBackgroundRefresh) {
        setHasError(true)
      }
    } finally {
      if (!isBackgroundRefresh) {
        setIsLoading(false)
      } else {
        setIsRefreshing(false)
      }
    }
  }

  // WebSocket integration for real-time queue updates
  const { isConnected, isConnecting } = useWebSocket({
    doctorId: selectedDoctor !== "all" ? selectedDoctor : undefined,
    onQueueUpdate: (data: any) => {
      console.log("📨 Real-time queue update received:", data);
      
      if (data.type === 'queue_updated') {
        // Refresh queue data when updates are received
        fetchPatientQueue(true);
      }
    },
    autoConnect: true
  });

  // ✅ Initial load only - WebSocket handles real-time updates
  useEffect(() => {
    if (!selectedDoctor) return
    fetchPatientQueue(false) // Initial load
    // Remove polling interval - WebSocket provides real-time updates
  }, [selectedDoctor])

  // ✅ Filtering logic - Show only waiting patients and sort by time
  useEffect(() => {
    let filtered = [...queueEntries]

    // Filter to show only "waiting" queue status patients
    filtered = filtered.filter((entry) => 
      entry.queueStatus && entry.queueStatus.toLowerCase() === "waiting"
    )

    // Apply additional status filter if selected
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((entry) => entry.status === statusFilter)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (entry) =>
          entry.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.appointmentKey.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sort by creation time (oldest first - FIFO queue)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateA - dateB // Oldest first
    })

    setFilteredEntries(filtered)
  }, [statusFilter, searchTerm, queueEntries])

  const formatDate = (dateString: string) => {
    try {
      const dateObj = new Date(dateString)
      if (isNaN(dateObj.getTime())) return "Invalid Date"
      return dateObj.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    } catch {
      return "Invalid Date"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getQueueStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'waiting': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const LoadingSkeleton = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="w-full h-fit min-h-[240px] border-l-4 border-l-gray-300 relative">
          {/* Skeleton Position Badge */}
          <div className="absolute -top-2 -left-2 w-7 h-7 bg-gray-300 rounded-full"></div>
          <CardHeader className="pb-3 pt-4">
            <div className="flex justify-between items-start gap-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between items-center py-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="flex justify-between items-center py-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="border-t pt-3">
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Clock className="h-8 w-8 text-blue-600" />
            {isRefreshing && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-800">Waiting Queue</h1>
              {isRefreshing && (
                <span className="text-xs text-blue-600 font-medium">Updating...</span>
              )}
              {/* WebSocket Status Indicator */}
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <div title="WebSocket Connected - Real-time updates active">
                    <Wifi className="h-4 w-4 text-green-600" />
                  </div>
                ) : isConnecting ? (
                  <div title="Connecting to WebSocket...">
                    <Wifi className="h-4 w-4 text-yellow-600 animate-pulse" />
                  </div>
                ) : (
                  <div title="WebSocket Disconnected">
                    <WifiOff className="h-4 w-4 text-red-600" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                {filteredEntries.length} patient{filteredEntries.length !== 1 ? 's' : ''} waiting • Sorted by arrival time
              </p>
              {isConnected && (
                <span className="text-xs text-green-600 font-medium">🔴 Live Updates</span>
              )}
            </div>
          </div>
        </div>

        {/* Compact Doctor Selector */}
        {doctors.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <Select value={selectedDoctor} onValueChange={updateSelectedDoctor}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">All Doctors</span>
                    <span className="text-xs text-gray-500">View all queues</span>
                  </div>
                </SelectItem>
                {doctors.map((doc) => (
                  <SelectItem key={doc._id} value={doc._id} className="text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{doc.name}</span>
                      <span className="text-xs text-gray-500">ID: {doc._id.slice(-6)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDoctor && selectedDoctor !== "all" && (
              <span className="text-xs text-green-600 font-medium" title="Doctor selection saved to localStorage">💾</span>
            )}
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by patient, doctor, or appointment key..."
            value={searchTerm}
            onChange={(e) => updateSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={updateStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by appointment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {(statusFilter !== "all" || searchTerm || selectedDoctor !== "all") && (
          <button
            onClick={clearAllFilters}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md border border-gray-300 transition-colors flex items-center gap-1 whitespace-nowrap"
            title="Clear all filters and reset to defaults"
          >
            <span className="text-xs">✕</span> Clear
          </button>
        )}
      </div>

      {/* Quick Filter Badges - Only for waiting patients */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={statusFilter === "all" || statusFilter === "" ? "default" : "outline"}
          className="cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => updateStatusFilter("all")}
        >
          All Waiting ({filteredEntries.length})
        </Badge>
        <Badge
          variant={statusFilter === "confirmed" ? "default" : "outline"}
          className="cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => updateStatusFilter("confirmed")}
        >
          Confirmed ({queueEntries.filter(e => e.queueStatus?.toLowerCase() === "waiting" && e.status === "confirmed").length})
        </Badge>
        <Badge
          variant={statusFilter === "pending" ? "default" : "outline"}
          className="cursor-pointer hover:bg-yellow-100 transition-colors"
          onClick={() => updateStatusFilter("pending")}
        >
          Pending ({queueEntries.filter(e => e.queueStatus?.toLowerCase() === "waiting" && e.status === "pending").length})
        </Badge>
      </div>

      {/* Loading */}
      {isLoading && <LoadingSkeleton />}

      {/* Error */}
      {hasError && !isLoading && (
        <Card className="w-full">
          <CardContent className="py-16 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-600 font-medium text-lg">Failed to load patient queue</p>
            <p className="text-red-400 text-sm mt-1">Please check your connection and try again.</p>
          </CardContent>
        </Card>
      )}

      {/* No data */}
      {!isLoading && !hasError && filteredEntries.length === 0 && (
        <Card className="w-full">
          <CardContent className="py-16 text-center">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 font-medium text-lg">No patients waiting</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters" 
                : "No patients in waiting queue for the selected doctor"
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Queue List */}
      {!isLoading && !hasError && filteredEntries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((entry, index) => (
            <Card key={entry._id} className="shadow-sm hover:shadow-md transition-all duration-200 relative h-fit min-h-[240px] border-l-4 border-l-blue-500">
              {/* Queue Position Badge */}
              <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center z-10 shadow-md">
                #{index + 1}
              </div>
              <CardHeader className="pb-3 pt-4">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg font-semibold leading-tight text-gray-800 truncate">
                    {entry.patientName}
                  </CardTitle>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Badge 
                      className={`${getStatusColor(entry.status)} text-xs px-2 py-1 whitespace-nowrap font-medium`}
                      variant="outline"
                    >
                      {entry.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pb-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="font-medium text-gray-700">Doctor:</span>
                    <span className="text-gray-600 truncate ml-2 max-w-[140px]" title={entry.doctorName}>
                      {entry.doctorName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="font-medium text-gray-700">Appointment:</span>
                    <span className="text-gray-600 font-mono text-xs bg-gray-50 px-2 py-1 rounded border">
                      {entry.appointmentKey}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 bg-blue-50 -mx-2 px-2 rounded">
                    <span className="font-medium text-blue-700">Position:</span>
                    <span className="text-blue-700 font-bold text-sm">#{index + 1} in queue</span>
                  </div>
                  <div className="flex justify-between items-start gap-2 py-1 border-t pt-3">
                    <span className="font-medium text-gray-700 flex-shrink-0">Waiting since:</span>
                    <span className="text-gray-600 text-xs text-right leading-relaxed">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
