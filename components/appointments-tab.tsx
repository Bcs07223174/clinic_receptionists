"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebSocket } from "@/hooks/use-websocket";
import { Calendar, CheckCircle, Clock, Filter, Mail, MapPin, Phone, Search, SortAsc, User, Users, Wifi, WifiOff, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface Doctor { _id: string; name: string; }
interface Appointment {
  _id: string;
  appointmentKey: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  address?: string;
  date: string;
  time: string;
  sessionStartTime?: string;
  status: string;
  reason?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentsTabProps {
  doctorId: string;
  onSelectDoctor: (id: string) => void;
}

export default function AppointmentsTab({ doctorId, onSelectDoctor }: AppointmentsTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  // Load filter preferences from localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem('appointmentsFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setSearchTerm(filters.searchTerm || "");
        setStatusFilter(filters.statusFilter || "all");
        setSortBy(filters.sortBy || "date");
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    }
  }, []);

  // Save filter preferences to localStorage
  const saveFiltersToStorage = (search: string, status: string, sort: string) => {
    try {
      const filters = {
        searchTerm: search,
        statusFilter: status,
        sortBy: sort,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('appointmentsFilters', JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  };

  // Enhanced setters that save to localStorage
  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
    saveFiltersToStorage(value, statusFilter, sortBy);
  };

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    saveFiltersToStorage(searchTerm, value, sortBy);
  };

  const updateSortBy = (value: string) => {
    setSortBy(value);
    saveFiltersToStorage(searchTerm, statusFilter, value);
  };

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy("date");
    try {
      localStorage.removeItem('appointmentsFilters');
    } catch (error) {
      console.error('Error clearing filters:', error);
    }
  };

  // Load doctors from localStorage first, then API as fallback
  const loadDoctors = async () => {
    let loadedDoctors: Doctor[] = [];
    
    // Try to get from receptionist's linked doctors first
    const receptionistData = localStorage.getItem("receptionist");
    if (receptionistData && receptionistData !== "undefined") {
      try {
        const receptionist = JSON.parse(receptionistData);
        const linkedDoctorIds = receptionist.linkedDoctorIds || receptionist.linked_doctor_ids || [];
        
        // Get doctor names from localStorage if available
        const doctorsData = localStorage.getItem("doctors");
        if (doctorsData && doctorsData !== "undefined") {
          const allDoctors = JSON.parse(doctorsData);
          loadedDoctors = allDoctors.filter((doc: any) => 
            linkedDoctorIds.some((id: any) => 
              (typeof id === 'string' ? id : id.toString()) === doc._id
            )
          );
        }
        
        // If no doctor names found, create basic doctor objects
        if (loadedDoctors.length === 0) {
          loadedDoctors = linkedDoctorIds.map((id: any, index: number) => ({
            _id: typeof id === 'string' ? id : id.toString(),
            name: `Doctor ${index + 1} (${(typeof id === 'string' ? id : id.toString()).slice(-6)})`
          }));
        }
      } catch (e) {
        console.error("Error parsing receptionist data:", e);
      }
    }
    
    // Fallback to API if no doctors found
    if (loadedDoctors.length === 0) {
      try {
        const res = await fetch("/api/doctors");
        const data = await res.json();
        if (res.ok && data.doctors) {
          loadedDoctors = data.doctors;
        }
      } catch (error) {
        console.error("Failed to fetch doctors:", error);
      }
    }
    
    setDoctors(loadedDoctors);
    
    // Auto-select first doctor if none selected
    if (loadedDoctors.length > 0 && !doctorId) {
      onSelectDoctor("all");
    }
  };  // Fetch appointments
  const fetchAppointments = async (isBackground = false) => {
    if (!doctorId) return;
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      let allAppointments: Appointment[] = [];

      if (doctorId === "all") {
        // Fetch appointments for all linked doctors
        const promises = doctors.map(async (doctor) => {
          try {
            const res = await fetch(`/api/appointments?doctorId=${doctor._id}`);
            const data = await res.json();
            return res.ok && data.appointments ? data.appointments : [];
          } catch (error) {
            console.error(`Failed to fetch appointments for doctor ${doctor._id}:`, error);
            return [];
          }
        });

        const results = await Promise.all(promises);
        allAppointments = results.flat();
      } else {
        // Fetch appointments for specific doctor
        const res = await fetch(`/api/appointments?doctorId=${doctorId}`);
        const data = await res.json();
        
        if (res.ok && data.appointments) {
          allAppointments = data.appointments;
        } else {
          showMessage("error", data.error || "Failed to fetch appointments");
          return;
        }
      }

      setAppointments(allAppointments);
    } catch (err) {
      console.error(err);
      showMessage("error", "Error fetching appointments");
    } finally {
      if (!isBackground) setLoading(false);
      else setRefreshing(false);
    }
  };

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: string, status: "confirmed" | "rejected") => {
    try {
      setUpdatingId(appointmentId);
      const response = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, status }),
      });
      const data = await response.json();

      if (response.ok) {
        showMessage("success", data.message || `Appointment ${status} successfully`);
        // Update local state immediately for better UX
        setAppointments(prev => prev.map(appt => 
          appt._id === appointmentId 
            ? { ...appt, status, updatedAt: new Date().toISOString() }
            : appt
        ));
      } else {
        showMessage("error", data.error || "Failed to update appointment");
      }

      fetchAppointments(true); // refresh in background
    } catch (err) {
      console.error(err);
      showMessage("error", "Error updating appointment");
    } finally {
      setUpdatingId(null);
    }
  };

  // Show message and auto-hide
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
  };

  // WebSocket integration for real-time updates
  const { isConnected, isConnecting } = useWebSocket({
    doctorId: doctorId !== "all" ? doctorId : undefined,
    onAppointmentUpdate: (data: any) => {
      console.log("📨 Real-time appointment update received:", data);
      
      if (data.type === 'appointment_updated') {
        // Update the specific appointment in the list
        setAppointments(prev => prev.map(appt => 
          appt._id === data.appointment._id 
            ? { ...appt, ...data.appointment }
            : appt
        ));
        
        // Show update notification
        showMessage("success", `Appointment updated: ${data.appointment.patientName || 'Unknown'} - ${data.appointment.status}`);
      }
    },
    autoConnect: true
  });

  useEffect(() => { loadDoctors(); }, []);
  
  // Replace polling with initial fetch only - WebSocket handles updates
  useEffect(() => {
    fetchAppointments();
    // Remove polling interval - WebSocket provides real-time updates
  }, [doctorId]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter and sort appointments
  const filteredAndSortedAppointments = appointments
    .filter(appt => {
      const matchesSearch = !searchTerm || 
        appt.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.patientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.patientPhone?.includes(searchTerm);
      
      const matchesStatus = statusFilter === "all" || appt.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime();
        case "status":
          return a.status.localeCompare(b.status);
        case "patient":
          return (a.patientName || "").localeCompare(b.patientName || "");
        default:
          return 0;
      }
    });

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i} className="w-full min-h-[200px] border-l-4 border-l-gray-300">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-3">
              <Skeleton className="h-8 w-full sm:w-24" />
              <Skeleton className="h-8 w-full sm:w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Calendar className="h-8 w-8 text-sky-600" />
              {refreshing && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-sky-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
                {refreshing && (
                  <span className="text-xs text-sky-600 font-medium animate-pulse">Updating...</span>
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
                    <div title="WebSocket Disconnected - Using polling fallback">
                      <WifiOff className="h-4 w-4 text-red-600" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  {filteredAndSortedAppointments.length} of {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
                  {searchTerm || statusFilter !== "all" ? " (filtered)" : ""}
                </p>
                {isConnected && (
                  <span className="text-xs text-green-600 font-medium">🔴 Live Updates</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Doctor Selection */}
          {doctors.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <Select value={doctorId} onValueChange={onSelectDoctor} disabled={loading}>
                <SelectTrigger className="w-48 h-9 text-sm">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">All Doctors</span>
                      <span className="text-xs text-gray-500">View all appointments</span>
                    </div>
                  </SelectItem>
                  {doctors.map(doc => (
                    <SelectItem key={doc._id} value={doc._id} className="text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{doc.name}</span>
                        <span className="text-xs text-gray-500">ID: {doc._id.slice(-6)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-3 p-4 bg-gray-50 rounded-lg border">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patients, doctors, email, or phone..."
              value={searchTerm}
              onChange={(e) => updateSearchTerm(e.target.value)}
              className="pl-10 h-9 bg-white"
            />
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={statusFilter} onValueChange={updateStatusFilter}>
              <SelectTrigger className="w-36 h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Sort */}
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-gray-500" />
            <Select value={sortBy} onValueChange={updateSortBy}>
              <SelectTrigger className="w-32 h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">By Date</SelectItem>
                <SelectItem value="status">By Status</SelectItem>
                <SelectItem value="patient">By Patient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="h-9 text-sm whitespace-nowrap"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription className={message.type === "success" ? "text-green-700" : "text-red-700"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Appointments */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredAndSortedAppointments.length === 0 ? (
        <Card className="w-full">
          <CardContent className="py-16 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {appointments.length === 0 ? (
              <>
                <p className="text-gray-500 text-lg">No appointments found</p>
                <p className="text-gray-400 text-sm mt-1">
                  {doctorId ? "This doctor has no scheduled appointments" : "Select a doctor to view appointments"}
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-lg">No appointments match your filters</p>
                <p className="text-gray-400 text-sm mt-1">
                  Try adjusting your search or filter criteria
                </p>
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="mt-4"
                >
                  Clear All Filters
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedAppointments.map(appt => (
            <Card key={appt._id} className="w-full hover:shadow-lg transition-all duration-300 min-h-[200px] border-l-4 border-l-sky-500 hover:border-l-sky-600 hover:scale-[1.01] group">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-lg leading-tight text-gray-800 truncate">
                      {appt.patientName || "Unknown Patient"}
                    </CardTitle>
                    <p className="text-sm text-gray-600 truncate">
                      with {appt.doctorName || "Unknown Doctor"}
                    </p>
                  </div>
                  <Badge 
                    className={`${getStatusColor(appt.status)} capitalize text-xs px-2 py-1 whitespace-nowrap font-medium flex-shrink-0`}
                    variant="outline"
                  >
                    {appt.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3 pb-4">
                {/* Patient Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 py-1">
                    <User className="h-4 w-4 text-sky-500 flex-shrink-0" />
                    <span className="text-gray-600 truncate">{appt.patientName || "N/A"}</span>
                  </div>
                  {appt.patientEmail && (
                    <div className="flex items-center gap-2 py-1">
                      <Mail className="h-4 w-4 text-sky-500 flex-shrink-0" />
                      <span className="text-gray-600 truncate">{appt.patientEmail}</span>
                    </div>
                  )}
                  {appt.patientPhone && (
                    <div className="flex items-center gap-2 py-1">
                      <Phone className="h-4 w-4 text-sky-500 flex-shrink-0" />
                      <span className="text-gray-600">{appt.patientPhone}</span>
                    </div>
                  )}
                  {appt.address && (
                    <div className="flex items-center gap-2 py-1">
                      <MapPin className="h-4 w-4 text-sky-500 flex-shrink-0" />
                      <span className="text-gray-600 truncate">{appt.address}</span>
                    </div>
                  )}
                </div>

                {/* Appointment Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm bg-sky-50 rounded-md p-2.5 border border-sky-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-sky-600 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">
                      {new Date(appt.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-sky-600 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{appt.time}</span>
                  </div>
                </div>

                {/* Rejection Reason */}
                {appt.status === "rejected" && appt.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-2.5">
                    <p className="text-red-800 text-sm">
                      <span className="font-medium">Rejection reason:</span> {appt.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {appt.status === "pending" && (
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100 mt-3">
                    <Button
                      onClick={() => updateAppointmentStatus(appt._id, "confirmed")}
                      disabled={updatingId === appt._id}
                      className="w-full sm:w-auto sm:min-w-[110px] h-9 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 text-sm group-hover:scale-105"
                      size="sm"
                    >
                      {updatingId === appt._id ? (
                        <div className="flex items-center">
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>
                          Confirming...
                        </div>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1.5" />
                          Confirm
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => updateAppointmentStatus(appt._id, "rejected")}
                      disabled={updatingId === appt._id}
                      className="w-full sm:w-auto sm:min-w-[110px] h-9 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 text-sm group-hover:scale-105"
                      size="sm"
                    >
                      {updatingId === appt._id ? (
                        <div className="flex items-center">
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>
                          Rejecting...
                        </div>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1.5" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Status Indicators for Confirmed/Rejected */}
                {appt.status !== "pending" && (
                  <div className="pt-3 border-t border-gray-100 mt-3">
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                      appt.status === "confirmed" 
                        ? "bg-green-100 text-green-800 border border-green-200" 
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}>
                      {appt.status === "confirmed" ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {appt.status === "confirmed" ? "Appointment Confirmed" : "Appointment Rejected"}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
