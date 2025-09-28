"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, Mail, MapPin, Phone, Stethoscope, User, UserCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface Receptionist {
  _id: string
  email: string
  name?: string
  phone?: string
  joined_date?: string
  linked_doctor_ids: string[]
}

interface Doctor {
  _id: string
  name: string
  specialization?: string
  email?: string
  phone?: string
  experience?: string
  qualification?: string
  department?: string
}

export default function ProfileTab() {
  const [receptionist, setReceptionist] = useState<Receptionist | null>(null)
  const [linkedDoctors, setLinkedDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setIsLoading(true)
      
      // Get receptionist email from localStorage
      const receptionistData = localStorage.getItem("receptionist")
      if (!receptionistData) {
        setError("No receptionist data found")
        return
      }

      const parsedReceptionist = JSON.parse(receptionistData)
      
      // Fetch full profile data from API
      const response = await fetch(`/api/profile?email=${encodeURIComponent(parsedReceptionist.email)}`)
      if (!response.ok) {
        throw new Error("Failed to fetch profile data")
      }
      
      const data = await response.json()
      setReceptionist(data.receptionist)
      setLinkedDoctors(data.linkedDoctors || [])
      
    } catch (error) {
      console.error("Error fetching profile data:", error)
      setError("Failed to load profile data")
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="lg:col-span-2 space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Profile</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">View your profile and linked doctor information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Receptionist Profile Card */}
        <Card className="bg-white border-0 shadow-md">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                <AvatarImage src="" alt={receptionist?.name || receptionist?.email || ""} />
                <AvatarFallback className="text-lg sm:text-xl bg-blue-100 text-blue-600">
                  {receptionist?.name ? getInitials(receptionist.name) : receptionist?.email?.[0]?.toUpperCase() || "R"}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-lg sm:text-xl">
              {receptionist?.name || "Receptionist"}
            </CardTitle>
            <Badge className="bg-green-100 text-green-800 border-green-200 w-fit mx-auto text-xs px-2 py-1">
              Receptionist
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-3 text-xs sm:text-sm">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 truncate">{receptionist?.email}</span>
            </div>
            {receptionist?.phone && (
              <div className="flex items-center space-x-3 text-xs sm:text-sm">
                <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">{receptionist.phone}</span>
              </div>
            )}
            {receptionist?.joined_date && (
              <div className="flex items-center space-x-3 text-xs sm:text-sm">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">Joined {formatDate(receptionist.joined_date)}</span>
              </div>
            )}
            <Separator />
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Managing</p>
              <p className="text-base sm:text-lg font-semibold text-blue-600">
                {linkedDoctors.length} Doctor{linkedDoctors.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Linked Doctors */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2">
            <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Linked Doctors</h2>
          </div>

          {linkedDoctors.length === 0 ? (
            <Card className="bg-white border-0 shadow-md">
              <CardContent className="p-8 sm:p-12 text-center">
                <Stethoscope className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Linked Doctors</h3>
                <p className="text-sm sm:text-base text-gray-600">No doctors are currently linked to your profile.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {linkedDoctors.map((doctor) => (
                <Card key={doctor._id} className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                      <Avatar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto sm:mx-0 flex-shrink-0">
                        <AvatarImage src="" alt={doctor.name} />
                        <AvatarFallback className="text-sm sm:text-lg bg-blue-100 text-blue-600">
                          {getInitials(doctor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="text-center sm:text-left">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{doctor.name}</h3>
                            {doctor.specialization && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 mt-1 text-xs px-2 py-1">
                                {doctor.specialization}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                          {doctor.email && (
                            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                              <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{doctor.email}</span>
                            </div>
                          )}
                          {doctor.phone && (
                            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                              <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                              <span>{doctor.phone}</span>
                            </div>
                          )}
                          {doctor.qualification && (
                            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                              <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{doctor.qualification}</span>
                            </div>
                          )}
                          {doctor.experience && (
                            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                              <span>{doctor.experience}</span>
                            </div>
                          )}
                          {doctor.department && (
                            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{doctor.department}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}