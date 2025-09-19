import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const db = await getDatabase()
    
    console.log("=== COMPREHENSIVE DATABASE DIAGNOSTIC ===")
    
    // Check receptionist data
    const receptionist = await db.collection("receptionists").findOne({
      email: "adminareceptionist@medicare.com"
    })
    
    // Check available doctors
    const doctors = await db.collection("doctors").find({}).toArray()
    
    // Check appointments
    const appointments = await db.collection("appointments").find({}).limit(5).toArray()
    
    // Check patient queue entries
    const patientQueue = await db.collection("PaitentQueue").find({}).limit(10).toArray()
    
    // Check if the linked doctor ID exists
    let linkedDoctorExists = false
    let linkedDoctor = null
    
    if (receptionist && receptionist.linked_doctor_ids && receptionist.linked_doctor_ids.length > 0) {
      const linkedDoctorId = receptionist.linked_doctor_ids[0]
      
      try {
        linkedDoctor = await db.collection("doctors").findOne({
          _id: new ObjectId(linkedDoctorId)
        })
        linkedDoctorExists = !!linkedDoctor
      } catch (error) {
        console.log("Error checking linked doctor:", error)
      }
    }
    
    // Analyze patient queue doctor IDs
    const queueDoctorAnalysis = {
      totalEntries: await db.collection("PaitentQueue").countDocuments(),
      uniqueDoctorIds: [] as any[],
      doctorIdFormats: {} as Record<string, number>,
      matchingDoctors: [] as any[]
    }
    
    const uniqueDoctorIds = new Set<any>()
    patientQueue.forEach(entry => {
      const doctorId = entry.doctorId
      uniqueDoctorIds.add(doctorId)
      
      const format = typeof doctorId
      if (!queueDoctorAnalysis.doctorIdFormats[format]) {
        queueDoctorAnalysis.doctorIdFormats[format] = 0
      }
      queueDoctorAnalysis.doctorIdFormats[format]++
    })
    
    queueDoctorAnalysis.uniqueDoctorIds = Array.from(uniqueDoctorIds)
    
    // Find matching doctors for queue entries
    queueDoctorAnalysis.uniqueDoctorIds.forEach((queueDoctorId: any) => {
      const matchingDoctor = doctors.find(doctor => {
        const doctorIdStr = doctor._id.toString()
        if (ObjectId.isValid(queueDoctorId)) {
          return doctorIdStr === queueDoctorId.toString()
        }
        return doctorIdStr === queueDoctorId
      })
      
      if (matchingDoctor) {
        queueDoctorAnalysis.matchingDoctors.push({
          queueDoctorId,
          doctorName: matchingDoctor.name,
          doctorId: matchingDoctor._id.toString()
        })
      }
    })
    
    // Check localStorage compatibility fields
    const receptionistFields = receptionist ? Object.keys(receptionist) : []
    const hasNewFormat = receptionistFields.includes('linkedDoctorIds')
    const hasOldFormat = receptionistFields.includes('linked_doctor_ids')
    
    return NextResponse.json({
      receptionist: {
        email: receptionist?.email,
        linked_doctor_ids: receptionist?.linked_doctor_ids,
        linkedDoctorIds: receptionist?.linkedDoctorIds,
        hasLinkedDoctors: !!(receptionist?.linked_doctor_ids?.length || receptionist?.linkedDoctorIds?.length),
        availableFields: receptionistFields,
        formatCompatibility: {
          hasNewFormat,
          hasOldFormat,
          recommended: hasNewFormat ? 'linkedDoctorIds' : 'linked_doctor_ids'
        }
      },
      doctors: doctors.map(doc => ({
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email
      })),
      linkedDoctor: linkedDoctor ? {
        id: linkedDoctor._id.toString(),
        name: linkedDoctor.name,
        email: linkedDoctor.email
      } : null,
      linkedDoctorExists,
      appointmentSample: appointments.map(apt => ({
        id: apt._id.toString(),
        patientName: apt.patientName,
        doctorId: apt.doctorId,
        doctorIdType: typeof apt.doctorId
      })),
      patientQueueSample: patientQueue.map(entry => ({
        id: entry._id.toString(),
        appointmentKey: entry.appointmentKey,
        patientName: entry.patientName,
        doctorName: entry.doctorName,
        doctorId: entry.doctorId,
        doctorIdType: typeof entry.doctorId,
        queueStatus: entry.queueStatus,
        status: entry.status
      })),
      queueDoctorAnalysis,
      totalAppointments: await db.collection("appointments").countDocuments(),
      recommendations: {
        issues: [],
        solutions: []
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error("Diagnostic error:", error)
    return NextResponse.json({ error: "Diagnostic failed", details: error?.message || "Unknown error" }, { status: 500 })
  }
}