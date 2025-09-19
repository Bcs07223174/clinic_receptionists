import { getDatabase } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function GET() {
  return fixAppointmentsLink()
}

export async function POST() {
  return fixAppointmentsLink()
}

async function fixAppointmentsLink() {
  try {
    const db = await getDatabase()
    
    console.log("=== FIXING DOCTOR LINKAGE TO DOCTOR WITH APPOINTMENTS ===")
    
    // Find the doctor who has the most appointments
    const appointmentCounts = await db.collection("appointments").aggregate([
      { $match: { doctorId: { $exists: true, $ne: null } } },
      { $group: { _id: "$doctorId", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()
    
    console.log("Appointment counts by doctor:", appointmentCounts)
    
    if (appointmentCounts.length === 0) {
      return NextResponse.json({ error: "No appointments with doctor IDs found" }, { status: 404 })
    }
    
    // Get the doctor ID with the most appointments
    const topDoctorId = appointmentCounts[0]._id
    console.log("Doctor with most appointments:", topDoctorId, "Count:", appointmentCounts[0].count)
    
    // Get doctor details
    const doctor = await db.collection("doctors").findOne({ _id: topDoctorId })
    
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }
    
    console.log("Doctor details:", doctor.name, doctor.email)
    
    // Update the receptionist to link to this doctor
    const updateResult = await db.collection("receptionists").updateOne(
      { email: "adminareceptionist@medicare.com" },
      { $set: { linked_doctor_ids: [topDoctorId.toString()] } }
    )
    
    console.log("Update result:", updateResult)
    
    if (updateResult.modifiedCount > 0) {
      // Get appointments for this doctor
      const appointments = await db.collection("appointments").find({
        doctorId: topDoctorId
      }).toArray()
      
      return NextResponse.json({
        success: true,
        message: "Receptionist linked to doctor with appointments",
        linkedDoctor: {
          id: topDoctorId.toString(),
          name: doctor.name,
          email: doctor.email,
          specialization: doctor.specialization
        },
        appointmentCount: appointments.length,
        appointments: appointments.map(apt => ({
          id: apt._id.toString(),
          patientName: apt.patientName,
          appointmentDate: apt.appointmentDate,
          status: apt.status
        }))
      })
    } else {
      return NextResponse.json({ error: "Failed to update receptionist" }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error("Fix appointments linkage error:", error)
    return NextResponse.json({ error: "Fix failed", details: error?.message || "Unknown error" }, { status: 500 })
  }
}