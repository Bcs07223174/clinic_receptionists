"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Calendar, CalendarDays, Clock, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

interface Schedule {
  _id: string
  date: string
  availableSlots: string[]
  doctorId: string
}

export default function SchedulesTab() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newSlot, setNewSlot] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedDoctorId, setSelectedDoctorId] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const doctorsData = localStorage.getItem("doctors")
    if (doctorsData && doctorsData !== "undefined" && doctorsData.trim() !== "") {
      try {
        const parsedDoctors = JSON.parse(doctorsData)
        setDoctors(parsedDoctors)
        const doctorIds = parsedDoctors.map((doc: any) => doc.id)
        fetchSchedules(doctorIds)
        if (parsedDoctors.length > 0) {
          setSelectedDoctorId(parsedDoctors[0].id)
        }
      } catch {
        setDoctors([])
      }
    } else {
      setDoctors([])
    }
  }, [])

  const fetchSchedules = async (doctorIds: string[]) => {
    try {
      setIsLoading(true)
      const queryParams = doctorIds.map(id => `doctorId=${id}`).join('&')
      const response = await fetch(`/api/schedules?${queryParams}`)
      const data = await response.json()
      setSchedules(data.schedules || [])
    } catch (error) {
      console.error("Error fetching schedules:", error)
      setMessage({ type: "error", text: "Failed to fetch schedules" })
    } finally {
      setIsLoading(false)
    }
  }

  const addTimeSlot = async () => {
    if (!newSlot || !selectedDate || !selectedDoctorId) {
      setMessage({ type: "error", text: "Please select a doctor, date and enter a time slot" })
      return
    }

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          date: selectedDate,
          timeSlot: newSlot,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Update local state
        setSchedules((prev) => {
          const existingIndex = prev.findIndex((s) => s.date === selectedDate)
          if (existingIndex >= 0) {
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              availableSlots: [...(updated[existingIndex].availableSlots || []), newSlot].sort(),
            }
            return updated
          } else {
            return [
              ...prev,
              {
                _id: data.scheduleId || Date.now().toString(),
                date: selectedDate,
                availableSlots: [newSlot],
                doctorId: selectedDoctorId,
              },
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          }
        })

        setNewSlot("")
        setMessage({ type: "success", text: "Time slot added successfully" })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const data = await response.json()
        setMessage({ type: "error", text: data.error || "Failed to add time slot" })
      }
    } catch (error) {
      console.error("Error adding time slot:", error)
      setMessage({ type: "error", text: "Network error. Please try again." })
    }
  }

  const removeTimeSlot = async (date: string, timeSlot: string) => {
    try {
      const response = await fetch("/api/schedules", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          date,
          timeSlot,
        }),
      })

      if (response.ok) {
        // Update local state
        setSchedules((prev) =>
          prev
            .map((schedule) => {
              if (schedule.date === date) {
                const updatedSlots = (schedule.availableSlots || []).filter((slot) => slot !== timeSlot)
                return { ...schedule, availableSlots: updatedSlots }
              }
              return schedule
            })
            .filter((schedule) => (schedule.availableSlots || []).length > 0),
        )

        setMessage({ type: "success", text: "Time slot removed successfully" })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const data = await response.json()
        setMessage({ type: "error", text: data.error || "Failed to remove time slot" })
      }
    } catch (error) {
      console.error("Error removing time slot:", error)
      setMessage({ type: "error", text: "Network error. Please try again." })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0]
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Schedule Management</h1>
          <p className="text-gray-600 mt-1">Manage available time slots for appointments</p>
        </div>
      </div>

      {message && (
        <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription className={message.type === "success" ? "text-green-700" : "text-red-700"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Add New Time Slot */}
      <Card className="bg-white border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add New Time Slot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getTodayDate()}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Slot</label>
              <Input
                type="time"
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                placeholder="e.g., 09:00 AM"
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addTimeSlot} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Slot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Schedules */}
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules found</h3>
              <p className="text-gray-600">Start by adding time slots for upcoming dates.</p>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule._id} className="bg-white border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{formatDate(schedule.date)}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {(schedule.availableSlots || []).length} available slot{(schedule.availableSlots || []).length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {(schedule.availableSlots || []).length} slots
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(schedule.availableSlots || []).map((slot, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">{slot}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeSlot(schedule.date, slot)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
